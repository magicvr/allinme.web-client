export type QueryEntry = readonly [string, unknown]

export type QueryResult =
  | { ok: true; url: string }
  | { ok: false; code: string }

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function scalarToText(value: unknown): { text?: string; tombstone?: true } | null {
  if (value === null || value === undefined) return { tombstone: true }
  if (typeof value === 'string') return { text: value }
  if (typeof value === 'boolean') return { text: value ? 'true' : 'false' }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { text: Object.is(value, -0) ? '0' : JSON.stringify(value) }
  }
  return null
}

export function serializeQuery(baseUrl: string, sources: QueryEntry[][]): QueryResult {
  const fragmentIndex = baseUrl.indexOf('#')
  const requestPart = fragmentIndex === -1 ? baseUrl : baseUrl.slice(0, fragmentIndex)
  const fragment = fragmentIndex === -1 ? '' : baseUrl.slice(fragmentIndex)
  const queryIndex = requestPart.indexOf('?')
  const path = queryIndex === -1 ? requestPart : requestPart.slice(0, queryIndex)
  const baseQuery = queryIndex === -1 ? '' : requestPart.slice(queryIndex + 1)
  const merged = new Map<string, string>()

  for (const segment of baseQuery.split('&')) {
    if (segment === '') continue
    const equalsIndex = segment.indexOf('=')
    const encodedKey = equalsIndex === -1 ? segment : segment.slice(0, equalsIndex)
    const encodedValue = equalsIndex === -1 ? '' : segment.slice(equalsIndex + 1)
    try {
      const key = decodeURIComponent(encodedKey)
      const value = decodeURIComponent(encodedValue)
      if (key.length === 0) return { ok: false, code: 'INVALID_QUERY_KEY' }
      merged.set(key, value)
    } catch {
      return { ok: false, code: 'INVALID_BASE_URL_QUERY' }
    }
  }

  for (const source of sources) {
    for (const [key, value] of source) {
      if (key.length === 0) return { ok: false, code: 'INVALID_QUERY_KEY' }
      const scalar = scalarToText(value)
      if (scalar === null) return { ok: false, code: 'INVALID_QUERY_VALUE' }
      if (scalar.tombstone) merged.delete(key)
      else merged.set(key, scalar.text ?? '')
    }
  }

  const query = [...merged.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&')
  return { ok: true, url: `${path}${query === '' ? '' : `?${query}`}${fragment}` }
}