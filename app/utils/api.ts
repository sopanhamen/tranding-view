// FastAPI client + execution helpers for the Gold Market & MT5 API v0.2.0.
// Network transport goes through Nuxt $fetch (exposed as window.aurumFetch).

export const TIMEFRAMES = ["M5", "M10", "M15", "M30", "H1", "H4"];

// Command states that still change without operator action. Prefer the server's
// `final` flag; this set is the fallback for rows that do not carry one.
export const ACTIVE_STATES = new Set([
  "QUEUED",
  "PREPARING",
  "SUBMITTING",
  "PLACED",
]);
export const UNCERTAIN_STATES = new Set(["UNKNOWN", "SUBMITTING"]);

export const isFinal = (c: any): boolean =>
  c?.final ?? !ACTIVE_STATES.has(c?.state);

export const PENDING_TYPES = [
  "BUY_LIMIT",
  "SELL_LIMIT",
  "BUY_STOP",
  "SELL_STOP",
];

export const ENDPOINTS: [string, string, string, string][] = [
  [
    "Worker",
    "GET",
    "/worker/health",
    "Snapshot freshness, quote and queue state",
  ],
  [
    "MT5 connection",
    "POST",
    "/mt5/connections",
    "Log the worker into an MT5 account; returns connection_id",
  ],
  [
    "MT5 connection",
    "GET",
    "/mt5/connections",
    "Saved connections, the active one and terminal login errors",
  ],
  ["MT5 connection", "GET", "/mt5/status", "Account and terminal status"],
  [
    "MT5 connection",
    "GET",
    "/mt5/symbols",
    "Configured symbol and broker specification",
  ],
  ["Market", "GET", "/market/quote", "Bid, ask, spread and quote age"],
  ["Market", "GET", "/market/candles", "Closed candles by timeframe"],
  [
    "AI analysis",
    "POST",
    "/analyses",
    "Analyse snapshot data plus optional screenshots",
  ],
  ["AI analysis", "GET", "/analyses", "Recent analyses with eligibility"],
  [
    "AI analysis",
    "GET",
    "/analyses/{id}",
    "Saved analysis, assessment and provenance",
  ],
  ["Trade plans", "POST", "/trade-plans", "Create a conditional plan"],
  ["Trade plans", "GET", "/trade-plans", "Recent plans, optionally by state"],
  ["Trade plans", "GET", "/trade-plans/{id}", "Track plan state"],
  ["Trade plans", "POST", "/trade-plans/{id}/cancel", "Cancel a waiting plan"],
  [
    "Orders",
    "POST",
    "/orders/preview",
    "Validate and price an order without queuing",
  ],
  ["Orders", "POST", "/orders", "Queue a market or pending order"],
  ["Orders", "GET", "/commands", "Execution history"],
  ["Orders", "GET", "/commands/{id}", "Check broker outcome"],
  [
    "Orders",
    "POST",
    "/commands/{id}/cancel",
    "Cancel before the worker claims it",
  ],
  ["Pending orders", "GET", "/orders/pending", "Active broker pending orders"],
  ["Pending orders", "GET", "/orders/pending/{ticket}", "One pending order"],
  [
    "Pending orders",
    "POST",
    "/orders/pending/{ticket}/cancel",
    "Queue a pending-order cancellation",
  ],
  ["Positions", "GET", "/positions", "Open positions snapshot"],
  ["Positions", "GET", "/positions/{ticket}", "One open position"],
  ["Positions", "POST", "/positions/{ticket}/close", "Full or partial close"],
  [
    "Positions",
    "PATCH",
    "/positions/{ticket}/protection",
    "Update stop loss and take profit",
  ],
  ["History", "GET", "/trades", "Recorded trade outcomes"],
  ["History", "GET", "/trades/{id}", "One trade outcome"],
  [
    "History",
    "GET",
    "/stats/performance",
    "Win rate with sample size and confidence interval",
  ],
  ["History", "GET", "/audit", "Append-only audit trail"],
];

