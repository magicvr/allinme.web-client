import { serializeQuery, type QueryEntry } from './querySerialization'

export interface TableQueryState {
  filters: Record<string, unknown>
  page: number
  pageSize: number
  sort: string | null
}

export type TableQueryEvent =
  | { type: 'submitSearch'; filters: Record<string, unknown> }
  | { type: 'clearSearch' }
  | { type: 'changePage'; page: number }
  | { type: 'changeSort'; sort: string | null }

export interface TableQueryInput {
  baseUrl: string
  staticParams: Record<string, unknown>
  state: TableQueryState
  event: TableQueryEvent | null
}

export function applyTableQueryEvent(
  state: TableQueryState,
  event: TableQueryEvent | null,
): TableQueryState {
  if (event === null) return { ...state, filters: { ...state.filters } }
  switch (event.type) {
    case 'submitSearch':
      return { ...state, filters: { ...event.filters }, page: 1 }
    case 'clearSearch':
      return { ...state, filters: {}, page: 1 }
    case 'changePage':
      return { ...state, page: event.page }
    case 'changeSort':
      return { ...state, page: 1, sort: event.sort }
  }
}

export function buildTableQuery(input: TableQueryInput) {
  const state = applyTableQueryEvent(input.state, input.event)
  const rendererState: QueryEntry[] = [
    ['page', state.page],
    ['pageSize', state.pageSize],
    ['sort', state.sort],
  ]
  const serialized = serializeQuery(input.baseUrl, [
    Object.entries(input.staticParams),
    Object.entries(state.filters),
    rendererState,
  ])
  if (!serialized.ok) return serialized
  return { state, url: serialized.url }
}