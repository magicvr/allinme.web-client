import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { runReactionSchedule, type ReactionScheduleInput } from './reactionScheduler'

interface FixtureSuite {
  fixtureVersion: string
  cases: Array<{
    id: string
    input: ReactionScheduleInput
    expected: ReturnType<typeof runReactionSchedule>
  }>
}

const fixturesRoot = process.env.SCHEMA_UI_FIXTURES
  ?? resolve(import.meta.dirname, '../../../schema-ui-docs/conformance/fixtures')
const suite = JSON.parse(
  readFileSync(resolve(fixturesRoot, 'reactions/cases.json'), 'utf8'),
) as FixtureSuite

describe('reaction scheduling conformance', () => {
  it('consumes fixture version 1.0', () => {
    expect(suite.fixtureVersion).toBe('1.0')
  })

  it.each(suite.cases)('$id', ({ input, expected }) => {
    expect(runReactionSchedule(input)).toEqual(expected)
  })
})