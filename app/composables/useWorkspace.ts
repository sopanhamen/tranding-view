// Reactive workspace store — the Vue replacement for the original controller's
// global `state` object and imperative render() loop. A module-level singleton
// so every page/component/modal shares one source of truth; Vue reactivity takes
// the place of manual re-rendering.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { reactive, ref, readonly } from 'vue'
import {
  ApiClient,
  TERMINAL_STATES,
  executionBlocker,
  executionPayload,
} from '~/utils/api'
import { mergeRecords, eventView } from '~/utils/records'
import { stamp, uuid, money, sleep } from '~/utils/format'

export type RouteName =
  | 'market'
  | 'analysis'
  | 'plans'
  | 'positions'
  | 'activity'
  | 'connection'
  | 'api'

export const ROUTE_PATHS: Record<RouteName, string> = {
  market: '/',
  analysis: '/analysis',
  plans: '/plans',
  positions: '/positions',
  activity: '/activity',
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

interface WorkspaceState {
  route: RouteName
  analyses: any[]
  history: Record<string, { total: number; hasMore: boolean }>
  quote: any
  configuration: any
  unresolvedCount: number
  authFailed: boolean
  tf: string
  tab: string
  menu: boolean
  mode: 'demo' | 'api'
  api: ApiClient | null
  base: string
  connection: any
  symbol: string
  account: any
  analysis: any
  plans: any[]
  positions: any[]
  commands: any[]
  events: any[]
  uploads: Upload[]
  horizon: number
  scenario: string
  query: string
  page: number
  networkError: string
  analysing: boolean
  liveCandles: Record<string, any[]>
  updatedAt: string
  balance: number
  brokerBackend: string
  showLevels: boolean
  pendingKeys: Map<string, string>
}

function sampleAnalysis(scenario = 'waiting', symbol = 'XAUUSD', tf = 'M15', horizon = 240) {
  const blocked = scenario === 'blocked'
  const buy = scenario === 'ready'
  return {
    id: 'ana-demo-' + uuid().slice(0, 8),
    created_at: stamp(),
    expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    reassess_at: new Date(Date.now() + 30 * 60000).toISOString(),
    data: {
      symbol,
      timeframe: tf,
      horizon_minutes: horizon,
      bias: 'bullish',
      action: buy ? 'BUY' : 'WAIT',
      proposed_side: 'BUY',
      entry_condition: `Wait for a closed ${tf} candle above 4,033, then a bullish retest of the entry zone.`,
      entry_zone: [4030, 4033],
      entry_rule: {
        type: 'CLOSE_ABOVE_THEN_RETEST',
        breakout_level: 4033,
        retest_zone: [4030, 4033],
        max_retest_bars: 4,
      },
      stop_loss: 4021,
      take_profits: [4051, 4064],
      invalidation: { type: 'CANDLE_CLOSE_BELOW', timeframe: tf, price: 4021 },
      reassess_after_minutes: 30,
      missing_data: ['economic_calendar'],
      execution_blockers: blocked ? ['ECONOMIC_CALENDAR_UNAVAILABLE'] : [],
      rationale: blocked
        ? 'The economic calendar is unavailable. The server must resolve this blocker before a trade can be submitted.'
        : 'The higher-timeframe structure remains constructive. A pullback into support may offer an entry, but a closed-candle confirmation is required. This is an illustrative demo setup, not a live signal.',
    },
    provenance: { model: 'Illustrative demo', market_data_as_of: stamp() },
  }
}

const state = reactive<WorkspaceState>({
  route: 'market',
  analyses: [],
  history: {},
  quote: null,
  configuration: null,
  unresolvedCount: 0,
  authFailed: false,
  tf: 'M15',
  tab: 'positions',
  menu: false,
  mode: 'demo',
  api: null,
  base: '',
  connection: null,
  symbol: 'XAUUSD',
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
  commands: [],
  events: [],
  uploads: [],
  horizon: 240,
  scenario: 'waiting',
  query: '',
  page: 1,
  networkError: '',
  analysing: false,
  liveCandles: {},
  updatedAt: stamp(),
  balance: 10000,
  brokerBackend: 'mock',
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
  state.quote = null
  state.configuration = null
  state.unresolvedCount = 0
  state.authFailed = false
  state.balance = 10000
  state.api = null
  state.connection = { id: 'conn-practice', mode: 'demo' }
  state.symbol = 'XAUUSD'
  state.brokerBackend = 'mock'
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
    { ticket: '108492731', symbol: 'XAUUSD', side: 'BUY', volume: 0.02, sl: 4014, tp: 4051, price_open: 4027.4, magic: 261026 },
    { ticket: '108492618', symbol: 'XAUUSD', side: 'SELL', volume: 0.01, sl: 4053, tp: 4018, price_open: 4040.6, magic: 261026 },
  ]
  const a = sampleAnalysis('waiting', state.symbol, state.tf, state.horizon)
  state.plans = [
    {
      id: 'plan-demo-4821',
      analysis_id: a.id,
      state: 'MONITORING',
      analysis: a,
      data: { sizing: { volume_lots: 0.01 }, take_profit_index: 0 },
      created_at: stamp(),
    },
  ]
  state.commands = []
  state.analyses = [state.analysis]
  state.events = [
    { title: 'Market analysis completed', description: 'M15 + H1 · Waiting for a confirmed retest', type: 'spark', at: stamp(), state: 'WAIT' },
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

function currentPrice() {
  if (state.mode === 'api')
    return state.quote?.bid ?? state.liveCandles[state.tf]?.at(-1)?.close ?? NaN
  const bars = state.liveCandles[state.tf]
  return bars?.length ? bars.at(-1)!.close : 4032.18
}

function pnl(p: any) {
  return (currentPrice() - p.price_open) * (p.side === 'BUY' ? 1 : -1) * p.volume * 100
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

function formError(message: string) {
  modalError.value = message
}

// ---- Idempotency ---------------------------------------------------------

function commandKey(kind: string, body: any) {
  const signature = kind + JSON.stringify(body)
  const previous = state.pendingKeys.get(signature)
  const known = state.commands.find((c) => c.idempotency_key === previous)
  if (known && TERMINAL_STATES.has(known.state) && known.state !== 'UNKNOWN')
    state.pendingKeys.delete(signature)
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
    notify(title, `${state.symbol} · ${command.id}`, 'check', command.state)
    keepCommand(command)
    toast(title + '. Simulated execution only.')
  }, 1400)
}

// ---- Connection + sync ---------------------------------------------------

let refreshEpoch = 0

function applyWorkspace(data: any) {
  state.configuration = data.configuration
  if (data.account) state.account = data.account
  state.quote = data.quote
  state.positions = data.positions
  state.updatedAt = data.updated_at || state.updatedAt
  state.unresolvedCount = data.unresolved_count
  for (const [name, key] of [
    ['analyses', 'analyses'],
    ['plans', 'plans'],
    ['commands', 'commands'],
    ['events', 'events'],
  ] as const) {
    const incoming = name === 'events' ? data[key].items.map(eventView) : data[key].items
    ;(state as any)[name] = mergeRecords((state as any)[name], incoming)
    state.history[name] = {
      total: data[key].total,
      hasMore: (state as any)[name].length < data[key].total,
    }
  }
  if (!state.analysis && state.analyses.length) state.analysis = state.analyses[0]
  else if (state.analysis) {
    const latest = state.analyses.find((a) => a.id === state.analysis.id)
    if (latest) state.analysis = latest
  }
  state.authFailed = false
  state.networkError = data.stale
    ? 'The worker snapshot is stale. Check the Windows terminal and worker.'
    : data.quote && !data.quote.fresh
      ? 'No recent broker quote is available. The market may be closed.'
      : ''
  state.page = Math.min(
    state.page,
    Math.max(
      1,
      Math.ceil(
        state.positions.filter((p) =>
          `${p.symbol} ${p.ticket} ${p.side}`.toLowerCase().includes(state.query.toLowerCase()),
        ).length / 8,
      ),
    ),
  )
}

async function refreshData(quiet = false) {
  if (state.mode === 'demo') {
    if (!quiet) toast('Practice terminal ready. Prices are illustrative.')
    return
  }
  const epoch = ++refreshEpoch
  const api = state.api!
  const connection = state.connection.id
  const tf = state.tf
  try {
    const data = await api.workspace(connection)
    if (epoch !== refreshEpoch || api !== state.api) return
    applyWorkspace(data)
    const recentPlans = new Set(data.plans.items.map((p: any) => p.id))
    const recentCommands = new Set(data.commands.items.map((c: any) => c.id))
    const watchers = [
      ...state.plans
        .filter((p) => !recentPlans.has(p.id) && ['MONITORING', 'QUEUED', 'SUBMITTING'].includes(p.state))
        .map((p) => ({ row: p, read: () => api.plan(p.id) })),
      ...state.commands
        .filter((c) => !recentCommands.has(c.id) && !TERMINAL_STATES.has(c.state))
        .map((c) => ({ row: c, read: () => api.command(c.id) })),
    ]
    for (const watch of watchers) {
      const fresh = await watch.read()
      if (epoch !== refreshEpoch || api !== state.api) return
      Object.assign(watch.row, fresh)
    }
    if (!data.stale) {
      const candles = await api.candles(connection, tf)
      if (epoch !== refreshEpoch || api !== state.api) return
      state.liveCandles[tf] = candles.closed_candles
    }
    if (!quiet) toast('Workspace and account history refreshed.')
  } catch (error: any) {
    if (epoch !== refreshEpoch || api !== state.api) return
    state.networkError = error.message
    state.authFailed = error.message.startsWith('401:')
  }
}

async function loadHistory(kind: string) {
  if (state.mode !== 'api') return
  const routes: Record<string, string> = {
    analyses: 'analyses',
    plans: 'trade-plans',
    commands: 'commands',
    events: 'activity',
  }
  try {
    historyBusy.add(kind)
    const result = await state.api!.list(routes[kind], state.connection.id, (state as any)[kind].length)
    ;(state as any)[kind] = mergeRecords(
      (state as any)[kind],
      kind === 'events' ? result.items.map(eventView) : result.items,
    )
    state.history[kind] = { total: result.total, hasMore: (state as any)[kind].length < result.total }
  } catch (error: any) {
    toast(error.message)
  } finally {
    historyBusy.delete(kind)
  }
}

async function connectApi(values: { base: string; key: string; mode: string }) {
  const { base, mode } = values
  const key = values.key
  modalError.value = ''
  try {
    if (!base) throw new Error('Enter your FastAPI base URL.')
    if (key.length < 32) throw new Error('Enter your server API key (at least 32 characters).')
    const api = new ApiClient(base, key)
    modalBusy.value = true
    const [, configuration] = await Promise.all([api.health(), api.request('/api/v1/configuration')])
    let connection: any
    let status: any
    let historyOnly = false
    try {
      status = await api.status()
    } catch (error: any) {
      if (!error.message.startsWith('503:')) throw error
      const saved = await api.request('/api/v1/mt5/connections')
      const matches = saved.items.filter((c: any) => c.mode === mode)
      if (matches.length !== 1)
        throw new Error(
          'Start the worker to select the configured account safely. History-only reconnect needs exactly one saved account in this mode.',
        )
      connection = matches[0]
      historyOnly = true
    }
    if (!historyOnly) {
      if (status.account.mode !== mode)
        throw new Error('Selected account mode does not match the MT5 terminal.')
      connection = await api.connect(mode)
    }
    const initial = await api.workspace(connection.id)
    state.api = api
    state.mode = 'api'
    state.base = api.base
    state.connection = connection
    state.account = initial.account || {
      login: connection.login,
      server: connection.server,
      mode: connection.mode,
      equity: NaN,
      currency: 'USD',
      trade_allowed: false,
    }
    state.symbol = configuration.symbol
    state.brokerBackend = configuration.broker_backend
    state.analysis = null
    state.analyses = []
    state.history = {}
    state.quote = null
    state.configuration = configuration
    state.unresolvedCount = 0
    state.authFailed = false
    state.plans = []
    state.commands = []
    state.events = []
    state.liveCandles = {}
    applyWorkspace(initial)
    closeModal()
    toast(
      historyOnly
        ? 'History restored. Trading is paused until the worker reconnects.'
        : 'API connected. Saved workspace restored.',
    )
    if (!initial.stale) await refreshData(true)
  } catch (e: any) {
    modalBusy.value = false
    formError(
      e.message.includes('fetch')
        ? 'Cannot reach the API. Check its URL, HTTPS, CORS and worker status.'
        : e.message,
    )
  }
}

// ---- Trade + position actions -------------------------------------------

function reviewTrade() {
  const analysis = state.analysis
  if (!analysis) {
    go('analysis')
    return
  }
  const a = analysis.data
  const kind = ['BUY', 'SELL'].includes(a.action) ? 'order' : 'plan'
  let blocker = executionBlocker(analysis, state.mode)
  if (state.unresolvedCount > 0 || state.commands.some((c) => c.state === 'UNKNOWN'))
    blocker = 'An execution outcome is unknown. Reconcile the existing command before another entry.'
  if (
    state.mode === 'api' &&
    (!state.account.trade_allowed ||
      (state.account.mode === 'real' && !state.configuration?.allow_real_trading))
  )
    blocker = 'The server or terminal has disabled trading for this account.'
  const reserved =
    state.plans.some((p) => p.analysis_id === analysis.id) ||
    state.commands.some((c) => c.kind === 'OPEN' && c.data?.analysis_id === analysis.id)
  if (reserved)
    blocker = 'This analysis is already reserved for a trade. Generate a fresh analysis for another entry.'
  openModal({ type: 'review-trade', kind, blocker })
}

async function submitTrade(kind: string, values: { lots: string; tp: string; spread: string; deviation: string }) {
  const analysis = state.analysis
  try {
    if (
      state.mode === 'api' &&
      (state.networkError || state.authFailed || state.unresolvedCount > 0 || !state.account.trade_allowed)
    )
      throw new Error(
        'Restore the terminal connection and resolve any unknown execution before submitting a new entry.',
      )
    const block = executionBlocker(analysis, state.mode)
    if (block) throw new Error(block)
    const body = executionPayload(analysis, state.connection.id, values, kind)
    if (
      state.mode === 'demo' &&
      (body.sizing.volume_lots > 0.1 ||
        body.sizing.volume_lots < 0.01 ||
        Math.abs(body.sizing.volume_lots * 100 - Math.round(body.sizing.volume_lots * 100)) > 0.00001)
    )
      throw new Error('Demo lot size must be 0.01–0.10 in steps of 0.01.')
    modalBusy.value = true
    if (kind === 'plan') {
      let plan: any
      if (state.mode === 'api') plan = await state.api!.createPlan(body)
      else {
        await sleep(700)
        plan = { id: 'plan-' + uuid().slice(0, 8), analysis_id: analysis.id, data: body, state: 'MONITORING' }
      }
      plan.analysis = analysis
      state.plans.unshift(plan)
      notify(
        'Trade plan is monitoring',
        `${state.symbol} · ${analysis.data.proposed_side} ${money(body.sizing.volume_lots)} lots`,
        'plans',
        'MONITORING',
      )
      closeModal()
      go('plans')
      toast('Trade plan created. No position has been opened.')
    } else {
      let command: any
      if (state.mode === 'api') command = await state.api!.order(body, commandKey('OPEN', body))
      else {
        await sleep(600)
        command = { id: 'cmd-' + uuid().slice(0, 8), kind: 'OPEN', state: 'QUEUED', data: body, created_at: stamp() }
      }
      keepCommand(command)
      notify(
        'Order request queued',
        `${state.symbol} · ${analysis.data.proposed_side} ${money(body.sizing.volume_lots)} lots`,
        'clock',
        'QUEUED',
      )
      closeModal()
      go('activity')
      toast('Order queued. Waiting for the execution outcome.')
      if (state.mode === 'demo')
        finishDemoCommand(command, () => {
          const p = {
            ticket: String(108500000 + Math.floor(Math.random() * 9999)),
            symbol: state.symbol,
            side: body.side,
            volume: body.sizing.volume_lots,
            sl: analysis.data.stop_loss,
            tp: analysis.data.take_profits[body.take_profit_index],
            price_open: currentPrice(),
            magic: 261026,
          }
          state.positions.push(p)
          command.state = 'FILLED'
          command.result = { state: 'FILLED', position_ticket: p.ticket, filled_volume: p.volume, mock: true }
          return 'Demo order filled'
        })
    }
  } catch (e: any) {
    modalBusy.value = false
    formError(e.message)
  }
}

async function positionMutation(
  kind: 'CLOSE' | 'PROTECTION',
  ticket: string,
  input: { closeMode?: string; partialVolume?: string; sl?: string; tp?: string },
) {
  const p = state.positions.find((x) => x.ticket === ticket)
  if (!p) return
  try {
    let body: any
    if (kind === 'CLOSE') {
      const volume = input.closeMode === 'full' ? null : Number(input.partialVolume)
      if (volume !== null && (!Number.isFinite(volume) || volume <= 0 || volume > p.volume))
        throw new Error('Enter a close volume greater than zero and no larger than the position.')
      if (state.mode === 'demo' && volume !== null && Math.abs(volume * 100 - Math.round(volume * 100)) > 0.00001)
        throw new Error('Demo close volume must use 0.01-lot increments.')
      body = { connection_id: state.connection.id, volume_lots: volume, max_deviation_points: 20 }
    } else {
      const sl = Number(input.sl)
      const tp = Number(input.tp)
      if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0)
        throw new Error('Enter valid positive SL and TP prices.')
      if (
        state.mode === 'demo' &&
        !(p.side === 'BUY' ? sl < currentPrice() && tp > currentPrice() : tp < currentPrice() && sl > currentPrice())
      )
        throw new Error(
          p.side === 'BUY'
            ? 'For this BUY, SL must be below and TP above the current price.'
            : 'For this SELL, TP must be below and SL above the current price.',
        )
      body = { connection_id: state.connection.id, stop_loss: sl, take_profit: tp }
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
      command = { id: 'cmd-' + uuid().slice(0, 8), kind, state: 'QUEUED', data: { ...body, ticket }, created_at: stamp() }
    }
    keepCommand(command)
    notify(
      kind === 'CLOSE' ? 'Close request queued' : 'Protection update queued',
      `${p.symbol} · Ticket ${ticket}`,
      'clock',
      'QUEUED',
    )
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
  } catch (e: any) {
    modalBusy.value = false
    formError(e.message)
  }
}

async function planControl(id: string, control: string) {
  const plan = state.plans.find((p) => p.id === id)
  try {
    modalBusy.value = true
    if (state.mode === 'api') {
      Object.assign(plan, await (control === 'pause' ? state.api!.pausePlan(id) : state.api!.resumePlan(id)))
    } else {
      await sleep(350)
      if (control === 'resume' && executionBlocker(plan.analysis, 'api'))
        throw new Error('This setup needs a fresh analysis before resuming.')
      plan.state = control === 'pause' ? 'PAUSED' : 'MONITORING'
    }
    closeModal()
    toast('Trade plan ' + (control === 'pause' ? 'paused.' : 'resumed.'))
  } catch (error: any) {
    modalBusy.value = false
    formError(error.message)
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
  } catch (e: any) {
    modalBusy.value = false
    formError(e.message)
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
      const plan = state.plans.find((p) => p.id === c.data?.plan_id)
      if (plan) plan.state = 'CANCELLED'
    }
    closeModal()
    toast('Queued command cancelled before submission.')
  } catch (error: any) {
    modalBusy.value = false
    formError(error.message)
  }
}

