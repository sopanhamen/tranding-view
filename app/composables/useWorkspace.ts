// Reactive workspace store — the Vue replacement for the original controller's
// global `state` object and imperative render() loop. A module-level singleton
// so every page/component/modal shares one source of truth; Vue reactivity takes
// the place of manual re-rendering.

import { reactive, ref, readonly } from "vue";
import {
  ApiClient,
  connectionBody,
  errorMessage,
  executionBlocker,
  executionPayload,
  isFinal,
  loginError,
  tradeKind,
  type ConnectionList,
  type ConnectionValues,
  type ExecutionValues,
} from "~/utils/api";
import { mergeRecords, eventView } from "~/utils/records";
import { stamp, uuid, money, sleep } from "~/utils/format";

export type RouteName =
  | "market"
  | "analysis"
  | "plans"
  | "positions"
  | "activity"
  | "performance"
  | "connection"
  | "api";

export const ROUTE_PATHS: Record<RouteName, string> = {
  market: "/",
  analysis: "/analysis",
  plans: "/plans",
  positions: "/positions",
  activity: "/activity",
  performance: "/performance",
  connection: "/connection",
  api: "/api",
};

export interface Upload {
  file: File;
  preview: string;
  tf: string;
  captured: string;
}

export interface ModalState {
  type: string;
  [key: string]: any;
}

type HistoryKind = "analyses" | "plans" | "commands" | "events";

interface WorkspaceState {
  route: RouteName;
  analyses: any[];
  history: Partial<Record<HistoryKind, { limit: number; hasMore: boolean }>>;
  health: any;
  tf: string;
  tab: string;
  menu: boolean;
  mode: "disconnected" | "api";
  api: ApiClient | null;
  base: string;
  connection: any;
  connectionList: ConnectionList | null;
  connectMode: "demo" | "real";
  historyOnly: boolean;
  symbol: string;
  spec: any;
  account: any;
  analysis: any;
  plans: any[];
  positions: any[];
  pendingOrders: any[];
  commands: any[];
  events: any[];
  trades: any[];
  performance: any;
  perfSource: string;
  perfTimeframe: string;
  uploads: Upload[];
  notes: string;
  horizon: number;
  query: string;
  page: number;
  networkError: string;
  analysing: boolean;
  liveCandles: Record<string, any[]>;
  updatedAt: string;
  now: number;
  brokerBackend: string;
  aiBackend: string;
  showLevels: boolean;
  pendingKeys: Map<string, string>;
}

// Placeholder until GET /mt5/status (or the connection row) reports the account.
const emptyAccount = () => ({
  login: null as number | null,
  server: "",
  mode: "",
  equity: NaN,
  currency: "USD",
  trade_allowed: false,
});

const state = reactive<WorkspaceState>({
  route: "market",
  analyses: [],
  history: {},
  health: null,
  tf: "M15",
  tab: "positions",
  menu: false,
  mode: "disconnected",
  api: null,
  base: "",
  connection: null,
  connectionList: null,
  connectMode: "demo",
  historyOnly: false,
  symbol: "XAUUSD",
  spec: null,
  account: emptyAccount(),
  analysis: null,
  plans: [],
  positions: [],
  pendingOrders: [],
  commands: [],
  events: [],
  trades: [],
  performance: null,
  perfSource: "",
  perfTimeframe: "",
  uploads: [],
  notes: "",
  horizon: 240,
  query: "",
  page: 1,
  networkError: "",
  analysing: false,
  liveCandles: {},
  updatedAt: stamp(),
  now: Date.now(),
  brokerBackend: "",
  aiBackend: "",
  showLevels: true,
  pendingKeys: new Map(),
});

// Shared UI surfaces (toast + the single open modal) and transient busy/error.
const toastMessage = ref("");
const modal = ref<ModalState | null>(null);
const modalError = ref("");
const modalBusy = ref(false);
const analysisError = ref("");
const uploadError = ref("");
const historyBusy = reactive(new Set<string>());
const performanceBusy = ref(false);
const analysisCache = new Map<string, any>();
// Analysis ids that failed to load; not re-requested on every poll.
const analysisMisses = new Set<string>();

