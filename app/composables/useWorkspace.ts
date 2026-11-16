// Reactive workspace store — the Vue replacement for the original controller's
// global `state` object and imperative render() loop. A module-level singleton
// so every page/component/modal shares one source of truth; Vue reactivity takes
// the place of manual re-rendering.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { reactive, ref, readonly } from 'vue'
import {
  ApiClient,
  ApiError,
  errorMessage,
  executionBlocker,
  executionPayload,
  isFinal,
  tradeKind,
  type ExecutionValues,
} from '~/utils/api'
import { mergeRecords, eventView } from '~/utils/records'
import { stamp, uuid, money, sleep } from '~/utils/format'

export type RouteName =
  | 'market'
  | 'analysis'
  | 'plans'
  | 'positions'
  | 'activity'
  | 'performance'
  | 'connection'
  | 'api'

export const ROUTE_PATHS: Record<RouteName, string> = {
  market: '/',
  analysis: '/analysis',
  plans: '/plans',
  positions: '/positions',
  activity: '/activity',
  performance: '/performance',
  connection: '/connection',
  api: '/api',
}

export interface Upload {
  file: File
  preview: string
  tf: string
  captured: string
}

export interface ModalState {
  type: string
  [key: string]: any
}

type HistoryKind = 'analyses' | 'plans' | 'commands' | 'events'

interface WorkspaceState {
  route: RouteName
  analyses: any[]
  history: Partial<Record<HistoryKind, { limit: number; hasMore: boolean }>>
  health: any
  authFailed: boolean
  tf: string
  tab: string
  menu: boolean
  mode: 'demo' | 'api'
  api: ApiClient | null
  base: string
  connection: any
  connectMode: string
  historyOnly: boolean
  symbol: string
  spec: any
  account: any
  analysis: any
  plans: any[]
  positions: any[]
  pendingOrders: any[]
  commands: any[]
  events: any[]
  trades: any[]
  performance: any
  perfSource: string
  perfTimeframe: string
  uploads: Upload[]
  notes: string
  horizon: number
  scenario: string
  query: string
  page: number
  networkError: string
  analysing: boolean
  liveCandles: Record<string, any[]>
  updatedAt: string
  now: number
  balance: number
  brokerBackend: string
  aiBackend: string
  showLevels: boolean
  pendingKeys: Map<string, string>
}

const DEMO_EQUITY = 10000
const CONTRACT = 100 // XAUUSD: 100 oz per lot, used only for demo estimates

function sampleAnalysis(scenario = 'waiting', symbol = 'XAUUSD', tf = 'M15', horizon = 240) {
  const ready = scenario === 'ready'
  const blocked = scenario === 'blocked'
  const zone: [number, number] = [4030, 4033]
  const sl = 4021
  const tps = [4051, 4064]
  const reference = ready ? 4032.38 : (zone[0] + zone[1]) / 2
  const now = Date.now()
  return {
    id: 'ana-demo-' + uuid().slice(0, 8),
    created_at: stamp(),
    market_data_as_of: stamp(),
    expires_at: new Date(now + horizon * 60000).toISOString(),
    reassess_at: new Date(now + Math.min(30, horizon) * 60000).toISOString(),
    data: {
      symbol,
      timeframe: tf,
      horizon_minutes: horizon,
      outlook: 'BULLISH',
      decision: ready ? 'BUY' : 'WAIT',
      proposed_side: 'BUY',
      entry_method: ready ? 'MARKET' : 'CONDITIONAL',
      proposed_order_type: ready ? 'MARKET' : null,
      entry_condition: ready
        ? `Price is inside the entry zone after a confirmed ${tf} retest.`
        : `Wait for a closed ${tf} candle above 4,033, then a bullish retest of the entry zone.`,
      entry_zone: zone,
      entry_rule: ready
        ? null
        : { type: 'CLOSE_ABOVE_THEN_RETEST', breakout_level: 4033, retest_zone: zone, max_retest_bars: 4 },
      stop_loss: sl,
      take_profits: tps,
      invalidation: { type: 'CANDLE_CLOSE_BELOW', timeframe: tf, price: sl },
      reassess_after_minutes: 30,
      confidence: 'MEDIUM',
      reasons: ['H1 trend up: close above EMA20 > EMA50', `${tf} structure bullish (higher highs, higher lows)`],
      risk_flags: ['Spread 20 points vs ATR 3.1'],
      missing_data: ['economic_calendar'],
      execution_blockers: blocked ? ['ECONOMIC_CALENDAR_UNAVAILABLE'] : [],
      rationale: blocked
        ? 'The economic calendar is unavailable. The server must resolve this blocker before a trade can be submitted.'
        : 'The higher-timeframe structure remains constructive. A pullback into support may offer an entry, but a closed-candle confirmation is required. This is an illustrative demo setup, not a live signal.',
    },
    assessment: {
      entry: {
        method: ready ? 'MARKET' : 'CONDITIONAL',
        reference_entry: reference,
        required_trigger: ready
          ? 'Current quote inside entry_zone'
          : `Closed ${tf} candle beyond 4033, then a retest candle closing outside the zone within 4 bars`,
      },
      reward_risk: {
        reference_entry: reference,
        stop_loss: sl,
        take_profits: tps.map((price, index) => ({
          index,
          price,
          gross_reward_risk: (price - reference) / (reference - sl),
          net_reward_risk: null,
        })),
      },
      ai_confidence: { level: 'MEDIUM', calibrated: false },
      limitations: ['ECONOMIC_CALENDAR_UNAVAILABLE', 'VOLUME_IS_TICK_VOLUME_NOT_TRADED_VOLUME', 'DEMO_DATA'],
    },
    provenance: { model: 'Illustrative demo', market_data_as_of: stamp() },
  }
}