function simulateTrigger(id: string) {
  const p = state.plans.find((x) => x.id === id)
  if (!p || p.state !== 'MONITORING' || state.mode !== 'demo') return
  p.state = 'QUEUED'
  const c = { id: 'cmd-demo-' + uuid().slice(0, 6), kind: 'OPEN', state: 'QUEUED', data: { analysis_id: p.analysis_id }, created_at: stamp() }
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
      volume: p.data.sizing.volume_lots,
      sl: a.stop_loss,
      tp: a.take_profits[p.data.take_profit_index || 0],
      price_open: 4032.18,
      magic: 261026,
    })
    return 'Demo trade plan filled'
  })
}

// ---- Demo scenarios ------------------------------------------------------

function applyScenario(scenario: string) {
  if (state.mode !== 'demo') return
  state.scenario = scenario
  state.analysis = sampleAnalysis(scenario === 'unknown' ? 'waiting' : scenario, state.symbol, state.tf, state.horizon)
  if (scenario === 'unknown') {
    state.commands.unshift({
      id: 'cmd-unknown-' + uuid().slice(0, 6),
      kind: 'OPEN',
      state: 'UNKNOWN',
      data: {},
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
  if (state.mode === 'api' && !state.uploads.length) {
    analysisError.value = 'Add at least one screenshot for the primary timeframe.'
    return
  }
  if (state.uploads.length && !state.uploads.some((u) => u.tf === state.tf)) {
    analysisError.value = 'Add a screenshot matching the primary timeframe.'
    return
  }
  for (const u of state.uploads) {
    const age = Date.now() - new Date(u.captured).getTime()
    if (!Number.isFinite(age) || age > 15 * 60000 || age < -30000) {
      analysisError.value = 'Confirm a capture time within the last 15 minutes for every screenshot.'
      return
    }
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
    notify('Market analysis completed', `${state.symbol} · ${state.tf} · ${result.data.action}`, 'spark', result.data.action)
    state.analysing = false
    toast('Analysis complete. Review the setup and any blockers.')
  } catch (e: any) {
    state.analysing = false
    analysisError.value = e.message
  }
}

async function captureChart(svgSource: string) {
  try {
    if (state.mode === 'api' && !chartBars().length)
      throw new Error('Load broker candles before capturing a chart.')
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
  } catch (e: any) {
    toast(e.message)
  }
}

// ---- Background sync lifecycle -------------------------------------------

let pollTimer: ReturnType<typeof setInterval> | undefined
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
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('offline', onOffline)
  window.addEventListener('online', onOnline)
}

function stopBackgroundSync() {
  if (!listenersBound) return
  listenersBound = false
  clearInterval(pollTimer)
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
    // derived helpers
    chartBars,
    currentPrice,
    pnl,
    demoCandles,
    executionBlocker,
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
    reviewTrade,
    submitTrade,
    positionMutation,
    planControl,
    cancelPlan,
    cancelQueued,
    simulateTrigger,
    applyScenario,
    resetDemo,
    addFiles,
    removeUpload,
    runAnalysis,
    captureChart,
  }
}