let toastTimer: ReturnType<typeof setTimeout> | undefined;

function toast(message: string) {
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastMessage.value = ""), 4500);
}

// Back to the disconnected workspace: no connection, no server data.
function resetSession() {
  state.mode = "disconnected";
  state.api = null;
  state.base = "";
  state.connection = null;
  state.connectionList = null;
  state.historyOnly = false;
  state.health = null;
  state.symbol = "XAUUSD";
  state.spec = null;
  state.account = emptyAccount();
  state.brokerBackend = "";
  state.aiBackend = "";
  state.analysis = null;
  state.analyses = [];
  state.history = {};
  state.networkError = "";
  state.plans = [];
  state.positions = [];
  state.pendingOrders = [];
  state.commands = [];
  state.events = [];
  state.trades = [];
  state.performance = null;
  state.perfSource = "";
  state.liveCandles = {};
  state.pendingKeys.clear();
  analysisCache.clear();
  analysisMisses.clear();
}

// ---- Market data ---------------------------------------------------------

function chartBars(tf = state.tf) {
  return state.liveCandles[tf] || [];
}

function quote() {
  return state.health?.quote ?? null;
}

function currentPrice() {
  return (
    state.health?.quote?.bid ?? state.liveCandles[state.tf]?.at(-1)?.close ?? NaN
  );
}

function pnl(p: any) {
  return Number.isFinite(p.profit) ? p.profit : NaN;
}

function exposureBlocked() {
  return (
    !!state.health?.new_exposure_blocked ||
    state.commands.some((c) => c.state === "UNKNOWN")
  );
}

// Why trading actions are unavailable right now, independent of any analysis.
function sessionBlocker(): string | null {
  if (!state.api) return "Connect your MT5 account first.";
  if (!state.connection || state.historyOnly)
    return "Trading is paused until the MT5 worker is logged into this account.";
  if (state.networkError)
    return "Restore the terminal connection before submitting a new entry.";
  if (!state.account.trade_allowed)
    return "The terminal or account has disabled trading.";
  return null;
}

// ---- Navigation ----------------------------------------------------------

function go(route: RouteName) {
  navigateTo(ROUTE_PATHS[route]);
}

function setTimeframe(tf: string) {
  state.tf = tf;
  if (state.api) refreshData(true);
}

function setHorizon(horizon: number) {
  state.horizon = horizon;
}

function toggleLevels() {
  state.showLevels = !state.showLevels;
  toast(
    state.showLevels
      ? "Analysis price levels shown."
      : "Analysis price levels hidden.",
  );
}

// ---- Modal plumbing ------------------------------------------------------

function openModal(m: ModalState) {
  modalError.value = "";
  modalBusy.value = false;
  modal.value = m;
}

function closeModal() {
  modal.value = null;
  modalError.value = "";
  modalBusy.value = false;
}

function formError(error: unknown) {
  modalError.value = errorMessage(error);
}

// ---- Idempotency ---------------------------------------------------------

// One key per operation + payload, reused on manual retry until the server
// reports a final, non-UNKNOWN outcome for it.
function commandKey(kind: string, body: any) {
  const signature = kind + JSON.stringify(body);
  const previous = state.pendingKeys.get(signature);
  const known = state.commands.find((c) => c.idempotency_key === previous);
  if (known && isFinal(known) && known.state !== "UNKNOWN")
    state.pendingKeys.delete(signature);
  if (!state.pendingKeys.has(signature))
    state.pendingKeys.set(signature, uuid());
  return state.pendingKeys.get(signature)!;
}

function keepCommand(c: any) {
  const i = state.commands.findIndex((x) => x.id === c.id);
  if (i >= 0) state.commands[i] = { ...state.commands[i], ...c };
  else state.commands.unshift(c);
}