const state = reactive<WorkspaceState>({
  route: 'market',
  analyses: [],
  history: {},
  health: null,
  authFailed: false,
  tf: 'M15',
  tab: 'positions',
  menu: false,
  mode: 'demo',
  api: null,
  base: '',
  connection: null,
  connectMode: 'demo',
  historyOnly: false,
  symbol: 'XAUUSD',
  spec: null,
  account: {
    login: 10001,
    server: 'Aurum Practice',
    mode: 'demo',
    equity: 10017.98,
    currency: 'USD',
    trade_allowed: true,
  },
  analysis: null,
  plans: [],
  positions: [],
  pendingOrders: [],
  commands: [],
  events: [],
  trades: [],
  performance: null,
  perfSource: 'demo',
  perfTimeframe: '',
  uploads: [],
  notes: '',
  horizon: 240,
  scenario: 'waiting',
  query: '',
  page: 1,
  networkError: '',
  analysing: false,
  liveCandles: {},
  updatedAt: stamp(),
  now: Date.now(),
  balance: DEMO_EQUITY,
  brokerBackend: 'mock',
  aiBackend: 'mock',
  showLevels: true,
  pendingKeys: new Map(),
})

// Shared UI surfaces (toast + the single open modal) and transient busy/error.
const toastMessage = ref('')
const modal = ref<ModalState | null>(null)
const modalError = ref('')
const modalBusy = ref(false)
const analysisError = ref('')
const uploadError = ref('')
const historyBusy = reactive(new Set<string>())
const performanceBusy = ref(false)
const analysisCache = new Map<string, any>()

let toastTimer: ReturnType<typeof setTimeout> | undefined

function toast(message: string) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMessage.value = ''), 4500)
}

function notify(title: string, description: string, type = 'activity', status = '') {
  if (state.mode === 'api') return
  state.events.unshift({ id: uuid(), title, description, type, at: stamp(), state: status })
  state.events = state.events.slice(0, 100)
}

function initDemo() {
  state.mode = 'demo'
  state.analyses = []
  state.history = {}
  state.health = null
  state.authFailed = false
  state.balance = DEMO_EQUITY
  state.api = null
  state.connection = { id: 'conn-practice', mode: 'demo' }
  state.historyOnly = false
  state.symbol = 'XAUUSD'
  state.spec = { volume_min: 0.01, volume_max: 0.1, volume_step: 0.01, digits: 2, point: 0.01 }
  state.brokerBackend = 'mock'
  state.aiBackend = 'mock'
  state.liveCandles = {}
  state.networkError = ''
  state.account = {
    login: 10001,
    server: 'Aurum Practice',
    mode: 'demo',
    equity: 10017.98,
    currency: 'USD',
    trade_allowed: true,
  }
  state.analysis = sampleAnalysis('waiting', state.symbol, state.tf, state.horizon)
  state.positions = [
    { ticket: '108492731', symbol: 'XAUUSD', side: 'BUY', volume: 0.02, sl: 4014, tp: 4051, price_open: 4027.4, managed: true },
    { ticket: '108492618', symbol: 'XAUUSD', side: 'SELL', volume: 0.01, sl: 4053, tp: 4018, price_open: 4040.6, managed: true },
  ]
  state.pendingOrders = []
  const a = sampleAnalysis('waiting', state.symbol, state.tf, state.horizon)
  state.plans = [
    {
      id: 'plan-demo-4821',
      analysis_id: a.id,
      state: 'MONITORING',
      analysis: a,
      data: { sizing: { type: 'FIXED_LOTS', volume_lots: 0.01 }, take_profit_index: 0 },
      created_at: stamp(),
    },
  ]
  state.commands = []
  state.trades = []
  state.performance = null
  state.perfSource = 'demo'
  state.analyses = [state.analysis]
  state.events = [
    { title: 'Market analysis completed', description: 'M15 · Wait for a confirmed retest', type: 'spark', at: stamp(), state: 'WAIT' },
    { title: 'Trade plan is monitoring', description: 'XAUUSD · Buy on confirmation · 0.01 lots', type: 'plans', at: new Date(Date.now() - 4 * 60000).toISOString(), state: 'MONITORING' },
    { title: 'Practice position opened', description: 'XAUUSD · Buy 0.02 lots at 4,027.40', type: 'positions', at: new Date(Date.now() - 18 * 60000).toISOString(), state: 'FILLED' },
    { title: 'Practice terminal ready', description: 'Demo account 10001 · Synthetic market data', type: 'plug', at: new Date(Date.now() - 45 * 60000).toISOString(), state: 'CONNECTED' },
  ]
}

// ---- Market data ---------------------------------------------------------

function demoCandles(tf: string) {
  const TF = ['M5', 'M10', 'M15', 'M30', 'H1', 'H4']
  let seed = TF.indexOf(tf) + 3
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const bars: any[] = []
  let prev = 4008
  const sec = ({ M5: 300, M10: 600, M15: 900, M30: 1800, H1: 3600, H4: 14400 } as any)[tf]
  const end = Math.floor(Date.now() / 1000 / sec) * sec
  for (let i = 0; i < 66; i++) {
    const target = 4008 + i * 0.44 + Math.sin(i * 0.16) * 7 + Math.sin(i * 0.46) * 2
    const open = prev
    const close = target + (rnd() - 0.5) * 4
    const high = Math.max(open, close) + rnd() * 3.1
    const low = Math.min(open, close) - rnd() * 3.3
    bars.push({ time: end - (66 - i) * sec, open, high, low, close, tick_volume: 80 + Math.floor(rnd() * 360) })
    prev = close
  }
  const d = 4032.18 - bars[bars.length - 1].close
  for (const b of bars) {
    b.open += d
    b.close += d
    b.low += d
    b.high += d
  }
  return bars
}

