import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

import { executeScenario } from './scenarioExecution'

interface FixtureSuite {
  fixtureVersion: string
  cases: Array<{
    id: string
    input: Parameters<typeof executeScenario>[0]
    expected: ReturnType<typeof executeScenario>
  }>
}

interface ScenarioPage {
  meta: { pageId: string; protocolVersion: string }
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const protocolRoot = resolve(fixturesRoot, '..', '..')
const suite = JSON.parse(
  readFileSync(resolve(fixturesRoot, 'scenarios/cases.json'), 'utf8'),
) as FixtureSuite

function readScenarioMeta(scenarioPath: string): ScenarioPage['meta'] {
  const markdown = readFileSync(resolve(protocolRoot, scenarioPath), 'utf8')
  const fence = /```ya?ml\s*\r?\n([\s\S]*?)\r?\n```/.exec(markdown)
  if (!fence) throw new Error(`Missing YAML fence: ${scenarioPath}`)
  return (load(fence[1]) as ScenarioPage).meta
}

describe('official scenario execution conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(executeScenario(input, readScenarioMeta(input.scenarioPath))).toEqual(expected)
  })
})