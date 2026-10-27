// FastAPI client + execution helpers, ported from the original public/api.js.
// Network transport goes through Nuxt $fetch (exposed as window.aurumFetch).
/* eslint-disable @typescript-eslint/no-explicit-any */

export const TIMEFRAMES = ['M5', 'M10', 'M15', 'M30', 'H1', 'H4']

export const TERMINAL_STATES = new Set([
  'CANCELLED',
  'FILLED',
  'CLOSED',
  'UPDATED',
  'PARTIALLY_CLOSED',
  'PARTIALLY_FILLED',
  'REJECTED',
  'UNKNOWN',
])

export const ENDPOINTS: [string, string, string, string][] = [
  ['MT5 connection', 'POST', '/mt5/connections', 'Bind the configured terminal'],
  ['MT5 connection', 'GET', '/mt5/status', 'Account and worker status'],
  ['MT5 connection', 'GET', '/mt5/symbols', 'Configured symbol'],
  ['Market', 'GET', '/market/candles', 'Closed candles by timeframe'],
  ['AI analysis', 'POST', '/analyses', 'Screenshots and chart metadata'],
  ['AI analysis', 'GET', '/analyses/{id}', 'Saved analysis and provenance'],
  ['Trade plans', 'POST', '/trade-plans', 'Create a conditional plan'],
  ['Trade plans', 'GET', '/trade-plans/{id}', 'Track plan state'],
  ['Trade plans', 'POST', '/trade-plans/{id}/cancel', 'Cancel a monitoring plan'],
  ['Orders', 'POST', '/orders', 'Queue an immediate order'],
  ['Orders', 'GET', '/commands/{id}', 'Check broker outcome'],
  ['Positions', 'GET', '/positions', 'Read terminal positions'],
  ['Positions', 'POST', '/positions/{ticket}/close', 'Full or partial close'],
  [
    'Positions',
    'PATCH',
    '/positions/{ticket}/protection',
    'Update stop loss and take profit',
  ],
  ['Workspace', 'GET', '/workspace', 'Restore history and account state'],
  ['Workspace', 'GET', '/configuration', 'Read server execution limits'],
  ['Workspace', 'GET', '/activity', 'Paginated activity history'],
  ['MT5 connection', 'GET', '/mt5/connections', 'Saved account connections'],
  ['Market', 'GET', '/market/quote', 'Bid, ask and quote freshness'],
  ['AI analysis', 'GET', '/analyses', 'Paginated analysis history'],
  ['Trade plans', 'GET', '/trade-plans', 'Paginated saved plans'],
  ['Trade plans', 'POST', '/trade-plans/{id}/pause', 'Pause monitoring'],
  ['Trade plans', 'POST', '/trade-plans/{id}/resume', 'Resume eligible monitoring'],
  ['Orders', 'GET', '/commands', 'Paginated execution history'],
  ['Orders', 'POST', '/commands/{id}/cancel', 'Cancel before submission'],
]

export function validateBaseUrl(value: string): string {
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      'Use an API origin without credentials, query parameters or fragments.',
    )
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    )
  )
    throw new Error('Use HTTPS, or HTTP on localhost for development.')
  return url.toString().replace(/\/$/, '')
}

export function executionBlocker(analysis: any, mode = 'demo'): string | null {
  if (!analysis) return 'Analyse the market first.'
  const a = analysis.data
  if (
    mode === 'api' &&
    ![analysis.expires_at, analysis.reassess_at].every((x) =>
      Number.isFinite(Date.parse(x)),
    )
  )
    return 'Analysis validity is missing; request a new analysis.'
  if (a.execution_blockers?.length)
    return a.execution_blockers
      .map((x: string) => x.replaceAll('_', ' ').toLowerCase())
      .join('; ')
  if (!a.proposed_side || !a.entry_zone || !a.stop_loss || !a.take_profits?.length)
    return 'This analysis does not contain an executable setup.'
  if (
    mode === 'api' &&
    Date.now() >=
      Math.min(Date.parse(analysis.expires_at), Date.parse(analysis.reassess_at))
  )
    return 'This analysis has expired or requires reassessment.'
  return null
}

