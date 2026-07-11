import { processActionOutcome } from './actionOutcome'
import { buildRequest } from './requestConstruction'
import { mapResponse } from './responseMapping'
import { buildTableQuery } from './tableQueryState'
import { executeUpload } from './uploadExecution'

interface ScenarioInput {
  scenarioPath: string
  scenarioMeta: { pageId: string; protocolVersion: string }
  steps: Array<{ kind: string; input: unknown }>
}

type ScenarioMeta = ScenarioInput['scenarioMeta']

function executeStep(step: ScenarioInput['steps'][number]) {
  if (step.kind === 'request') {
    return buildRequest(step.input as Parameters<typeof buildRequest>[0])
  }
  if (step.kind === 'responseMapping') {
    return mapResponse(step.input as Parameters<typeof mapResponse>[0])
  }
  if (step.kind === 'searchTable') {
    return buildTableQuery(step.input as Parameters<typeof buildTableQuery>[0])
  }
  if (step.kind === 'action') {
    return processActionOutcome(step.input as Parameters<typeof processActionOutcome>[0])
  }
  if (step.kind === 'upload') {
    return executeUpload(step.input as Parameters<typeof executeUpload>[0])
  }
  throw new Error(`Unknown scenario step: ${step.kind}`)
}

export function executeScenario(input: ScenarioInput, officialMeta: ScenarioMeta) {
  if (
    officialMeta.pageId !== input.scenarioMeta.pageId
    || officialMeta.protocolVersion !== input.scenarioMeta.protocolVersion
  ) {
    throw new Error(`Scenario metadata mismatch: ${input.scenarioPath}`)
  }
  return {
    pageId: officialMeta.pageId,
    protocolVersion: officialMeta.protocolVersion,
    steps: input.steps.map(executeStep),
  }
}