// ---- Connection + sync ---------------------------------------------------

let refreshEpoch = 0;
let syncTick = 0;

const limitOf = (kind: HistoryKind, fallback = 20) =>
  state.history[kind]?.limit ?? fallback;

function keepHistory(kind: HistoryKind, rows: any[]) {
  const limit = limitOf(kind);
  (state as any)[kind] = mergeRecords((state as any)[kind], rows);
  state.history[kind] = { limit, hasMore: rows.length >= limit && limit < 200 };
}

// After a 202 the worker is still logging the terminal in. Poll GET
// /mt5/connections until this connection is `active` or reports a login error;
// null means it is still switching (or the list is unreadable) when the wait
// runs out; the background sync keeps checking after that.
async function awaitLogin(api: ApiClient, id: string, timeout = 30000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const list = await api.connections().catch(() => null);
    const row = list?.connections.find((c) => c.id === id);
    if (row?.active) return row;
    const failed = loginError(list, id);
    if (failed) throw new Error("MT5 login failed: " + failed);
    await sleep(1500);
  }
  return null;
}

// Keep the session's view of its connection in step with the worker: trading
// opens once the terminal is on this account and pauses if it switches away.
function applyLink(list: ConnectionList) {
  state.connectionList = list;
  const row = list.connections.find((c) => c.id === state.connection?.id);
  if (!row) return;
  state.connection = { ...state.connection, ...row };
  state.historyOnly = !row.active;
}

// Plans only carry analysis_id; attach the saved analysis so cards can show levels.
async function attachPlanAnalyses(api: ApiClient, epoch: number) {
  const missing: string[] = [];
  for (const plan of state.plans) {
    if (plan.analysis) continue;
    const known =
      state.analyses.find((a) => a.id === plan.analysis_id) ??
      analysisCache.get(plan.analysis_id);
    if (known) plan.analysis = known;
    else if (!analysisMisses.has(plan.analysis_id))
      missing.push(plan.analysis_id);
  }
  const ids = [...new Set(missing)].slice(0, 5);
  const fetched = await Promise.allSettled(ids.map((id) => api.analysis(id)));
  if (epoch !== refreshEpoch) return;
  for (const [i, r] of fetched.entries()) {
    if (r.status !== "fulfilled") {
      analysisMisses.add(ids[i]);
      continue;
    }
    analysisCache.set(r.value.id, r.value);
    for (const plan of state.plans)
      if (plan.analysis_id === r.value.id) plan.analysis = r.value;
  }
}

