// FastAPI client + execution helpers for the Gold Market & MT5 API v0.2.0.
// Network transport goes through Nuxt $fetch (exposed as window.aurumFetch).
/* eslint-disable @typescript-eslint/no-explicit-any */

export const TIMEFRAMES = ['M5', 'M10', 'M15', 'M30', 'H1', 'H4']

// Command states that still change without operator action. Prefer the server's
// `final` flag; this set is the fallback for demo rows that do not carry one.
export const ACTIVE_STATES = new Set(['QUEUED', 'PREPARING', 'SUBMITTING', 'PLACED'])
export const UNCERTAIN_STATES = new Set(['UNKNOWN', 'SUBMITTING'])

export const isFinal = (c: any): boolean => c?.final ?? !ACTIVE_STATES.has(c?.state)

export const PENDING_TYPES = ['BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP']

export const ENDPOINTS: [string, string, string, string][] = [
  ['Worker', 'GET', '/worker/health', 'Snapshot freshness, quote and queue state'],
  ['MT5 connection', 'POST', '/mt5/connections', 'Bind the configured terminal account'],
  ['MT5 connection', 'GET', '/mt5/status', 'Account and terminal status'],
  ['MT5 connection', 'GET', '/mt5/symbols', 'Configured symbol and broker specification'],
  ['Market', 'GET', '/market/quote', 'Bid, ask, spread and quote age'],
  ['Market', 'GET', '/market/candles', 'Closed candles by timeframe'],
  ['AI analysis', 'POST', '/analyses', 'Analyse snapshot data plus optional screenshots'],
  ['AI analysis', 'GET', '/analyses', 'Recent analyses with eligibility'],
  ['AI analysis', 'GET', '/analyses/{id}', 'Saved analysis, assessment and provenance'],
  ['Trade plans', 'POST', '/trade-plans', 'Create a conditional plan'],
  ['Trade plans', 'GET', '/trade-plans', 'Recent plans, optionally by state'],
  ['Trade plans', 'GET', '/trade-plans/{id}', 'Track plan state'],
  ['Trade plans', 'POST', '/trade-plans/{id}/cancel', 'Cancel a waiting plan'],
  ['Orders', 'POST', '/orders/preview', 'Validate and price an order without queuing'],
  ['Orders', 'POST', '/orders', 'Queue a market or pending order'],
  ['Orders', 'GET', '/commands', 'Execution history'],
  ['Orders', 'GET', '/commands/{id}', 'Check broker outcome'],
  ['Orders', 'POST', '/commands/{id}/cancel', 'Cancel before the worker claims it'],
  ['Pending orders', 'GET', '/orders/pending', 'Active broker pending orders'],
  ['Pending orders', 'GET', '/orders/pending/{ticket}', 'One pending order'],
  ['Pending orders', 'POST', '/orders/pending/{ticket}/cancel', 'Queue a pending-order cancellation'],
  ['Positions', 'GET', '/positions', 'Open positions snapshot'],
  ['Positions', 'GET', '/positions/{ticket}', 'One open position'],
  ['Positions', 'POST', '/positions/{ticket}/close', 'Full or partial close'],
  ['Positions', 'PATCH', '/positions/{ticket}/protection', 'Update stop loss and take profit'],
  ['History', 'GET', '/trades', 'Recorded trade outcomes'],
  ['History', 'GET', '/trades/{id}', 'One trade outcome'],
  ['History', 'GET', '/stats/performance', 'Win rate with sample size and confidence interval'],
  ['History', 'GET', '/audit', 'Append-only audit trail'],
]

// ---- Errors ----------------------------------------------------------------

export class ApiError extends Error {
  status: number
  code: string
  detail: any

