import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildRequest } from './requestConstruction'

interface FixtureSuite {
  fixtureVersion: string
  cases: Array<{
    id: string
    input: Parameters<typeof buildRequest>[0]
    expected: ReturnType<typeof buildRequest>
  }>
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const suite = JSON.parse(
  readFileSync(resolve(fixturesRoot, 'request-construction/cases.json'), 'utf8'),
) as FixtureSuite

describe('request construction conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(buildRequest(input)).toEqual(expected)
  })
})