// Tiered sync: snapshot data (health, account, positions, pending) every tick;
// history lists every other tick, or every tick while something is in flight;
// analyses and candles every sixth tick or on demand. `full` loads everything.
async function refreshData(quiet = false, full = false) {
  if (!state.api) {
    if (!quiet) toast("Connect your MT5 account to load data.");
    return;
  }
  const epoch = ++refreshEpoch;
  const api = state.api!;
  const tick = ++syncTick;
  const tf = state.tf;
  const hot =
    state.commands.some((c) => !isFinal(c)) ||
    state.plans.some((p) => ["MONITORING", "QUEUED"].includes(p.state));
  const every = (n: number) => full || !quiet || tick % n === 0;
  try {
    const health = await api.workerHealth();
    if (epoch !== refreshEpoch || api !== state.api) return;
    state.health = health;
    state.brokerBackend = health.broker_backend;
    state.aiBackend = health.ai_backend;
    // While the terminal is still switching, check the login every tick.
    let linkError: unknown = null;
    if (health.fresh && (state.historyOnly || every(6))) {
      const list = await api.connections().catch((error) => {
        linkError = error;
        return null;
      });
      if (epoch !== refreshEpoch || api !== state.api) return;
      if (list) applyLink(list);
    }
    const live = health.fresh && !state.historyOnly;
    const jobs: Record<string, Promise<any> | null> = {
      status: live ? api.status() : null,
      positions: live ? api.positions() : null,
      pending: live ? api.pendingOrders() : null,
      plans: every(hot ? 1 : 2) ? api.plans(limitOf("plans")) : null,
      commands: every(hot ? 1 : 2) ? api.commands(limitOf("commands")) : null,
      events: every(2) ? api.audit(limitOf("events", 50)) : null,
      analyses: every(6) ? api.analyses(limitOf("analyses")) : null,
      candles:
        live && (every(6) || !state.liveCandles[tf]) ? api.candles(tf) : null,
    };
    const keys = Object.keys(jobs);
    const results = await Promise.allSettled(keys.map((k) => jobs[k]));
    if (epoch !== refreshEpoch || api !== state.api) return;
    let firstError: unknown = linkError;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        firstError ??= r.reason;
        return;
      }
      const v = r.value;
      if (v == null) return;
      switch (keys[i]) {
        case "status":
          state.account = { ...state.account, ...v.account };
          break;
        case "positions":
          state.positions = v.positions;
          break;
        case "pending":
          state.pendingOrders = v.orders;
          break;
        case "plans":
          keepHistory("plans", v.plans);
          break;
        case "commands":
          keepHistory("commands", v.commands);
          break;
        case "events": {
          const limit = limitOf("events", 50);
          state.events = mergeRecords(state.events, v.events.map(eventView));
          state.history.events = {
            limit,
            hasMore: v.events.length >= limit && limit < 500,
          };
          break;
        }
        case "analyses":
          keepHistory("analyses", v.analyses);
          break;
        case "candles":
          state.liveCandles[tf] = v.closed_candles;
          break;
      }
    });
    if (!state.analysis && state.analyses.length)
      state.analysis = state.analyses[0];
    else if (state.analysis) {
      const latest = state.analyses.find((a) => a.id === state.analysis.id);
      if (latest && latest !== state.analysis)
        state.analysis = { ...state.analysis, ...latest };
    }
    await attachPlanAnalyses(api as ApiClient, epoch);
    if (epoch !== refreshEpoch) return;
    state.updatedAt = health.snapshot_updated_at || stamp();
    const failedLogin = loginError(state.connectionList, state.connection?.id);
    if (firstError) {
      state.networkError = errorMessage(firstError);
    } else if (!health.fresh) {
      state.networkError =
        "The MT5 worker snapshot is stale. Check the Windows terminal and worker. History is still available.";
    } else if (failedLogin) {
      state.networkError = `MT5 login failed: ${failedLogin}. Reconnect with the correct credentials.`;
    } else {
      state.networkError = "";
    }
    if (!quiet)
      toast(
        firstError ? "Refresh finished with errors." : "Workspace refreshed.",
      );
  } catch (error) {
    if (epoch !== refreshEpoch || api !== state.api) return;
    state.networkError = errorMessage(error);
  }
}

async function loadHistory(kind: HistoryKind) {
  if (!state.api) return;
  const fallback = kind === "events" ? 50 : 20;
  const max = kind === "events" ? 500 : 200;
  state.history[kind] = {
    limit: Math.min(max, limitOf(kind, fallback) + fallback),
    hasMore: false,
  };
  historyBusy.add(kind);
  try {
    await refreshData(true, true);
  } finally {
    historyBusy.delete(kind);
  }
}

function defaultPerfSource() {
  if (state.brokerBackend === "mock") return "mock";
  return state.account.mode === "real" ? "live" : "demo";
}

async function loadPerformance() {
  if (!state.api) return;
  performanceBusy.value = true;
  try {
    const source = state.perfSource;
    const [performance, trades] = await Promise.all([
      state.api!.performance({
        source,
        timeframe: state.perfTimeframe || undefined,
      }),
      state.api!.trades(100, undefined, source),
    ]);
    state.performance = performance;
    state.trades = trades.trades;
  } catch (error) {
    toast(errorMessage(error));
  } finally {
    performanceBusy.value = false;
  }
}