export function executionPayload(
  analysis: any,
  connectionId: string,
  values: { lots: string; tp: string; spread: string; deviation: string },
  kind = 'plan',
): any {
  const common = {
    analysis_id: analysis.id,
    connection_id: connectionId,
    sizing: { type: 'FIXED_LOTS', volume_lots: Number(values.lots) },
    take_profit_index: Number(values.tp),
    max_spread_points: Number(values.spread),
    max_deviation_points: Number(values.deviation),
  }
  if (!Number.isFinite(common.sizing.volume_lots) || common.sizing.volume_lots <= 0)
    throw new Error('Enter a lot size greater than zero.')
  if (!Number.isFinite(common.max_spread_points) || common.max_spread_points <= 0)
    throw new Error('Enter a positive spread limit.')
  if (
    !Number.isInteger(common.max_deviation_points) ||
    common.max_deviation_points < 0 ||
    common.max_deviation_points > 1000
  )
    throw new Error('Deviation must be a whole number from 0 to 1,000.')
  return kind === 'plan'
    ? { ...common, execution_mode: 'WHEN_CONDITIONS_MET', max_entries: 1 }
    : { ...common, side: analysis.data.proposed_side }
}

interface RequestOptions {
  method?: string
  body?: any
  idempotencyKey?: string
  signal?: AbortSignal
}

export class ApiClient {
  base: string
  key: string

  constructor(base: string, key: string) {
    this.base = validateBaseUrl(base)
    this.key = key
  }

  async request(
    path: string,
    { method = 'GET', body, idempotencyKey, signal }: RequestOptions = {},
  ): Promise<any> {
    const headers: Record<string, string> = { 'X-API-Key': this.key }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    if (body && !(body instanceof FormData))
      headers['Content-Type'] = 'application/json'
    try {
      return await window.aurumFetch(this.base + path, {
        method,
        headers,
        body,
        signal:
          signal ??
          AbortSignal.timeout(path === '/api/v1/analyses' ? 110000 : 20000),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        retry: 0,
      } as any)
    } catch (error: any) {
      const detail = error.data?.detail
      throw new Error(
        `${error.statusCode || 0}: ${typeof detail === 'string' ? detail : error.message}`,
      )
    }
  }

  workspace(connection: string) {
    return this.request(
      '/api/v1/workspace?connection_id=' + encodeURIComponent(connection),
    )
  }

  list(kind: string, connection: string, offset = 0) {
    return this.request(
      '/api/v1/' +
        kind +
        '?connection_id=' +
        encodeURIComponent(connection) +
        '&offset=' +
        offset +
        '&limit=20',
    )
  }

  pausePlan(id: string) {
    return this.request(
      '/api/v1/trade-plans/' + encodeURIComponent(id) + '/pause',
      { method: 'POST' },
    )
  }

  resumePlan(id: string) {
    return this.request(
      '/api/v1/trade-plans/' + encodeURIComponent(id) + '/resume',
      { method: 'POST' },
    )
  }

  cancelCommand(id: string) {
    return this.request(
      '/api/v1/commands/' + encodeURIComponent(id) + '/cancel',
      { method: 'POST' },
    )
  }

  health() {
    return this.request('/health')
  }

  status() {
    return this.request('/api/v1/mt5/status')
  }

  symbols() {
    return this.request('/api/v1/mt5/symbols')
  }

  connect(mode: string) {
    return this.request('/api/v1/mt5/connections', {
      method: 'POST',
      body: { mode },
    })
  }

  candles(connection: string, tf: string) {
    return this.request(
      `/api/v1/market/candles?connection_id=${encodeURIComponent(connection)}&timeframe=${encodeURIComponent(tf)}&count=150`,
    )
  }

  analyse(form: FormData) {
    return this.request('/api/v1/analyses', { method: 'POST', body: form })
  }

  analysis(id: string) {
    return this.request('/api/v1/analyses/' + encodeURIComponent(id))
  }

  createPlan(body: any) {
    return this.request('/api/v1/trade-plans', { method: 'POST', body })
  }

  plan(id: string) {
    return this.request('/api/v1/trade-plans/' + encodeURIComponent(id))
  }

  cancelPlan(id: string) {
    return this.request(
      '/api/v1/trade-plans/' + encodeURIComponent(id) + '/cancel',
      { method: 'POST' },
    )
  }

  order(body: any, key: string) {
    return this.request('/api/v1/orders', {
      method: 'POST',
      body,
      idempotencyKey: key,
    })
  }

  command(id: string) {
    return this.request('/api/v1/commands/' + encodeURIComponent(id))
  }

  positions(connection: string) {
    return this.request(
      '/api/v1/positions?connection_id=' + encodeURIComponent(connection),
    )
  }

  close(ticket: string, body: any, key: string) {
    return this.request(
      '/api/v1/positions/' + encodeURIComponent(ticket) + '/close',
      { method: 'POST', body, idempotencyKey: key },
    )
  }

  protection(ticket: string, body: any, key: string) {
    return this.request(
      '/api/v1/positions/' + encodeURIComponent(ticket) + '/protection',
      { method: 'PATCH', body, idempotencyKey: key },
    )
  }
}
