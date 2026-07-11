interface OutcomeBehavior {
  behavior: 'toast' | 'navigate' | 'reload' | 'closeModal'
  message?: string
  url?: string
}

interface FieldError {
  field: string
  message: string
}

interface ActionOutcomeInput {
  transport: {
    type: 'success' | 'httpError' | 'timeout' | 'networkError' | 'abort'
    status?: number
    body?: { message?: string; errors?: FieldError[] }
  }
  onSuccess?: OutcomeBehavior
  onError?: OutcomeBehavior
  context?: { tableId?: string }
}

type ActionEvent = Record<string, unknown> & { type: string }

function behaviorEvent(behavior: OutcomeBehavior, context: { tableId?: string } = {}): ActionEvent {
  if (behavior.behavior === 'toast') return { type: 'toast', message: behavior.message }
  if (behavior.behavior === 'navigate') return { type: 'navigate', url: behavior.url }
  if (behavior.behavior === 'reload') {
    return context.tableId
      ? { type: 'reloadTable', tableId: context.tableId }
      : { type: 'reloadCurrentData' }
  }
  return { type: 'closeModal' }
}

export function processActionOutcome(input: ActionOutcomeInput): { ok: boolean; events: ActionEvent[] } {
  const { transport } = input
  if (transport.type === 'success') {
    const events: ActionEvent[] = [{ type: 'requestSucceeded', status: transport.status }]
    if (input.onSuccess) events.push(behaviorEvent(input.onSuccess, input.context))
    return { ok: true, events }
  }

  if (transport.type === 'httpError') {
    const status = transport.status ?? 0
    const body = transport.body ?? {}
    if (status === 401 || status === 403) {
      return {
        ok: false,
        events: [
          { type: 'authFailure', status },
          { type: 'errorState', display: status === 401 ? null : '无权限访问' },
        ],
      }
    }

    if (status === 400 && Array.isArray(body.errors) && body.errors.length > 0) {
      const events: ActionEvent[] = [{ type: 'fieldErrors', errors: body.errors }]
      if (input.onError?.behavior === 'toast') {
        events.push(behaviorEvent(input.onError, input.context))
      } else if (body.message) {
        events.push({ type: 'toast', message: body.message })
      }
      return { ok: false, events }
    }

    const display = status === 404
      ? '资源不存在'
      : status >= 500
        ? '系统异常，请稍后重试'
        : body.message ?? null
    const events: ActionEvent[] = [{ type: 'errorState', display }]
    if (input.onError) events.push(behaviorEvent(input.onError, input.context))
    return { ok: false, events }
  }

  if (transport.type === 'abort') return { ok: false, events: [] }
  const events: ActionEvent[] = [transport.type === 'timeout'
    ? { type: 'errorState', display: '请求超时，请稍后重试', retryable: true }
    : { type: 'errorState', display: '网络异常，请检查网络连接', retryable: true }]
  if (input.onError) events.push(behaviorEvent(input.onError, input.context))
  return { ok: false, events }
}