// Adopt a connection as this page's session and load its data. `connection`
// carries the GET /mt5/connections row fields (login, server, mode, active).
async function startSession(api: ApiClient, health: any, connection: any) {
  const live = connection.active && health.fresh;
  const [status, symbols] = await Promise.all([
    live ? api.status().catch(() => null) : null,
    api.symbols().catch(() => null),
  ]);
  resetSession();
  state.api = api;
  state.mode = "api";
  state.base = api.base;
  state.connection = connection;
  state.connectMode = connection.mode === "real" ? "real" : "demo";
  state.historyOnly = !live;
  state.health = health;
  state.brokerBackend = health.broker_backend;
  state.aiBackend = health.ai_backend;
  state.account = {
    ...emptyAccount(),
    login: connection.login,
    server: connection.server,
    mode: connection.mode,
    ...status?.account,
  };
  state.symbol = symbols?.symbols?.[0] ?? "XAUUSD";
  state.spec = symbols?.specification ?? null;
  state.perfSource = defaultPerfSource();
  await refreshData(true, true);
  return live;
}

// Step 1 of every flow: POST /mt5/connections stores the credentials and makes
// the worker log the terminal in. Its id scopes every later request. If the
// worker is offline or still switching, history opens and trading stays paused
// until refreshData sees the connection become active.
async function connectApi(values: ConnectionValues & { base: string }) {
  const { base, ...credentials } = values;
  modalError.value = "";
  try {
    if (!base) throw new Error("Enter your FastAPI base URL.");
    const api = new ApiClient(base);
    const body = connectionBody(credentials);
    modalBusy.value = true;
    await api.health();
    const health = await api.workerHealth();
    const { status: created, data } = await api.connect(body);
    const id = data?.id ?? data?.connection_id;
    if (!id) throw new Error("The API did not return a connection id.");
    api.connectionId = id;
    let connection: any = {
      login: body.connection_login,
      server: body.server,
      mode: body.connectionType,
      broker: body.broker,
      ...data,
      id,
      active: created === 201,
    };
    if (!connection.active && health.fresh) {
      const row = await awaitLogin(api, id);
      if (row) connection = { ...connection, ...row };
    }
    closeModal();
    const live = await startSession(api, health, connection);
    toast(
      live
        ? "API connected. Saved workspace restored."
        : "History restored. Trading is paused until the worker reconnects.",
    );
  } catch (e) {
    modalBusy.value = false;
    formError(e);
  }
}

// On load, reattach to the connection the worker is logged into (or switching
// to) so the page opens on server data. Reads are scoped by connection_id
// alone, so no password is needed. Any failure leaves the page disconnected.
async function restoreSession(base: string) {
  if (state.api || !base) return;
  try {
    const api = new ApiClient(base);
    const [health, list] = await Promise.all([
      api.workerHealth(),
      api.connections(),
    ]);
    const row =
      list.connections.find((c) => c.active) ??
      list.connections.find(
        (c) => c.id === list.terminal?.requested_connection_id,
      );
    if (!row || state.api) return;
    api.connectionId = row.id;
    await startSession(api, health, row);
    state.connectionList ??= list;
  } catch {
    // Stay disconnected; the connect dialog reports errors in context.
  }
}

// API origin: the configured one, else the local dev server when running on
// localhost.
export function defaultBase(configured: string): string {
  if (configured) return configured;
  if (typeof location === "undefined") return "";
  return ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:8000"
    : "";
}

// ---- Trade + position actions -------------------------------------------