function chartBars(tf = state.tf) {
  return state.mode === 'demo' ? demoCandles(tf) : state.liveCandles[tf] || []
}

function quote() {
  if (state.mode === 'api') return state.health?.quote ?? null
  return { bid: 4032.18, ask: 4032.38, spread: 0.2, spread_points: 20, age_seconds: 0 }
}

function currentPrice() {
  if (state.mode === 'api') return state.health?.quote?.bid ?? state.liveCandles[state.tf]?.at(-1)?.close ?? NaN
  return 4032.18
}

function pnl(p: any) {
  if (state.mode === 'api') return Number.isFinite(p.profit) ? p.profit : NaN
  return (currentPrice() - p.price_open) * (p.side === 'BUY' ? 1 : -1) * p.volume * CONTRACT
}

function exposureBlocked() {
  return !!state.health?.new_exposure_blocked || state.commands.some((c) => c.state === 'UNKNOWN')
}

// Why trading actions are unavailable right now, independent of any analysis.
function sessionBlocker(): string | null {
  if (state.mode !== 'api') return null
  if (state.authFailed) return 'The API key was rejected. Reconnect to continue.'
  if (!state.connection || state.historyOnly) return 'Trading is paused until the MT5 worker is running and the account is linked.'
  if (state.networkError) return 'Restore the terminal connection before submitting a new entry.'
  if (!state.account.trade_allowed) return 'The terminal or account has disabled trading.'
  return null
}

// ---- Navigation ----------------------------------------------------------

function go(route: RouteName) {
  navigateTo(ROUTE_PATHS[route])
}

function setTimeframe(tf: string) {
  state.tf = tf
  if (state.mode === 'api') refreshData(true)
}

function setHorizon(horizon: number) {
  state.horizon = horizon
}

function toggleLevels() {
  state.showLevels = !state.showLevels
  toast(state.showLevels ? 'Analysis price levels shown.' : 'Analysis price levels hidden.')
}

// ---- Modal plumbing ------------------------------------------------------

function openModal(m: ModalState) {
  modalError.value = ''
  modalBusy.value = false
  modal.value = m
}

function closeModal() {
  modal.value = null
  modalError.value = ''
  modalBusy.value = false
}

function formError(error: unknown) {
  modalError.value = errorMessage(error)
}

// ---- Idempotency ---------------------------------------------------------

// One key per operation + payload, reused on manual retry until the server
// reports a final, non-UNKNOWN outcome for it.
function commandKey(kind: string, body: any) {
  const signature = kind + JSON.stringify(body)
  const previous = state.pendingKeys.get(signature)
  const known = state.commands.find((c) => c.idempotency_key === previous)
  if (known && isFinal(known) && known.state !== 'UNKNOWN') state.pendingKeys.delete(signature)
  if (!state.pendingKeys.has(signature)) state.pendingKeys.set(signature, uuid())
  return state.pendingKeys.get(signature)!
}

function keepCommand(c: any) {
  const i = state.commands.findIndex((x) => x.id === c.id)
  if (i >= 0) state.commands[i] = { ...state.commands[i], ...c }
  else state.commands.unshift(c)
}

function finishDemoCommand(command: any, finish: () => string) {
  setTimeout(() => {
    if (state.mode !== 'demo' || !state.commands.some((c) => c.id === command.id)) return
    if (command.state === 'CANCELLED') return
    const title = finish()
    command.final = true
    notify(title, `${state.symbol} · ${command.id}`, 'check', command.state)
    keepCommand(command)
    toast(title + '. Simulated execution only.')
  }, 1400)
}

// ---- Connection + sync ---------------------------------------------------

let refreshEpoch = 0
let syncTick = 0

const limitOf = (kind: HistoryKind, fallback = 20) => state.history[kind]?.limit ?? fallback

function keepHistory(kind: HistoryKind, rows: any[]) {
  const limit = limitOf(kind)
  ;(state as any)[kind] = mergeRecords((state as any)[kind], rows)
  state.history[kind] = { limit, hasMore: rows.length >= limit && limit < 200 }
}

async function bindConnection(api: ApiClient) {
  state.connection = await api.connect(state.connectMode)
  state.historyOnly = false
}

// Plans only carry analysis_id; attach the saved analysis so cards can show levels.
async function attachPlanAnalyses(api: ApiClient, epoch: number) {
  const missing: string[] = []
  for (const plan of state.plans) {
    if (plan.analysis) continue
    const known = state.analyses.find((a) => a.id === plan.analysis_id) ?? analysisCache.get(plan.analysis_id)
    if (known) plan.analysis = known
    else missing.push(plan.analysis_id)
  }
  const fetched = await Promise.allSettled([...new Set(missing)].slice(0, 5).map((id) => api.analysis(id)))
  if (epoch !== refreshEpoch) return
  for (const r of fetched) {
    if (r.status !== 'fulfilled') continue
    analysisCache.set(r.value.id, r.value)
    for (const plan of state.plans) if (plan.analysis_id === r.value.id) plan.analysis = r.value
  }
}