  constructor(status: number, code: string, message: string, detail: any = null) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

// Plain-language copy for the stable `detail.code` values. The server message
// stays the fallback so new codes still read sensibly.
const CODE_COPY: Record<string, string> = {
  UNAUTHORIZED: 'The API key was rejected. Check the owner key and reconnect.',
  SNAPSHOT_STALE: 'The MT5 worker snapshot is stale. Check the Windows terminal and worker.',
  QUOTE_STALE: 'No recent broker quote. The market may be closed.',
  ACCOUNT_MISMATCH: 'The terminal is logged into a different account than this connection.',
  MODE_MISMATCH: 'The selected account mode does not match the MT5 terminal.',
  EXPOSURE_BLOCKED: 'An execution outcome is unresolved. New entries are blocked until it is reconciled.',
  RESERVATION_EXISTS: 'This analysis is already used by an order or plan. Run a fresh analysis for another entry.',
  PLAN_EXISTS: 'This analysis already has a plan.',
  ANALYSIS_EXPIRED: 'This analysis has expired. Run a fresh analysis.',
  ANALYSIS_REASSESS_REQUIRED: 'This analysis has passed its reassessment time. Run a fresh analysis.',
  DECISION_NOT_ACTIONABLE: 'This analysis says wait. Use a conditional trade plan instead of an order.',
  NO_ENTRY_RULE: 'This analysis has no conditional entry rule, so it cannot back a plan.',
  ENTRY_OUT_OF_ZONE: 'The order price must sit inside the analysis entry zone.',
  IDEMPOTENCY_CONFLICT: 'This request key was already used with different values. Reopen the review and try again.',
  PLAN_NOT_CANCELLABLE: 'The plan already left monitoring. Inspect its command and position instead.',
  COMMAND_NOT_CANCELLABLE: 'The worker already claimed this command. Inspect its outcome instead.',
  ORDER_NOT_ACTIVE: 'This pending order is no longer active at the broker.',
  POSITION_NOT_OPEN: 'This position is no longer open in the latest snapshot.',
  IMAGE_STALE: 'A screenshot capture time is too old or in the future.',
  IMAGE_INVALID: 'A screenshot could not be read. Use a clear PNG, JPEG or WebP between 200px and 20MP.',
  IMAGE_TOO_LARGE: 'A screenshot is larger than the upload limit.',
  AI_FAILED: 'The AI provider failed or returned an invalid analysis. No trade was created.',
  SYMBOL_UNSUPPORTED: 'The server is configured for a different symbol.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && error.detail?.errors?.length) {
      const first = error.detail.errors[0]
      return `${error.message}: ${first.loc?.slice(1).join('.') || 'request'} — ${first.msg}`
    }
    return CODE_COPY[error.code] ?? error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

// ---- URL ---------------------------------------------------------------------

export function validateBaseUrl(value: string): string {
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Use an API origin without credentials, query parameters or fragments.')
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('Use HTTPS, or HTTP on localhost for development.')
  return url.toString().replace(/\/$/, '')
}

// ---- Analysis eligibility ----------------------------------------------------

export interface Reason {
  code: string
  message: string
}

const TIMING = new Set(['ANALYSIS_EXPIRED', 'ANALYSIS_REASSESS_REQUIRED'])

// Server eligibility is computed when the row was read, so timing is re-checked
// against the client clock; static reasons (no setup, blockers) are kept as-is.
export function blockingReasons(analysis: any, now = Date.now()): Reason[] {
  if (!analysis) return [{ code: 'NO_ANALYSIS', message: 'Analyse the market first.' }]
  const data = analysis.data ?? {}
  const reasons: Reason[] = analysis.eligibility
    ? analysis.eligibility.blocking_reasons.filter((r: Reason) => !TIMING.has(r.code))
    : [
        ...(data.proposed_side ? [] : [{ code: 'NO_SETUP', message: 'Analysis proposes no side (WAIT/NO_TRADE)' }]),
        ...(data.execution_blockers ?? []).map((b: string) => ({ code: 'ANALYSIS_BLOCKED', message: b })),
      ]
  const expires = Date.parse(analysis.expires_at)
  const reassess = Date.parse(analysis.reassess_at)
  if (!Number.isFinite(expires) || !Number.isFinite(reassess))
    reasons.unshift({ code: 'ANALYSIS_EXPIRED', message: 'Analysis validity is missing' })
  else if (now >= expires) reasons.unshift({ code: 'ANALYSIS_EXPIRED', message: 'Analysis valid_until has passed' })
  else if (now >= reassess)
    reasons.unshift({ code: 'ANALYSIS_REASSESS_REQUIRED', message: 'Analysis reassess_at has passed' })
  return reasons
}

export function reasonText(r: Reason): string {
  if (r.code === 'ANALYSIS_BLOCKED') return r.message.replaceAll('_', ' ').toLowerCase()
  if (r.code === 'NO_SETUP') return 'No trade setup was proposed.'
  return CODE_COPY[r.code] ?? r.message
}

export function executionBlocker(analysis: any, now = Date.now()): string | null {
  const reasons = blockingReasons(analysis, now)
  return reasons.length ? reasons.map(reasonText).join(' ') : null
}

// What the analysis allows: an immediate order, a conditional plan, or nothing.
export function tradeKind(analysis: any): 'order' | 'plan' | null {
  const d = analysis?.data
  if (!d?.proposed_side) return null
  if (d.decision === 'BUY' || d.decision === 'SELL') return 'order'
  if (d.decision === 'WAIT' && d.entry_rule) return 'plan'
  return null
}

// ---- Execution payloads ------------------------------------------------------

export type SizingType = 'FIXED_LOTS' | 'RISK_PERCENT' | 'RISK_AMOUNT'

export interface ExecutionValues {
  sizingType: SizingType
  sizingValue: string
  tp: string
  spread: string
  deviation: string
  orderType?: string
  price?: string
}

export function sizingBody(type: SizingType, raw: string): any {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(
      type === 'FIXED_LOTS'
        ? 'Enter a lot size greater than zero.'
        : type === 'RISK_PERCENT'
          ? 'Enter a risk percentage greater than zero.'
          : 'Enter a risk amount greater than zero.',
    )
  if (type === 'RISK_PERCENT' && value > 100) throw new Error('Risk percentage cannot exceed 100.')
  if (type === 'FIXED_LOTS') return { type, volume_lots: value }
  if (type === 'RISK_PERCENT') return { type, risk_percent: value }
  return { type, risk_amount: value }
}

export function executionPayload(
  analysis: any,
  connectionId: string,
  values: ExecutionValues,
  kind: 'plan' | 'order',
): any {
  const common = {
    analysis_id: analysis.id,
    connection_id: connectionId,
    sizing: sizingBody(values.sizingType, values.sizingValue),
    take_profit_index: Number(values.tp),
    max_spread_points: Number(values.spread),
    max_deviation_points: Number(values.deviation),
  }
  if (!Number.isFinite(common.max_spread_points) || common.max_spread_points <= 0)
    throw new Error('Enter a positive spread limit.')
  if (
    !Number.isInteger(common.max_deviation_points) ||
    common.max_deviation_points < 0 ||
    common.max_deviation_points > 1000
  )
    throw new Error('Deviation must be a whole number from 0 to 1,000.')
  if (kind === 'plan') return { ...common, execution_mode: 'WHEN_CONDITIONS_MET', max_entries: 1 }
  const orderType = values.orderType || 'MARKET'
  if (orderType === 'MARKET') return { ...common, side: analysis.data.proposed_side, order_type: 'MARKET' }
  const price = Number(values.price)
  const [lo, hi] = analysis.data.entry_zone
  if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a pending order price.')
  if (price < lo || price > hi) throw new Error('The order price must sit inside the entry zone.')
  return { ...common, side: analysis.data.proposed_side, order_type: orderType, price }
}

// ---- Client ------------------------------------------------------------------

interface RequestOptions {
  method?: string
  body?: any
  idempotencyKey?: string
  signal?: AbortSignal
}

const q = (params: Record<string, unknown>) =>
  '?' +
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')

const seg = encodeURIComponent

export class ApiClient {
  base: string
  key: string