function reviewTrade() {
  const analysis = state.analysis;
  if (!analysis) {
    go("analysis");
    return;
  }
  const kind = tradeKind(analysis);
  let blocker = executionBlocker(analysis, state.now);
  if (!blocker && !kind) blocker = "This analysis does not propose a trade.";
  if (exposureBlocked())
    blocker =
      "An execution outcome is unknown. Reconcile the existing command before another entry.";
  blocker = sessionBlocker() ?? blocker;
  if (analysis.eligibility?.reserved_for)
    blocker =
      "This analysis is already reserved for a trade. Run a fresh analysis for another entry.";
  openModal({ type: "review-trade", kind: kind ?? "plan", blocker });
}

async function previewTrade(values: ExecutionValues, signal?: AbortSignal) {
  const body = executionPayload(
    state.analysis,
    state.connection.id,
    values,
    "order",
  );
  return state.api!.preview(body, signal);
}

async function submitTrade(kind: "plan" | "order", values: ExecutionValues) {
  const analysis = state.analysis;
  try {
    const session = sessionBlocker();
    if (session) throw new Error(session);
    if (exposureBlocked())
      throw new Error(
        "Resolve the unknown execution before submitting a new entry.",
      );
    const block = executionBlocker(analysis, Date.now());
    if (block) throw new Error(block);
    const body = executionPayload(analysis, state.connection.id, values, kind);
    modalBusy.value = true;
    if (kind === "plan") {
      const plan = await state.api!.createPlan(body);
      plan.analysis = analysis;
      state.plans = mergeRecords(state.plans, [plan]);
      if (analysis.eligibility) analysis.eligibility.reserved_for = "PLAN";
      closeModal();
      go("plans");
      toast("Trade plan created. No position has been opened.");
    } else {
      keepCommand(await state.api!.order(body, commandKey("ORDER", body)));
      if (analysis.eligibility) analysis.eligibility.reserved_for = "ORDER";
      closeModal();
      go("activity");
      toast("Order queued. Waiting for the broker outcome.");
    }
  } catch (e) {
    modalBusy.value = false;
    formError(e);
  }
}

export function sizingLabel(sizing: any): string {
  if (!sizing) return "—";
  if (sizing.type === "RISK_PERCENT") return `${sizing.risk_percent}% risk`;
  if (sizing.type === "RISK_AMOUNT") return `${money(sizing.risk_amount)} risk`;
  return `${money(sizing.volume_lots)} lots`;
}

async function positionMutation(
  kind: "CLOSE" | "PROTECTION",
  ticket: string,
  input: {
    closeMode?: string;
    partialVolume?: string;
    sl?: string;
    tp?: string;
    allowWider?: boolean;
  },
) {
  const p = state.positions.find((x) => x.ticket === ticket);
  if (!p) return;
  try {
    if (!state.api || !state.connection)
      throw new Error("Reconnect to the API before changing a position.");
    let body: any;
    if (kind === "CLOSE") {
      const volume =
        input.closeMode === "full" ? null : Number(input.partialVolume);
      if (
        volume !== null &&
        (!Number.isFinite(volume) || volume <= 0 || volume >= p.volume)
      )
        throw new Error(
          "Enter a partial volume greater than zero and smaller than the position. Use full close for the rest.",
        );
      const step = state.spec?.volume_step;
      if (
        volume !== null &&
        step &&
        Math.abs(volume / step - Math.round(volume / step)) > 1e-6
      )
        throw new Error(`Close volume must use ${step}-lot increments.`);
      body = {
        connection_id: state.connection.id,
        volume_lots: volume,
        max_deviation_points: 20,
      };
    } else {
      const sl = Number(input.sl);
      const tp = Number(input.tp);
      if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0)
        throw new Error("Enter valid positive SL and TP prices.");
      const price = currentPrice();
      if (
        Number.isFinite(price) &&
        !(p.side === "BUY"
          ? sl < price && tp > price
          : tp < price && sl > price)
      )
        throw new Error(
          p.side === "BUY"
            ? "For this BUY, SL must be below and TP above the current price."
            : "For this SELL, TP must be below and SL above the current price.",
        );
      body = {
        connection_id: state.connection.id,
        stop_loss: sl,
        take_profit: tp,
        allow_wider_stop: !!input.allowWider,
      };
    }
    modalBusy.value = true;
    const key = commandKey(kind + ticket, body);
    keepCommand(
      kind === "CLOSE"
        ? await state.api!.close(ticket, body, key)
        : await state.api!.protection(ticket, body, key),
    );
    closeModal();
    toast("Request queued. The position has not changed yet.");
  } catch (e) {
    modalBusy.value = false;
    formError(e);
  }
}