// Tiered sync: snapshot data (health, account, positions, pending) every tick;
// history lists every other tick, or every tick while something is in flight;
// analyses and candles every sixth tick or on demand. `full` loads everything.
async function refreshData(quiet = false, full = false) {
  if (state.mode === 'demo') {
    if (!quiet) toast('Practice terminal ready. Prices are illustrative.')
    return
  }
  const epoch = ++refreshEpoch
  const api = state.api!
  const tick = ++syncTick
  const tf = state.tf
  const hot =
    state.commands.some((c) => !isFinal(c)) || state.plans.some((p) => ['MONITORING', 'QUEUED'].includes(p.state))
  const every = (n: number) => full || !quiet || tick % n === 0
  try {
    const health = await api.workerHealth()
    if (epoch !== refreshEpoch || api !== state.api) return
    state.health = health
    state.brokerBackend = health.broker_backend
    state.aiBackend = health.ai_backend
    if (health.fresh && !state.connection) await bindConnection(api)
    const conn = state.connection?.id
    const live = health.fresh && !!conn
    const jobs: Record<string, Promise<any> | null> = {
      status: live ? api.status() : null,
      positions: live ? api.positions(conn) : null,
      pending: live ? api.pendingOrders(conn) : null,
      plans: every(hot ? 1 : 2) ? api.plans(limitOf('plans')) : null,
      commands: every(hot ? 1 : 2) ? api.commands(limitOf('commands')) : null,
      events: every(2) ? api.audit(limitOf('events', 50)) : null,
      analyses: every(6) ? api.analyses(limitOf('analyses')) : null,
      candles: live && (every(6) || !state.liveCandles[tf]) ? api.candles(conn, tf) : null,
    }
    const keys = Object.keys(jobs)
    const results = await Promise.allSettled(keys.map((k) => jobs[k]))
    if (epoch !== refreshEpoch || api !== state.api) return
    let firstError: unknown = null
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        firstError ??= r.reason
        return
      }
      const v = r.value
      if (v == null) return
      switch (keys[i]) {
        case 'status':
          state.account = v.account
          break
        case 'positions':
          state.positions = v.positions
          break
        case 'pending':
          state.pendingOrders = v.orders
          break
        case 'plans':
          keepHistory('plans', v.plans)
          break
        case 'commands':
          keepHistory('commands', v.commands)
          break
        case 'events': {
          const limit = limitOf('events', 50)
          state.events = mergeRecords(state.events, v.events.map(eventView))
          state.history.events = { limit, hasMore: v.events.length >= limit && limit < 500 }
          break
        }
        case 'analyses':
          keepHistory('analyses', v.analyses)
          break
        case 'candles':
          state.liveCandles[tf] = v.closed_candles
          break
      }
    })
    if (!state.analysis && state.analyses.length) state.analysis = state.analyses[0]
    else if (state.analysis) {
      const latest = state.analyses.find((a) => a.id === state.analysis.id)
      if (latest && latest !== state.analysis) state.analysis = { ...state.analysis, ...latest }
    }
    await attachPlanAnalyses(api, epoch)
    if (epoch !== refreshEpoch) return
    state.updatedAt = health.snapshot_updated_at || stamp()
    state.authFailed = firstError instanceof ApiError && firstError.status === 401
    state.networkError = firstError
      ? errorMessage(firstError)
      : health.fresh
        ? ''
        : 'The MT5 worker snapshot is stale. Check the Windows terminal and worker. History is still available.'
    if (!quiet) toast(firstError ? 'Refresh finished with errors.' : 'Workspace refreshed.')
  } catch (error) {
    if (epoch !== refreshEpoch || api !== state.api) return
    state.networkError = errorMessage(error)
    state.authFailed = error instanceof ApiError && error.status === 401
  }
}

async function loadHistory(kind: HistoryKind) {
  if (state.mode !== 'api') return
  const fallback = kind === 'events' ? 50 : 20
  const max = kind === 'events' ? 500 : 200
  state.history[kind] = { limit: Math.min(max, limitOf(kind, fallback) + fallback), hasMore: false }
  historyBusy.add(kind)
  try {
    await refreshData(true, true)
  } finally {
    historyBusy.delete(kind)
  }
}

function defaultPerfSource() {
  if (state.brokerBackend === 'mock') return 'mock'
  return state.account.mode === 'real' ? 'live' : 'demo'
}

async function loadPerformance() {
  if (state.mode !== 'api') return
  performanceBusy.value = true
  try {
    const source = state.perfSource
    const [performance, trades] = await Promise.all([
      state.api!.performance({ source, timeframe: state.perfTimeframe || undefined }),
      state.api!.trades(100, undefined, source),
    ])
    state.performance = performance
    state.trades = trades.trades
  } catch (error) {
    toast(errorMessage(error))
  } finally {
    performanceBusy.value = false
  }
}