// ---- Errors ----------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  code: string;
  detail: any;

  constructor(
    status: number,
    code: string,
    message: string,
    detail: any = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// Plain-language copy for the stable `detail.code` values. The server message
// stays the fallback so new codes still read sensibly.
const CODE_COPY: Record<string, string> = {
  CONNECTION_REQUIRED:
    "This session has no MT5 connection. Connect your account again.",
  SNAPSHOT_STALE:
    "The MT5 worker snapshot is stale. Check the Windows terminal and worker.",
  QUOTE_STALE: "No recent broker quote. The market may be closed.",
  ACCOUNT_MISMATCH:
    "The terminal is logged into a different account than this connection.",
  MODE_MISMATCH: "The selected account mode does not match the MT5 terminal.",
  EXPOSURE_BLOCKED:
    "An execution outcome is unresolved. New entries are blocked until it is reconciled.",
  RESERVATION_EXISTS:
    "This analysis is already used by an order or plan. Run a fresh analysis for another entry.",
  PLAN_EXISTS: "This analysis already has a plan.",
  ANALYSIS_EXPIRED: "This analysis has expired. Run a fresh analysis.",
  ANALYSIS_REASSESS_REQUIRED:
    "This analysis has passed its reassessment time. Run a fresh analysis.",
  DECISION_NOT_ACTIONABLE:
    "This analysis says wait. Use a conditional trade plan instead of an order.",
  NO_ENTRY_RULE:
    "This analysis has no conditional entry rule, so it cannot back a plan.",
  ENTRY_OUT_OF_ZONE: "The order price must sit inside the analysis entry zone.",
  IDEMPOTENCY_CONFLICT:
    "This request key was already used with different values. Reopen the review and try again.",
  PLAN_NOT_CANCELLABLE:
    "The plan already left monitoring. Inspect its command and position instead.",
  COMMAND_NOT_CANCELLABLE:
    "The worker already claimed this command. Inspect its outcome instead.",
  ORDER_NOT_ACTIVE: "This pending order is no longer active at the broker.",
  POSITION_NOT_OPEN: "This position is no longer open in the latest snapshot.",
  IMAGE_STALE: "A screenshot capture time is too old or in the future.",
  IMAGE_INVALID:
    "A screenshot could not be read. Use a clear PNG, JPEG or WebP between 200px and 20MP.",
  IMAGE_TOO_LARGE: "A screenshot is larger than the upload limit.",
  AI_FAILED:
    "The AI provider failed or returned an invalid analysis. No trade was created.",
  SYMBOL_UNSUPPORTED: "The server is configured for a different symbol.",
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const first = error.detail?.errors?.[0];
    if (error.code === "VALIDATION_ERROR" && first) {
      const field = first.loc?.slice(1).join(".") || "request";
      return `${error.message}: ${field} — ${first.msg}`;
    }
    return CODE_COPY[error.code] ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

// Normalises a $fetch failure into an ApiError. FastAPI puts structured errors
// in `detail` as { code, message, ... }; anything else falls back to text.
function toApiError(error: any): ApiError {
  const detail = error?.data?.detail;
  const status = error?.statusCode || error?.status || 0;
  if (detail && typeof detail === "object")
    return new ApiError(
      status,
      detail.code || "ERROR",
      detail.message || error.message,
      detail,
    );
  if (!status)
    return new ApiError(
      0,
      "NETWORK",
      "Cannot reach the API. Check its URL, CORS and that the server is running.",
    );
  return new ApiError(
    status,
    "ERROR",
    typeof detail === "string" ? detail : error.message,
  );
}

// ---- URL ---------------------------------------------------------------------

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "Use an API origin without credentials, query parameters or fragments.",
    );
  const localHttp =
    url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !localHttp)
    throw new Error("Use HTTPS, or HTTP on localhost for development.");
  return url.toString().replace(/\/$/, "");
}

// ---- Analysis eligibility ----------------------------------------------------

export interface Reason {
  code: string;
  message: string;
}

const TIMING = new Set(["ANALYSIS_EXPIRED", "ANALYSIS_REASSESS_REQUIRED"]);