async function cancelPendingOrder(ticket: string) {
  try {
    modalBusy.value = true;
    const body = { connection_id: state.connection.id };
    keepCommand(
      await state.api!.cancelPending(
        ticket,
        commandKey("CANCEL_PENDING" + ticket, body),
      ),
    );
    closeModal();
    toast(
      "Cancellation queued. The order stays live until the broker confirms.",
    );
  } catch (error) {
    modalBusy.value = false;
    formError(error);
  }
}

async function cancelPlan(id: string) {
  const p = state.plans.find((x) => x.id === id);
  if (!p) return;
  try {
    modalBusy.value = true;
    Object.assign(p, await state.api!.cancelPlan(id));
    closeModal();
    toast("Plan cancelled. Existing positions are unchanged.");
  } catch (e) {
    modalBusy.value = false;
    formError(e);
  }
}

async function cancelQueued(id: string) {
  try {
    modalBusy.value = true;
    const c = state.commands.find((x) => x.id === id);
    Object.assign(c, await state.api!.cancelCommand(id));
    closeModal();
    toast("Queued command cancelled before submission.");
  } catch (error) {
    modalBusy.value = false;
    formError(error);
  }
}

function disconnect() {
  resetSession();
  closeModal();
  toast("API session disconnected.");
}

// ---- Analysis uploads + run ----------------------------------------------

async function addFiles(list: FileList) {
  const errors: string[] = [];
  for (const file of Array.from(list)) {
    if (state.uploads.length >= 6) {
      errors.push("You can attach up to six screenshots.");
      break;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      errors.push(file.name + ": use PNG, JPEG or WebP.");
      continue;
    }
    if (file.size > 8_000_000 || !file.size) {
      errors.push(
        file.name + ": file must be nonempty and no larger than 8 MB.",
      );
      continue;
    }
    const preview = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = preview;
      await image.decode();
      if (
        Math.min(image.width, image.height) < 200 ||
        image.width * image.height > 20_000_000
      )
        throw new Error(
          "Use an image at least 200px per side and no larger than 20MP.",
        );
      state.uploads.push({
        file,
        preview,
        tf: state.tf,
        captured: new Date(file.lastModified || Date.now()).toISOString(),
      });
    } catch (e: any) {
      URL.revokeObjectURL(preview);
      errors.push(file.name + ": " + e.message);
    }
  }
  if (errors.length) uploadError.value = errors.join(" ");
  else {
    uploadError.value = "";
    toast("Screenshot added. Check its timeframe and actual capture time.");
  }
}

function removeUpload(i: number) {
  const upload = state.uploads[i];
  if (!upload) return;
  URL.revokeObjectURL(upload.preview);
  state.uploads.splice(i, 1);
}

async function runAnalysis() {
  if (state.analysing) return;
  if (!state.api || !state.connection || state.historyOnly) {
    analysisError.value =
      "Analysis needs a live MT5 snapshot. Start the worker, then try again.";
    return;
  }
  for (const u of state.uploads) {
    const age = Date.now() - new Date(u.captured).getTime();
    if (!Number.isFinite(age) || age > 15 * 60000 || age < -30000) {
      analysisError.value =
        "Confirm a capture time within the last 15 minutes for every screenshot.";
      return;
    }
  }
  if (state.notes.length > 500) {
    analysisError.value = "Keep notes to 500 characters or fewer.";
    return;
  }
  state.analysing = true;
  analysisError.value = "";
  try {
    const form = new FormData();
    form.append(
      "metadata",
      JSON.stringify({
        connection_id: state.connection.id,
        symbol: state.symbol,
        timeframe: state.tf,
        horizon_minutes: state.horizon,
        charts: state.uploads.map((u) => ({
          timeframe: u.tf,
          captured_at: u.captured,
        })),
        notes: state.notes.trim() || null,
      }),
    );
    state.uploads.forEach((u) => form.append("images", u.file, u.file.name));
    const result = await state.api.analyse(form);
    state.analysis = result;
    state.analyses = mergeRecords(state.analyses, [result]);
    state.analysing = false;
    toast("Analysis complete. Review the setup and any blockers.");
  } catch (e) {
    state.analysing = false;
    analysisError.value = errorMessage(e);
  }
}