async function connectApi(values: { base: string; key: string; mode: string }) {
  const { base, key, mode } = values
  modalError.value = ''
  try {
    if (!base) throw new Error('Enter your FastAPI base URL.')
    if (key.length < 32) throw new Error('Enter your server API key (at least 32 characters).')
    const api = new ApiClient(base, key)
    modalBusy.value = true
    await api.health()
    const health = await api.workerHealth()
    let connection: any = null
    let account: any = null
    if (health.fresh) {
      const status = await api.status()
      if (status.account.mode !== mode) throw new Error('Selected account mode does not match the MT5 terminal.')
      connection = await api.connect(mode)
      account = status.account
    }
    const symbols = await api.symbols().catch(() => null)
    state.api = api
    state.mode = 'api'
    state.base = api.base
    state.connection = connection
    state.connectMode = mode
    state.historyOnly = !connection
    state.health = health
    state.brokerBackend = health.broker_backend
    state.aiBackend = health.ai_backend
    state.account = account || { login: '—', server: '—', mode, equity: NaN, currency: 'USD', trade_allowed: false }
    state.symbol = symbols?.symbols?.[0] ?? 'XAUUSD'
    state.spec = symbols?.specification ?? null
    state.analysis = null
    state.analyses = []
    state.history = {}
    state.authFailed = false
    state.networkError = ''
    state.plans = []
    state.positions = []
    state.pendingOrders = []
    state.commands = []
    state.events = []
    state.trades = []
    state.performance = null
    state.perfSource = defaultPerfSource()
    state.liveCandles = {}
    analysisCache.clear()
    closeModal()
    toast(
      connection
        ? 'API connected. Saved workspace restored.'
        : 'History restored. Trading is paused until the worker reconnects.',
    )
    await refreshData(true, true)
  } catch (e) {
    modalBusy.value = false
    formError(e)
  }
}

// ---- Trade + position actions -------------------------------------------

function reviewTrade() {
  const analysis = state.analysis
  if (!analysis) {
    go('analysis')
    return
  }
  const kind = tradeKind(analysis)
  let blocker = executionBlocker(analysis, state.now)
  if (!blocker && !kind) blocker = 'This analysis does not propose a trade.'
  if (exposureBlocked())
    blocker = 'An execution outcome is unknown. Reconcile the existing command before another entry.'
  blocker = sessionBlocker() ?? blocker
  const reserved =
    state.mode === 'api'
      ? !!analysis.eligibility?.reserved_for
      : state.plans.some((p) => p.analysis_id === analysis.id) ||
        state.commands.some((c) => c.kind === 'OPEN' && c.data?.analysis_id === analysis.id)
  if (reserved) blocker = 'This analysis is already reserved for a trade. Run a fresh analysis for another entry.'
  openModal({ type: 'review-trade', kind: kind ?? 'plan', blocker })
}

function demoLots(sizing: any, entry: number, stop: number) {
  if (sizing.type === 'FIXED_LOTS') return sizing.volume_lots
  const budget = sizing.type === 'RISK_PERCENT' ? (state.balance * sizing.risk_percent) / 100 : sizing.risk_amount
  return Math.floor((budget / (Math.abs(entry - stop) * CONTRACT)) * 100) / 100
}

// Same shape as POST /orders/preview so the review renders one way in both modes.
function demoPreview(body: any) {
  const a = state.analysis.data
  const entry = body.order_type === 'MARKET' ? quote()!.ask : body.price
  const volume = demoLots(body.sizing, entry, a.stop_loss)
  const tp = a.take_profits[body.take_profit_index]
  const stop = Math.abs(entry - a.stop_loss)
  const target = Math.abs(tp - entry)
  const loss = stop * volume * CONTRACT
  const rejections: { code: string; message: string }[] = []
  if (volume < 0.01) rejections.push({ code: 'VOLUME_TOO_SMALL', message: 'Sizing resolves below the 0.01 lot minimum' })
  if (volume > 0.1) rejections.push({ code: 'VOLUME_EXCEEDS_LIMIT', message: 'Volume exceeds the 0.10 lot demo limit' })
  if ((loss / state.balance) * 100 > 1)
    rejections.push({ code: 'RISK_EXCEEDED', message: 'Stop-loss risk exceeds the 1% demo limit' })
  return {
    valid: !rejections.length,
    order: {
      order_type: body.order_type,
      volume,
      estimated_execution_price: entry,
      stop_loss: a.stop_loss,
      take_profit: tp,
      spread_points: 20,
      risk: {
        currency: 'USD',
        estimated_loss: loss,
        estimated_profit: target * volume * CONTRACT,
        risk_percent_of_equity: (loss / state.balance) * 100,
        gross_reward_risk: target / stop,
      },
    },
    warnings: [],
    rejections,
    note: 'Demo estimate. No broker data is used.',
  }
}

async function previewTrade(values: ExecutionValues, signal?: AbortSignal) {
  const body = executionPayload(state.analysis, state.connection.id, values, 'order')
  if (state.mode === 'demo') return demoPreview(body)
  return state.api!.preview(body, signal)
}