// Reasons that do not depend on the clock: the server's list when present,
// otherwise derived from the analysis data.
function staticReasons(analysis: any): Reason[] {
  if (analysis.eligibility)
    return analysis.eligibility.blocking_reasons.filter(
      (r: Reason) => !TIMING.has(r.code),
    );
  const data = analysis.data ?? {};
  const blockers: Reason[] = (data.execution_blockers ?? []).map(
    (b: string) => ({ code: "ANALYSIS_BLOCKED", message: b }),
  );
  return data.proposed_side
    ? blockers
    : [
        {
          code: "NO_SETUP",
          message: "Analysis proposes no side (WAIT/NO_TRADE)",
        },
        ...blockers,
      ];
}

function timingReason(analysis: any, now: number): Reason | null {
  const expires = Date.parse(analysis.expires_at);
  const reassess = Date.parse(analysis.reassess_at);
  if (!Number.isFinite(expires) || !Number.isFinite(reassess))
    return { code: "ANALYSIS_EXPIRED", message: "Analysis validity is missing" };
  if (now >= expires)
    return {
      code: "ANALYSIS_EXPIRED",
      message: "Analysis valid_until has passed",
    };
  if (now >= reassess)
    return {
      code: "ANALYSIS_REASSESS_REQUIRED",
      message: "Analysis reassess_at has passed",
    };
  return null;
}

// Server eligibility is computed when the row was read, so timing is re-checked
// against the client clock; static reasons (no setup, blockers) are kept as-is.
export function blockingReasons(analysis: any, now = Date.now()): Reason[] {
  if (!analysis)
    return [{ code: "NO_ANALYSIS", message: "Analyse the market first." }];
  const timing = timingReason(analysis, now);
  const reasons = staticReasons(analysis);
  return timing ? [timing, ...reasons] : reasons;
}

export function reasonText(r: Reason): string {
  if (r.code === "ANALYSIS_BLOCKED")
    return r.message.replaceAll("_", " ").toLowerCase();
  if (r.code === "NO_SETUP") return "No trade setup was proposed.";
  return CODE_COPY[r.code] ?? r.message;
}

export function executionBlocker(
  analysis: any,
  now = Date.now(),
): string | null {
  const reasons = blockingReasons(analysis, now);
  return reasons.length ? reasons.map(reasonText).join(" ") : null;
}

// What the analysis allows: an immediate order, a conditional plan, or nothing.
export function tradeKind(analysis: any): "order" | "plan" | null {
  const d = analysis?.data;
  if (!d?.proposed_side) return null;
  if (d.decision === "BUY" || d.decision === "SELL") return "order";
  if (d.decision === "WAIT" && d.entry_rule) return "plan";
  return null;
}

// ---- Execution payloads ------------------------------------------------------

export type SizingType = "FIXED_LOTS" | "RISK_PERCENT" | "RISK_AMOUNT";

export interface ExecutionValues {
  sizingType: SizingType;
  sizingValue: string;
  tp: string;
  spread: string;
  deviation: string;
  orderType?: string;
  price?: string;
}

const SIZING: Record<SizingType, { field: string; label: string }> = {
  FIXED_LOTS: { field: "volume_lots", label: "a lot size" },
  RISK_PERCENT: { field: "risk_percent", label: "a risk percentage" },
  RISK_AMOUNT: { field: "risk_amount", label: "a risk amount" },
};

