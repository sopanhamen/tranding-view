import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiClient,
  ApiError,
  blockingReasons,
  connectionBody,
  errorMessage,
  executionPayload,
  isFinal,
  loginError,
  tradeKind,
} from '../app/utils/api'
import { eventView } from '../app/utils/records'

const hour = 3600000
const analysis = (data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  id: 'a1',
  expires_at: new Date(Date.now() + 4 * hour).toISOString(),
  reassess_at: new Date(Date.now() + hour).toISOString(),
  data: {
    decision: 'BUY',
    proposed_side: 'BUY',
    entry_zone: [2640, 2649],
    entry_rule: null,
    stop_loss: 2635,
    take_profits: [2660],
    execution_blockers: [],
    ...data,
  },
  ...extra,
})
const values = { sizingType: 'FIXED_LOTS' as const, sizingValue: '0.01', tp: '0', spread: '50', deviation: '20' }

describe('executionPayload', () => {
  it('builds a MARKET order without price or expiration', () => {
    expect(executionPayload(analysis(), 'c1', values, 'order')).toEqual({
      analysis_id: 'a1',
      connection_id: 'c1',
      sizing: { type: 'FIXED_LOTS', volume_lots: 0.01 },
      take_profit_index: 0,
      max_spread_points: 50,
      max_deviation_points: 20,
      side: 'BUY',
      order_type: 'MARKET',
    })
  })

  it('builds risk-based sizing and pending orders inside the zone', () => {
    const body = executionPayload(
      analysis(),
      'c1',
      { ...values, sizingType: 'RISK_PERCENT', sizingValue: '0.5', orderType: 'BUY_LIMIT', price: '2645' },
      'order',
    )
    expect(body.sizing).toEqual({ type: 'RISK_PERCENT', risk_percent: 0.5 })
    expect(body).toMatchObject({ order_type: 'BUY_LIMIT', price: 2645 })
  })

  it('rejects pending prices outside the entry zone', () => {
    expect(() =>
      executionPayload(analysis(), 'c1', { ...values, orderType: 'BUY_LIMIT', price: '2630' }, 'order'),
    ).toThrow(/inside the entry zone/)
  })

  it('builds a plan body with the fixed execution mode', () => {
    expect(executionPayload(analysis(), 'c1', values, 'plan')).toMatchObject({
      execution_mode: 'WHEN_CONDITIONS_MET',
      max_entries: 1,
    })
  })
})

describe('eligibility', () => {
  it('re-checks timing on the client even when the server said executable', () => {
    const stale = analysis({}, { eligibility: { executable: true, blocking_reasons: [] } })
    expect(blockingReasons(stale, Date.now() + 2 * hour)[0]?.code).toBe('ANALYSIS_REASSESS_REQUIRED')
  })

  it('keeps static server reasons', () => {
    const blocked = analysis({}, { eligibility: { blocking_reasons: [{ code: 'ANALYSIS_BLOCKED', message: 'X' }] } })
    expect(blockingReasons(blocked).map((r) => r.code)).toEqual(['ANALYSIS_BLOCKED'])
  })

  it('maps decisions to the allowed trade kind', () => {
    expect(tradeKind(analysis())).toBe('order')
    expect(tradeKind(analysis({ decision: 'WAIT', entry_rule: { type: 'CLOSE_ABOVE_THEN_RETEST' } }))).toBe('plan')
    expect(tradeKind(analysis({ decision: 'NO_TRADE', proposed_side: null }))).toBeNull()
  })
})

describe('server contract', () => {
  it('prefers plain-language copy for stable error codes', () => {
    expect(errorMessage(new ApiError(409, 'EXPOSURE_BLOCKED', 'raw'))).toMatch(/blocked/)
    expect(errorMessage(new ApiError(409, 'SOMETHING_NEW', 'Server text'))).toBe('Server text')
  })

  it('treats PLACED as not final and honours the server flag', () => {
    expect(isFinal({ state: 'PLACED' })).toBe(false)
    expect(isFinal({ state: 'QUEUED', final: true })).toBe(true)
  })

  it('shapes audit events for the timeline', () => {
    expect(eventView({ id: 'e', kind: 'COMMAND_UNKNOWN', message: 'timeout', at: 'x', position_ticket: '7' })).toMatchObject({
      title: 'Command unknown',
      description: 'timeout · Ticket 7',
      type: 'info',
      state: 'UNKNOWN',
    })
  })
})

describe('connection flow', () => {
  const creds = { connectionType: 'demo' as const, login: '12345678', password: 'pw', server: ' Exness-MT5Trial7 ', broker: '' }

  it('builds the ConnectionCreate body', () => {
    expect(connectionBody(creds)).toEqual({
      connectionType: 'demo',
      connection_login: 12345678,
      password: 'pw',
      server: 'Exness-MT5Trial7',
      broker: null,
    })
  })

  it('rejects non-numeric logins and missing secrets', () => {
    expect(() => connectionBody({ ...creds, login: 'abc' })).toThrow(/numeric/)
    expect(() => connectionBody({ ...creds, password: '' })).toThrow(/password/)
    expect(() => connectionBody({ ...creds, server: '  ' })).toThrow(/server/)
  })

  it('reads the worker login error only for the requested, inactive connection', () => {
    const list = (active: boolean, error: unknown, requested = 'c1') => ({
      connections: [{ id: 'c1', active }, { id: 'c2', active: false }],
      terminal: { requested_connection_id: requested, switching: true, error },
    })
    expect(loginError(list(false, 'Invalid account'), 'c1')).toBe('Invalid account')
    expect(loginError(list(true, 'old'), 'c1')).toBeNull()
    expect(loginError(list(false, { message: 'Bad server' }), 'c1')).toBe('Bad server')
    expect(loginError(list(false, 'Invalid account'), 'c2')).toBeNull()
    expect(loginError(list(false, 'Invalid account', 'c2'), 'c1')).toBeNull()
    expect(loginError(null, 'c1')).toBeNull()
  })

  it('keeps the shared terminal from GET /mt5/connections', async () => {
    const terminal = { requested_connection_id: 'c1', error: null }
    vi.stubGlobal('window', { aurumFetch: vi.fn().mockResolvedValue({ connections: [{ id: 'c1' }], terminal }) })
    await expect(new ApiClient('http://localhost:8000').connections()).resolves.toEqual({
      connections: [{ id: 'c1' }],
      terminal,
    })
    vi.unstubAllGlobals()
  })
})

describe('ApiClient', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stubFetch = () => {
    const fetch = Object.assign(vi.fn().mockResolvedValue({}), {
      raw: vi.fn().mockResolvedValue({ status: 202, _data: { id: 'c1' } }),
    })
    vi.stubGlobal('window', { aurumFetch: fetch })
    return fetch
  }

  it('scopes reads by connection_id and sends no API key', async () => {
    const fetch = stubFetch()
    const api = new ApiClient('http://localhost:8000')
    api.connectionId = 'c1'
    await api.plans(20, 'MONITORING')
    await api.positions()
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/trade-plans?limit=20&state=MONITORING&connection_id=c1')
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:8000/api/v1/positions?connection_id=c1')
    expect(fetch.mock.calls[0][1].headers).toEqual({})
  })

  it('returns the status code from POST /mt5/connections', async () => {
    stubFetch()
    const api = new ApiClient('http://localhost:8000')
    await expect(api.connect({})).resolves.toEqual({ status: 202, data: { id: 'c1' } })
  })
})
