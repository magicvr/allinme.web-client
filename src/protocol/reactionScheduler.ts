type JsonObject = Record<string, unknown>

interface ReactionBranch {
  value?: unknown
}

interface Reaction {
  when: string
  fulfill?: ReactionBranch
  otherwise?: ReactionBranch
}

export interface ReactionScheduleInput {
  initialValues: JsonObject
  maxRounds?: number
  fields: Array<{ field: string; reactions: Reaction[] }>
  observers: Array<{ id: string; when: string }>
}

const conditionPattern = /^\$deps\.([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*(==|!=)\s*(true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?|'[^']*')$/
const dependencyPattern = /\$deps\.([A-Za-z_][A-Za-z0-9_]*)/g

function readPath(values: JsonObject, path: string): unknown {
  let current: unknown = values
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !(segment in current)) return undefined
    current = (current as JsonObject)[segment]
  }
  return current
}

function parseLiteral(token: string): unknown {
  if (token === 'true') return true
  if (token === 'false') return false
  if (token === 'null') return null
  if (token.startsWith("'")) return token.slice(1, -1)
  return Number(token)
}

function evaluateCondition(expression: string, snapshot: JsonObject): boolean {
  const match = conditionPattern.exec(expression)
  if (!match) throw new Error(`Unsupported reference expression: ${expression}`)
  const left = readPath(snapshot, match[1])
  if (left === undefined) return false
  const equal = left === parseLiteral(match[3])
  return match[2] === '==' ? equal : !equal
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function runReactionSchedule(input: ReactionScheduleInput) {
  const values = structuredClone(input.initialValues)
  const maxRounds = input.maxRounds ?? 10
  const dependencyFields = new Set<string>()
  for (const expression of [
    ...input.fields.flatMap((field) => field.reactions.map((reaction) => reaction.when)),
    ...input.observers.map((observer) => observer.when),
  ]) {
    for (const match of expression.matchAll(dependencyPattern)) dependencyFields.add(match[1])
  }

  const warnings: Array<{ code: string; field: string; count: number }> = []
  const warnedFields = new Set<string>()
  const rounds: Array<{
    round: number
    snapshot: JsonObject
    observations: Record<string, boolean>
    commits: Array<{ field: string; value: unknown }>
  }> = []

  for (let round = 1; round <= maxRounds; round += 1) {
    const snapshot = structuredClone(values)
    const observations = Object.fromEntries(
      input.observers.map((observer) => [observer.id, evaluateCondition(observer.when, snapshot)]),
    )
    const pending = new Map<string, unknown>()

    for (const field of input.fields) {
      let valueWriteCount = 0
      for (const reaction of field.reactions) {
        const branch = evaluateCondition(reaction.when, snapshot) ? reaction.fulfill : reaction.otherwise
        if (branch && Object.hasOwn(branch, 'value')) {
          pending.set(field.field, structuredClone(branch.value))
          valueWriteCount += 1
        }
      }
      if (valueWriteCount > 1 && !warnedFields.has(field.field)) {
        warnings.push({ code: 'MULTIPLE_VALUE_WRITES', field: field.field, count: valueWriteCount })
        warnedFields.add(field.field)
      }
    }

    const commits: Array<{ field: string; value: unknown }> = []
    for (const [field, value] of pending) {
      if (!deepEqual(values[field], value)) {
        values[field] = structuredClone(value)
        commits.push({ field, value: structuredClone(value) })
      }
    }
    rounds.push({ round, snapshot, observations, commits })

    if (!commits.some((commit) => dependencyFields.has(commit.field))) {
      return { ok: true, values, rounds, warnings }
    }
  }

  return {
    ok: false,
    code: 'REACTION_LOOP_LIMIT',
    maxRounds,
    values,
    roundCount: maxRounds,
    dependencyFields: [...dependencyFields].sort(),
  }
}