type JsonObject = Record<string, unknown>

export interface ResponseMappingInput {
  component: string
  paginationMode?: string
  datasourceMapping?: { list?: string; total?: string }
  localMapping?: { list?: string; total?: string }
  response: unknown
}

export type ResponseMappingResult =
  | { ok: true; data: { list: unknown[]; total?: number } }
  | { ok: false; code: string; path: string }

function readPath(response: unknown, path: string): { found: boolean; value?: unknown } {
  let current = response
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current) || !(segment in current)) {
      return { found: false }
    }
    current = (current as JsonObject)[segment]
  }
  return { found: true, value: current }
}

export function mapResponse(input: ResponseMappingInput): ResponseMappingResult {
  const mapping = Object.hasOwn(input, 'localMapping')
    ? input.localMapping
    : input.datasourceMapping

  if (input.component === 'chart' && mapping === undefined) {
    return Array.isArray(input.response)
      ? { ok: true, data: { list: input.response } }
      : { ok: false, code: 'RESPONSE_MAPPING_TYPE_MISMATCH', path: '$' }
  }

  const listPath = mapping?.list || 'list'
  const list = readPath(input.response, listPath)
  if (!list.found) return { ok: false, code: 'RESPONSE_MAPPING_PATH_MISSING', path: listPath }
  if (!Array.isArray(list.value)) {
    return { ok: false, code: 'RESPONSE_MAPPING_TYPE_MISMATCH', path: listPath }
  }

  const data: { list: unknown[]; total?: number } = { list: list.value }
  if (input.component === 'table' && input.paginationMode === 'server') {
    const totalPath = mapping?.total || 'total'
    const total = readPath(input.response, totalPath)
    if (!total.found) return { ok: false, code: 'RESPONSE_MAPPING_PATH_MISSING', path: totalPath }
    if (typeof total.value !== 'number' || !Number.isFinite(total.value)) {
      return { ok: false, code: 'RESPONSE_MAPPING_TYPE_MISMATCH', path: totalPath }
    }
    data.total = total.value
  }
  return { ok: true, data }
}