async function submitTrade(kind: 'plan' | 'order', values: ExecutionValues) {
  const analysis = state.analysis
  try {
    const session = sessionBlocker()
    if (session) throw new Error(session)
    if (state.mode === 'api' && exposureBlocked())
      throw new Error('Resolve the unknown execution before submitting a new entry.')
    const block = executionBlocker(analysis, Date.now())
    if (block) throw new Error(block)
    const body = executionPayload(analysis, state.connection.id, values, kind)
    const demoCheck = state.mode === 'demo' && kind === 'order' ? demoPreview(body) : null
    if (demoCheck && !demoCheck.valid) throw new Error(demoCheck.rejections[0]?.message + '.')
    const sizeLabel = sizingLabel(body.sizing)
    modalBusy.value = true
    if (kind === 'plan') {
      let plan: any
      if (state.mode === 'api') plan = await state.api!.createPlan(body)
      else {
        await sleep(700)
        plan = { id: 'plan-' + uuid().slice(0, 8), analysis_id: analysis.id, data: body, state: 'MONITORING', created_at: stamp() }
      }
      plan.analysis = analysis
      state.plans = mergeRecords(state.plans, [plan])
      if (analysis.eligibility) analysis.eligibility.reserved_for = 'PLAN'
      notify('Trade plan is monitoring', `${state.symbol} · ${analysis.data.proposed_side} ${sizeLabel}`, 'plans', 'MONITORING')
      closeModal()
      go('plans')
      toast('Trade plan created. No position has been opened.')
    } else {
      let command: any
      if (state.mode === 'api') command = await state.api!.order(body, commandKey('ORDER', body))
      else {
        await sleep(600)
        command = { id: 'cmd-' + uuid().slice(0, 8), kind: 'OPEN', state: 'QUEUED', final: false, data: body, created_at: stamp() }
      }
      keepCommand(command)
      if (analysis.eligibility) analysis.eligibility.reserved_for = 'ORDER'
      notify('Order request queued', `${state.symbol} · ${analysis.data.proposed_side} ${sizeLabel}`, 'clock', 'QUEUED')
      closeModal()
      go('activity')
      toast('Order queued. Waiting for the broker outcome.')
      if (state.mode === 'demo')
        finishDemoCommand(command, () => {
          const preview = demoPreview(body)
          const p = {
            ticket: String(108500000 + Math.floor(Math.random() * 9999)),
            symbol: state.symbol,
            side: body.side,
            volume: preview.order.volume,
            sl: analysis.data.stop_loss,
            tp: analysis.data.take_profits[body.take_profit_index],
            price_open: preview.order.estimated_execution_price,
            managed: true,
          }
          state.positions.push(p)
          command.state = 'FILLED'
          command.result = { state: 'FILLED', position_ticket: p.ticket, filled_volume: p.volume, mock: true }
          return 'Demo order filled'
        })
    }
  } catch (e) {
    modalBusy.value = false
    formError(e)
  }
}

export function sizingLabel(sizing: any): string {
  if (!sizing) return '—'
  if (sizing.type === 'RISK_PERCENT') return `${sizing.risk_percent}% risk`
  if (sizing.type === 'RISK_AMOUNT') return `${money(sizing.risk_amount)} risk`
  return `${money(sizing.volume_lots)} lots`
}

async function positionMutation(
  kind: 'CLOSE' | 'PROTECTION',
  ticket: string,
  input: { closeMode?: string; partialVolume?: string; sl?: string; tp?: string; allowWider?: boolean },
) {
  const p = state.positions.find((x) => x.ticket === ticket)
  if (!p) return
  try {
    if (state.mode === 'api' && (state.authFailed || !state.connection))
      throw new Error('Reconnect to the API before changing a position.')
    let body: any
    if (kind === 'CLOSE') {
      const volume = input.closeMode === 'full' ? null : Number(input.partialVolume)
      if (volume !== null && (!Number.isFinite(volume) || volume <= 0 || volume >= p.volume))
        throw new Error('Enter a partial volume greater than zero and smaller than the position. Use full close for the rest.')
      const step = state.spec?.volume_step
      if (volume !== null && step && Math.abs(volume / step - Math.round(volume / step)) > 1e-6)
        throw new Error(`Close volume must use ${step}-lot increments.`)
      body = { connection_id: state.connection.id, volume_lots: volume, max_deviation_points: 20 }
    } else {
      const sl = Number(input.sl)
      const tp = Number(input.tp)
      if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0)
        throw new Error('Enter valid positive SL and TP prices.')
      const price = currentPrice()
      if (
        Number.isFinite(price) &&
        !(p.side === 'BUY' ? sl < price && tp > price : tp < price && sl > price)
      )
        throw new Error(
          p.side === 'BUY'
            ? 'For this BUY, SL must be below and TP above the current price.'
            : 'For this SELL, TP must be below and SL above the current price.',
        )
      body = { connection_id: state.connection.id, stop_loss: sl, take_profit: tp, allow_wider_stop: !!input.allowWider }
    }
    modalBusy.value = true
    let command: any
    if (state.mode === 'api')
      command =
        kind === 'CLOSE'
          ? await state.api!.close(ticket, body, commandKey(kind + ticket, body))
          : await state.api!.protection(ticket, body, commandKey(kind + ticket, body))
    else {
      await sleep(600)
      command = { id: 'cmd-' + uuid().slice(0, 8), kind, state: 'QUEUED', final: false, data: { ...body, ticket }, created_at: stamp() }
    }
    keepCommand(command)
    notify(kind === 'CLOSE' ? 'Close request queued' : 'Protection update queued', `${p.symbol} · Ticket ${ticket}`, 'clock', 'QUEUED')
    closeModal()
    toast('Request queued. The position has not changed yet.')
    if (state.mode === 'demo')
      finishDemoCommand(command, () => {
        if (kind === 'CLOSE') {
          const volume = body.volume_lots ?? p.volume
          state.balance += (pnl(p) * volume) / p.volume
          p.volume = Math.max(0, Number((p.volume - volume).toFixed(2)))
          if (p.volume === 0) state.positions = state.positions.filter((x) => x.ticket !== ticket)
          command.state = p.volume === 0 ? 'CLOSED' : 'PARTIALLY_CLOSED'
          command.result = { closed_volume: volume, remaining_volume: p.volume, mock: true }
          return p.volume === 0 ? 'Demo position closed' : 'Demo position partially closed'
        }
        p.sl = body.stop_loss
        p.tp = body.take_profit
        command.state = 'UPDATED'
        command.result = { mock: true, position_ticket: ticket }
        return 'Demo protection updated'
      })
  } catch (e) {
    modalBusy.value = false
    formError(e)
  }
}

