import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { negotiateProtocol, type PageMeta, type RendererSupport } from './versionNegotiation'

interface FixtureCase {
  id: string
  input: {
    pageMeta: PageMeta
    rendererSupport: RendererSupport
  }
  expected: ReturnType<typeof negotiateProtocol>
}

interface FixtureSuite {
  fixtureVersion: string
  cases: FixtureCase[]
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const fixturePath = resolve(fixturesRoot, 'version-negotiation/cases.json')
const suite = JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureSuite

describe('protocol version negotiation conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(negotiateProtocol(input.pageMeta, input.rendererSupport)).toEqual(expected)
  })
})