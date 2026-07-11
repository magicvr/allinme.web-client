import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapResponse, type ResponseMappingInput, type ResponseMappingResult } from './responseMapping'

interface FixtureSuite {
  fixtureVersion: string
  cases: Array<{
    id: string
    input: ResponseMappingInput
    expected: ResponseMappingResult
  }>
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const suite = JSON.parse(
  readFileSync(resolve(fixturesRoot, 'response-mapping/cases.json'), 'utf8'),
) as FixtureSuite

describe('response mapping conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(mapResponse(input)).toEqual(expected)
  })
})