async function selectAnalysis(id: string) {
  const local = state.analyses.find((a) => a.id === id);
  if (local) state.analysis = local;
  if (!state.api) return;
  try {
    state.analysis = await state.api.analysis(id);
  } catch (error) {
    toast(errorMessage(error));
  }
}

async function captureChart(svgSource: string) {
  try {
    if (!chartBars().length)
      throw new Error("Load broker candles before capturing a chart.");
    const source = svgSource
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replace(
        "<title",
        '<style>text{font-family:monospace;fill:#a0a9b7;font-size:9px}</style><rect width="900" height="385" fill="#14181e"/><title',
      );
    const url = URL.createObjectURL(
      new Blob([source], { type: "image/svg+xml" }),
    );
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 770;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 1800, 770);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    );
    if (!blob) throw new Error("Chart capture failed.");
    const file = new File(
      [blob],
      `${state.symbol}-${state.tf}-snapshot.png`,
      {
        type: "image/png",
        lastModified: Date.now(),
      },
    );
    if (state.uploads.length >= 6)
      throw new Error(
        "Remove a screenshot before adding another (maximum six).",
      );
    state.uploads.push({
      file,
      preview: URL.createObjectURL(file),
      tf: state.tf,
      captured: stamp(),
    });
    go("analysis");
    toast("Chart captured. Review the timestamp before analysis.");
  } catch (e) {
    toast(errorMessage(e));
  }
}

// ---- Background sync lifecycle -------------------------------------------

// The next poll is scheduled only after the previous one settles, so a slow
// server never sees back-to-back refreshes. Errors back off up to a minute.
const POLL_MS = 5000;
const POLL_MAX_MS = 60000;

let pollTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;
let pollDelay = POLL_MS;
let listenersBound = false;

async function poll() {
  if (!listenersBound) return;
  if (!document.hidden && state.api) {
    await refreshData(true);
    pollDelay = state.networkError
      ? Math.min(pollDelay * 2, POLL_MAX_MS)
      : POLL_MS;
  }
  if (listenersBound) pollTimer = setTimeout(poll, pollDelay);
}

function onVisibility() {
  if (!document.hidden && state.api) refreshData(true);
}
function onOffline() {
  if (state.api) state.networkError = "Your device is offline";
}
function onOnline() {
  if (state.api) refreshData(true);
}

function startBackgroundSync() {
  if (listenersBound) return;
  listenersBound = true;
  pollDelay = POLL_MS;
  pollTimer = setTimeout(poll, pollDelay);
  clockTimer = setInterval(() => (state.now = Date.now()), 5000);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
}

function stopBackgroundSync() {
  if (!listenersBound) return;
  listenersBound = false;
  clearTimeout(pollTimer);
  clearInterval(clockTimer);
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("offline", onOffline);
  window.removeEventListener("online", onOnline);
}

// HMR re-evaluates this module with fresh flags; stop the old timers first or
// every hot reload stacks another polling loop.
if (import.meta.hot) import.meta.hot.dispose(stopBackgroundSync);

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
    restoreSession,
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
    addFiles,
    removeUpload,
    runAnalysis,
    selectAnalysis,
    captureChart,
  };
}