async function cancelPendingOrder(ticket: string) {
  try {
    modalBusy.value = true
    if (state.mode === 'api') {
      const body = { connection_id: state.connection.id }
      keepCommand(await state.api!.cancelPending(ticket, state.connection.id, commandKey('CANCEL_PENDING' + ticket, body)))
    } else {
      await sleep(400)
      state.pendingOrders = state.pendingOrders.filter((o) => o.ticket !== ticket)
    }
    closeModal()
    toast('Cancellation queued. The order stays live until the broker confirms.')
  } catch (error) {
    modalBusy.value = false
    formError(error)
  }
}

async function cancelPlan(id: string) {
  const p = state.plans.find((x) => x.id === id)
  if (!p) return
  try {
    modalBusy.value = true
    if (state.mode === 'api') Object.assign(p, await state.api!.cancelPlan(id))
    else {
      await sleep(500)
      p.state = 'CANCELLED'
    }
    notify('Trade plan cancelled', `${state.symbol} · No further entry monitoring`, 'pause', 'CANCELLED')
    closeModal()
    toast('Plan cancelled. Existing positions are unchanged.')
  } catch (e) {
    modalBusy.value = false
    formError(e)
  }
}

async function cancelQueued(id: string) {
  try {
    modalBusy.value = true
    const c = state.commands.find((x) => x.id === id)
    if (state.mode === 'api') Object.assign(c, await state.api!.cancelCommand(id))
    else {
      if (c.state !== 'QUEUED') throw new Error('The command has left the queue. Inspect its outcome.')
      c.state = 'CANCELLED'
      c.final = true
      const plan = state.plans.find((p) => p.id === c.data?.plan_id)
      if (plan) plan.state = 'CANCELLED'
    }
    closeModal()
    toast('Queued command cancelled before submission.')
  } catch (error) {
    modalBusy.value = false
    formError(error)
  }
}

function simulateTrigger(id: string) {
  const p = state.plans.find((x) => x.id === id)
  if (!p || p.state !== 'MONITORING' || state.mode !== 'demo') return
  p.state = 'QUEUED'
  const c = { id: 'cmd-demo-' + uuid().slice(0, 6), kind: 'OPEN', state: 'QUEUED', final: false, data: { analysis_id: p.analysis_id, plan_id: p.id }, created_at: stamp() }
  keepCommand(c)
  notify('Demo entry conditions simulated', 'Trade plan is queued for simulated execution.', 'plans', 'QUEUED')
  finishDemoCommand(c, () => {
    p.state = 'FILLED'
    c.state = 'FILLED'
    const a = p.analysis.data
    state.positions.push({
      ticket: String(108500000 + Math.floor(Math.random() * 9999)),
      symbol: state.symbol,
      side: a.proposed_side,
      volume: demoLots(p.data.sizing, 4032.18, a.stop_loss),
      sl: a.stop_loss,
      tp: a.take_profits[p.data.take_profit_index || 0],
      price_open: 4032.18,
      managed: true,
    })
    return 'Demo trade plan filled'
  })
}

// ---- Demo scenarios ------------------------------------------------------

function applyScenario(scenario: string) {
  if (state.mode !== 'demo') return
  state.scenario = scenario
  state.analysis = sampleAnalysis(scenario === 'unknown' ? 'waiting' : scenario, state.symbol, state.tf, state.horizon)
  state.analyses = mergeRecords(state.analyses, [state.analysis])
  if (scenario === 'unknown') {
    state.commands.unshift({
      id: 'cmd-unknown-' + uuid().slice(0, 6),
      kind: 'OPEN',
      state: 'UNKNOWN',
      final: true,
      data: {},
      created_at: stamp(),
      result: {
        request_tag: 'gold:demo-uncertain',
        error: 'The broker response was interrupted. Reconcile order and deal history before retrying.',
      },
    })
    go('activity')
  } else go('market')
  closeModal()
  toast('Demo scenario loaded: ' + scenario + '.')
}

function resetDemo() {
  initDemo()
  state.scenario = 'waiting'
  closeModal()
  go('market')
  toast('Demo workspace reset.')
}

function disconnect() {
  state.api = null
  initDemo()
  closeModal()
  toast('API session disconnected. Demo workspace restored.')
}

// ---- Analysis uploads + run ----------------------------------------------

async function addFiles(list: FileList) {
  const errors: string[] = []
  for (const file of Array.from(list)) {
    if (state.uploads.length >= 6) {
      errors.push('You can attach up to six screenshots.')
      break
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      errors.push(file.name + ': use PNG, JPEG or WebP.')
      continue
    }
    if (file.size > 8_000_000 || !file.size) {
      errors.push(file.name + ': file must be nonempty and no larger than 8 MB.')
      continue
    }
    const preview = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = preview
      await image.decode()
      if (Math.min(image.width, image.height) < 200 || image.width * image.height > 20_000_000)
        throw new Error('Use an image at least 200px per side and no larger than 20MP.')
      state.uploads.push({ file, preview, tf: state.tf, captured: new Date(file.lastModified || Date.now()).toISOString() })
    } catch (e: any) {
      URL.revokeObjectURL(preview)
      errors.push(file.name + ': ' + e.message)
    }
  }
  if (errors.length) uploadError.value = errors.join(' ')
  else {
    uploadError.value = ''
    toast('Screenshot added. Check its timeframe and actual capture time.')
  }
}

function removeUpload(i: number) {
  const upload = state.uploads[i]
  if (!upload) return
  URL.revokeObjectURL(upload.preview)
  state.uploads.splice(i, 1)
}