  constructor(base: string, key: string) {
    this.base = validateBaseUrl(base)
    this.key = key
  }

  async request(path: string, { method = 'GET', body, idempotencyKey, signal }: RequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = { 'X-API-Key': this.key }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
    try {
      return await window.aurumFetch(this.base + path, {
        method,
        headers,
        body,
        signal: signal ?? AbortSignal.timeout(path === '/api/v1/analyses' && method === 'POST' ? 110000 : 20000),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        retry: 0,
      } as any)
    } catch (error: any) {
      const detail = error.data?.detail
      const status = error.statusCode || error.status || 0
      if (detail && typeof detail === 'object')
        throw new ApiError(status, detail.code || 'ERROR', detail.message || error.message, detail)
      if (!status)
        throw new ApiError(0, 'NETWORK', 'Cannot reach the API. Check its URL, CORS and that the server is running.')
      throw new ApiError(status, 'ERROR', typeof detail === 'string' ? detail : error.message)
    }
  }

  health() {
    return this.request('/health')
  }

  workerHealth() {
    return this.request('/api/v1/worker/health')
  }

  status() {
    return this.request('/api/v1/mt5/status')
  }

  symbols() {
    return this.request('/api/v1/mt5/symbols')
  }

  connect(mode: string) {
    return this.request('/api/v1/mt5/connections', { method: 'POST', body: { mode } })
  }