export function sizingBody(type: SizingType, raw: string): any {
  const { field, label } = SIZING[type];
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Enter ${label} greater than zero.`);
  if (type === "RISK_PERCENT" && value > 100)
    throw new Error("Risk percentage cannot exceed 100.");
  return { type, [field]: value };
}

export function executionPayload(
  analysis: any,
  connectionId: string,
  values: ExecutionValues,
  kind: "plan" | "order",
): any {
  const common = {
    analysis_id: analysis.id,
    connection_id: connectionId,
    sizing: sizingBody(values.sizingType, values.sizingValue),
    take_profit_index: Number(values.tp),
    max_spread_points: Number(values.spread),
    max_deviation_points: Number(values.deviation),
  };
  const spread = common.max_spread_points;
  if (!Number.isFinite(spread) || spread <= 0)
    throw new Error("Enter a positive spread limit.");
  const deviation = common.max_deviation_points;
  if (!Number.isInteger(deviation) || deviation < 0 || deviation > 1000)
    throw new Error("Deviation must be a whole number from 0 to 1,000.");

  if (kind === "plan")
    return { ...common, execution_mode: "WHEN_CONDITIONS_MET", max_entries: 1 };

  const order = { ...common, side: analysis.data.proposed_side };
  const orderType = values.orderType || "MARKET";
  if (orderType === "MARKET") return { ...order, order_type: "MARKET" };

  const price = Number(values.price);
  const [lo, hi] = analysis.data.entry_zone;
  if (!Number.isFinite(price) || price <= 0)
    throw new Error("Enter a pending order price.");
  if (price < lo || price > hi)
    throw new Error("The order price must sit inside the entry zone.");
  return { ...order, order_type: orderType, price };
}

// ---- Connection ----------------------------------------------------------------

export interface ConnectionValues {
  connectionType: "demo" | "real";
  login: string;
  password: string;
  server: string;
  broker: string;
}

export function connectionBody(values: ConnectionValues): any {
  const login = Number(values.login);
  if (!Number.isInteger(login) || login <= 0)
    throw new Error("Enter your numeric MT5 account login.");
  if (!values.password)
    throw new Error("Enter the trading (not investor) password.");
  const server = values.server.trim();
  if (!server)
    throw new Error("Enter the exact server name from MT5’s login dialog.");
  return {
    connectionType: values.connectionType,
    connection_login: login,
    password: values.password,
    server,
    broker: values.broker.trim() || null,
  };
}

export interface ConnectionList {
  connections: any[];
  terminal: any;
}

// GET /mt5/connections reports one `terminal` for the whole worker; its `error`
// is the last login failure for `requested_connection_id` while it switches
// accounts, so it only applies to that connection while it is still inactive.
export function loginError(
  list: ConnectionList | null | undefined,
  id: string | undefined,
): string | null {
  const error = list?.terminal?.error;
  const row = list?.connections.find((c) => c.id === id);
  if (!error || !row || row.active) return null;
  if (list!.terminal.requested_connection_id !== id) return null;
  return typeof error === "string"
    ? error
    : error.message || JSON.stringify(error);
}

// ---- Client ------------------------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: any;
  idempotencyKey?: string;
  signal?: AbortSignal;
  raw?: boolean;
  timeout?: number;
}

type Params = Record<string, unknown>;

const V1 = "/api/v1";
const DEFAULT_TIMEOUT = 20_000;
// AI analysis with screenshots routinely takes over a minute.
const ANALYSIS_TIMEOUT = 110_000;

const query = (params: Params) => {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return pairs.length ? "?" + pairs.join("&") : "";
};

const seg = encodeURIComponent;

// The API has no authentication; every data endpoint is scoped by the
// `connection_id` returned from POST /mt5/connections.
export class ApiClient {
  base: string;
  connectionId: string | null = null;

  constructor(base: string) {
    this.base = validateBaseUrl(base);
  }

  async request(
    path: string,
    {
      method = "GET",
      body,
      idempotencyKey,
      signal,
      raw,
      timeout = DEFAULT_TIMEOUT,
    }: RequestOptions = {},
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    if (body && !(body instanceof FormData))
      headers["Content-Type"] = "application/json";
    const url = this.base + path;
    const options = {
      method,
      headers,
      body,
      signal: signal ?? AbortSignal.timeout(timeout),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      retry: 0,
    } as any;
    try {
      if (!raw) return await window.aurumFetch(url, options);
      const response = await window.aurumFetch.raw(url, options);
      return { status: response.status, data: response._data };
    } catch (error) {
      throw toApiError(error);
    }
  }

  // v1 path with `connection_id` appended so callers never have to thread it
  // through.
  private scoped(path: string, params: Params = {}) {
    return V1 + path + query({ ...params, connection_id: this.connectionId });
  }

  // Connection-scoped GET.
  private get(path: string, params?: Params) {
    return this.request(this.scoped(path, params));
  }

  // Connection-scoped POST with no body (cancellations).
  private postScoped(path: string) {
    return this.request(this.scoped(path), { method: "POST" });
  }

  // Unscoped v1 call; the connection travels in the body when needed.
  private send(path: string, options: RequestOptions = {}) {
    return this.request(V1 + path, options);
  }

  health() {
    return this.request("/health");
  }

  workerHealth() {
    return this.send("/worker/health");
  }

  // Resolves to { status, data }: 201 when the terminal is already on this
  // account, 202 while the worker logs in (poll connections()).
  connect(body: any) {
    return this.send("/mt5/connections", { method: "POST", body, raw: true });
  }

  async connections(): Promise<ConnectionList> {
    const v = await this.send("/mt5/connections");
    return { connections: v?.connections ?? [], terminal: v?.terminal ?? null };
  }

  status() {
    return this.get("/mt5/status");
  }

  symbols() {
    return this.get("/mt5/symbols");
  }

  quote() {
    return this.get("/market/quote");
  }

  candles(tf: string, count = 150) {
    return this.get("/market/candles", {
      timeframe: tf,
      count: Math.min(count, 200),
    });
  }

  analyse(form: FormData) {
    return this.send("/analyses", {
      method: "POST",
      body: form,
      timeout: ANALYSIS_TIMEOUT,
    });
  }

  analyses(limit = 20) {
    return this.get("/analyses", { limit });
  }

  analysis(id: string) {
    return this.get(`/analyses/${seg(id)}`);
  }

  createPlan(body: any) {
    return this.send("/trade-plans", { method: "POST", body });
  }

  plans(limit = 50, state?: string) {
    return this.get("/trade-plans", { limit, state });
  }

  plan(id: string) {
    return this.get(`/trade-plans/${seg(id)}`);
  }

  cancelPlan(id: string) {
    return this.postScoped(`/trade-plans/${seg(id)}/cancel`);
  }

  preview(body: any, signal?: AbortSignal) {
    return this.send("/orders/preview", { method: "POST", body, signal });
  }

  order(body: any, key: string) {
    return this.send("/orders", {
      method: "POST",
      body,
      idempotencyKey: key,
    });
  }

  commands(limit = 50, state?: string, kind?: string) {
    return this.get("/commands", { limit, state, kind });
  }

  command(id: string) {
    return this.get(`/commands/${seg(id)}`);
  }

  cancelCommand(id: string) {
    return this.postScoped(`/commands/${seg(id)}/cancel`);
  }

  pendingOrders() {
    return this.get("/orders/pending");
  }

  pendingOrder(ticket: string) {
    return this.get(`/orders/pending/${seg(ticket)}`);
  }

  cancelPending(ticket: string, key: string) {
    return this.send(`/orders/pending/${seg(ticket)}/cancel`, {
      method: "POST",
      body: { connection_id: this.connectionId },
      idempotencyKey: key,
    });
  }

  positions() {
    return this.get("/positions");
  }

  position(ticket: string) {
    return this.get(`/positions/${seg(ticket)}`);
  }

  close(ticket: string, body: any, key: string) {
    return this.send(`/positions/${seg(ticket)}/close`, {
      method: "POST",
      body,
      idempotencyKey: key,
    });
  }

  protection(ticket: string, body: any, key: string) {
    return this.send(`/positions/${seg(ticket)}/protection`, {
      method: "PATCH",
      body,
      idempotencyKey: key,
    });
  }

  trades(limit = 50, outcome?: string, source?: string) {
    return this.get("/trades", { limit, outcome, source });
  }

  trade(id: string) {
    return this.get(`/trades/${seg(id)}`);
  }

  performance(params: {
    source?: string;
    timeframe?: string;
    strategy?: string;
    symbol?: string;
    since?: string;
    until?: string;
  }) {
    return this.get("/stats/performance", params);
  }

  audit(limit = 100, filters: Record<string, string> = {}) {
    return this.get("/audit", { limit, ...filters });
  }
}