async function runAnalysis() {
  if (state.analysing) return
  if (state.mode === 'api' && (!state.connection || state.historyOnly)) {
    analysisError.value = 'Analysis needs a live MT5 snapshot. Start the worker, then try again.'
    return
  }
  for (const u of state.uploads) {
    const age = Date.now() - new Date(u.captured).getTime()
    if (!Number.isFinite(age) || age > 15 * 60000 || age < -30000) {
      analysisError.value = 'Confirm a capture time within the last 15 minutes for every screenshot.'
      return
    }
  }
  if (state.notes.length > 500) {
    analysisError.value = 'Keep notes to 500 characters or fewer.'
    return
  }
  state.analysing = true
  analysisError.value = ''
  try {
    let result: any
    if (state.mode === 'api') {
      const form = new FormData()
      form.append(
        'metadata',
        JSON.stringify({
          connection_id: state.connection.id,
          symbol: state.symbol,
          timeframe: state.tf,
          horizon_minutes: state.horizon,
          charts: state.uploads.map((u) => ({ timeframe: u.tf, captured_at: u.captured })),
          notes: state.notes.trim() || null,
        }),
      )
      state.uploads.forEach((u) => form.append('images', u.file, u.file.name))
      result = await state.api!.analyse(form)
    } else {
      await sleep(1600)
      result = sampleAnalysis(state.scenario === 'unknown' ? 'waiting' : state.scenario, state.symbol, state.tf, state.horizon)
    }
    state.analysis = result
    state.analyses = mergeRecords(state.analyses, [result])
    notify('Market analysis completed', `${state.symbol} · ${state.tf} · ${result.data.decision}`, 'spark', result.data.decision)
    state.analysing = false
    toast('Analysis complete. Review the setup and any blockers.')
  } catch (e) {
    state.analysing = false
    analysisError.value = errorMessage(e)
  }
}

async function selectAnalysis(id: string) {
  const local = state.analyses.find((a) => a.id === id)
  if (local) state.analysis = local
  if (state.mode === 'api') {
    try {
      state.analysis = await state.api!.analysis(id)
    } catch (error) {
      toast(errorMessage(error))
    }
  }
}

async function captureChart(svgSource: string) {
  try {
    if (state.mode === 'api' && !chartBars().length) throw new Error('Load broker candles before capturing a chart.')
    const source = svgSource
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replace(
        '<title',
        '<style>text{font-family:monospace;fill:#a0a9b7;font-size:9px}</style><rect width="900" height="385" fill="#14181e"/><title',
      )
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1800
    canvas.height = 770
    canvas.getContext('2d')!.drawImage(img, 0, 0, 1800, 770)
    URL.revokeObjectURL(url)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('Chart capture failed.')
    const file = new File([blob], `${state.symbol}-${state.tf}-${state.mode === 'demo' ? 'demo' : 'snapshot'}.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    })
    if (state.uploads.length >= 6) throw new Error('Remove a screenshot before adding another (maximum six).')
    state.uploads.push({ file, preview: URL.createObjectURL(file), tf: state.tf, captured: stamp() })
    go('analysis')
    toast('Chart captured. Review the timestamp before analysis.')
  } catch (e) {
    toast(errorMessage(e))
  }
}

// ---- Background sync lifecycle -------------------------------------------

let pollTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let polling = false
let listenersBound = false

async function poll() {
  if (state.mode === 'api' && !document.hidden && state.api && !state.authFailed) await refreshData(true)
}

function onVisibility() {
  if (!document.hidden && state.mode === 'api') refreshData(true)
}
function onOffline() {
  if (state.mode === 'api') state.networkError = 'Your device is offline'
}
function onOnline() {
  if (state.mode === 'api') refreshData(true)
}

function startBackgroundSync() {
  if (listenersBound) return
  listenersBound = true
  pollTimer = setInterval(async () => {
    if (polling) return
    polling = true
    try {
      await poll()
    } finally {
      polling = false
    }
  }, 2500)
  clockTimer = setInterval(() => (state.now = Date.now()), 5000)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('offline', onOffline)
  window.addEventListener('online', onOnline)
}

function stopBackgroundSync() {
  if (!listenersBound) return
  listenersBound = false
  clearInterval(pollTimer)
  clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('online', onOnline)
}

let seeded = false
function ensureDemo() {
  if (seeded) return
  seeded = true
  initDemo()
}

export function useWorkspace() {
  return {
    state,
    toastMessage: readonly(toastMessage),
    modal,
    modalError,
    modalBusy,
    analysisError,
    uploadError,
    historyBusy,
    performanceBusy,
    // derived helpers
    chartBars,
    currentPrice,
    quote,
    pnl,
    demoCandles,
    executionBlocker,
    exposureBlocked,
    sessionBlocker,
    // navigation
    go,
    setTimeframe,
    setHorizon,
    toggleLevels,
    // modal plumbing
    openModal,
    closeModal,
    toast,
    // lifecycle
    ensureDemo,
    startBackgroundSync,
    stopBackgroundSync,
    // actions
    connectApi,
    disconnect,
    refreshData,
    loadHistory,
    loadPerformance,
    reviewTrade,
    previewTrade,
    submitTrade,
    positionMutation,
    cancelPendingOrder,
    cancelPlan,
    cancelQueued,
    simulateTrigger,
    applyScenario,
    resetDemo,
    addFiles,
    removeUpload,
    runAnalysis,
    selectAnalysis,
    captureChart,
  }
}
