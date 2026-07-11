import { serializeQuery, type QueryEntry } from './querySerialization'

type JsonObject = Record<string, unknown>

interface RequestInput {
  kind: string
  dataRef?: JsonObject
  action?: JsonObject
  requestMapping?: Record<string, JsonObject>
  row?: JsonObject
}

type RequestResult =
  | { ok: true; request: { method: string; url: string; body: JsonObject | null } }
  | { ok: false; code: string; path?: string }

const rowReference = /^\$row\.([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)$/

function resolveRowValue(value: unknown, row: JsonObject): { found: boolean; value?: unknown } {
  if (typeof value !== 'string') return { found: true, value }
  const match = rowReference.exec(value)
  if (!match) return { found: true, value }
  let current: unknown = row
  for (const segment of match[1].split('.')) {
    if (current === null || typeof current !== 'object' || !(segment in current)) {
      return { found: false }
    }
    current = (current as JsonObject)[segment]
  }
  return { found: true, value: current }
}

function resolveMapping(mapping: JsonObject | undefined, row: JsonObject, section: string) {
  const entries: QueryEntry[] = []
  for (const [key, configuredValue] of Object.entries(mapping ?? {})) {
    const resolved = resolveRowValue(configuredValue, row)
    if (!resolved.found) {
      return { ok: false as const, code: 'UNRESOLVED_ROW_VALUE', path: `requestMapping.${section}.${key}` }
    }
    entries.push([key, resolved.value])
  }
  return { ok: true as const, entries }
}

function encodePathValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Object.is(value, -0) ? '0' : JSON.stringify(value)
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return null
}

export function buildRequest(input: RequestInput): RequestResult {
  if (input.kind === 'dataRef') {
    const dataRef = input.dataRef ?? {}
    const params = (dataRef.params ?? {}) as JsonObject
    const serialized = serializeQuery(String(dataRef.url), [Object.entries(params)])
    if (!serialized.ok) return serialized
    return {
      ok: true,
      request: { method: String(dataRef.method ?? 'GET'), url: serialized.url, body: null },
    }
  }

  if (input.kind !== 'rowAction') return { ok: false, code: 'INVALID_REQUEST_KIND', path: 'kind' }
  const mapping = input.requestMapping ?? {}
  const row = input.row ?? {}
  const pathValues = resolveMapping(mapping.path, row, 'path')
  if (!pathValues.ok) return pathValues
  const queryValues = resolveMapping(mapping.query, row, 'query')
  if (!queryValues.ok) return queryValues
  const bodyValues = resolveMapping(mapping.body, row, 'body')
  if (!bodyValues.ok) return bodyValues

  const action = input.action ?? {}
  let url = String(action.url)
  for (const [key, value] of pathValues.entries) {
    if (value === null || value === undefined) {
      return { ok: false, code: 'NULL_PATH_VALUE', path: `requestMapping.path.${key}` }
    }
    const encoded = encodePathValue(value)
    if (encoded === null) {
      return { ok: false, code: 'INVALID_PATH_VALUE', path: `requestMapping.path.${key}` }
    }
    url = url.replaceAll(`{${key}}`, encoded)
  }

  const serialized = serializeQuery(url, [queryValues.entries])
  if (!serialized.ok) return serialized
  return {
    ok: true,
    request: {
      method: String(action.method ?? 'GET'),
      url: serialized.url,
      body: bodyValues.entries.length === 0 ? null : Object.fromEntries(bodyValues.entries),
    },
  }
}