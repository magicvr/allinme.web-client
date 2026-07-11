import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildTableQuery, type TableQueryInput } from './tableQueryState'

interface FixtureSuite {
  fixtureVersion: string
  cases: Array<{
    id: string
    input: TableQueryInput
    expected: ReturnType<typeof buildTableQuery>
  }>
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const suite = JSON.parse(
  readFileSync(resolve(fixturesRoot, 'search-table/cases.json'), 'utf8'),
) as FixtureSuite

describe('search table conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(buildTableQuery(input)).toEqual(expected)
  })
})