  quote(connection: string) {
    return this.request('/api/v1/market/quote' + q({ connection_id: connection }))
  }

  candles(connection: string, tf: string, count = 150) {
    return this.request('/api/v1/market/candles' + q({ connection_id: connection, timeframe: tf, count }))
  }

  analyse(form: FormData) {
    return this.request('/api/v1/analyses', { method: 'POST', body: form })
  }

  analyses(limit = 20) {
    return this.request('/api/v1/analyses' + q({ limit }))
  }

  analysis(id: string) {
    return this.request('/api/v1/analyses/' + seg(id))
  }

  createPlan(body: any) {
    return this.request('/api/v1/trade-plans', { method: 'POST', body })
  }

  plans(limit = 50, state?: string) {
    return this.request('/api/v1/trade-plans' + q({ limit, state }))
  }

  plan(id: string) {
    return this.request('/api/v1/trade-plans/' + seg(id))
  }

  cancelPlan(id: string) {
    return this.request('/api/v1/trade-plans/' + seg(id) + '/cancel', { method: 'POST' })
  }

  preview(body: any, signal?: AbortSignal) {
    return this.request('/api/v1/orders/preview', { method: 'POST', body, signal })
  }

  order(body: any, key: string) {
    return this.request('/api/v1/orders', { method: 'POST', body, idempotencyKey: key })
  }

  commands(limit = 50, state?: string, kind?: string) {
    return this.request('/api/v1/commands' + q({ limit, state, kind }))
  }

  command(id: string) {
    return this.request('/api/v1/commands/' + seg(id))
  }

  cancelCommand(id: string) {
    return this.request('/api/v1/commands/' + seg(id) + '/cancel', { method: 'POST' })
  }

  pendingOrders(connection: string) {
    return this.request('/api/v1/orders/pending' + q({ connection_id: connection }))
  }

  cancelPending(ticket: string, connection: string, key: string) {
    return this.request('/api/v1/orders/pending/' + seg(ticket) + '/cancel', {
      method: 'POST',
      body: { connection_id: connection },
      idempotencyKey: key,
    })
  }

  positions(connection: string) {
    return this.request('/api/v1/positions' + q({ connection_id: connection }))
  }

  close(ticket: string, body: any, key: string) {
    return this.request('/api/v1/positions/' + seg(ticket) + '/close', { method: 'POST', body, idempotencyKey: key })
  }

  protection(ticket: string, body: any, key: string) {
    return this.request('/api/v1/positions/' + seg(ticket) + '/protection', {
      method: 'PATCH',
      body,
      idempotencyKey: key,
    })
  }

  trades(limit = 50, outcome?: string, source?: string) {
    return this.request('/api/v1/trades' + q({ limit, outcome, source }))
  }

  performance(params: { source: string; timeframe?: string; strategy?: string }) {
    return this.request('/api/v1/stats/performance' + q(params))
  }

  audit(limit = 100, filters: Record<string, string> = {}) {
    return this.request('/api/v1/audit' + q({ limit, ...filters }))
  }
}
