import { mergeRecords, eventView, csv } from "./workspace.js";
import {
  ApiClient,
  TIMEFRAMES,
  ENDPOINTS,
  TERMINAL_STATES,
  executionBlocker,
  executionPayload,
} from "./api.js";
const icons = {
  chart: "M3 3v18h18M7 14l4-5 4 3 5-7",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  plans: "M8 5H5v16h14V5h-3M8 3h8v4H8zM8 12h8M8 16h5",
  positions: "M4 7h16v14H4zM8 7V3h8v4M4 12h16M10 12v3h4v-3",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  plug: "M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
  bell: "M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9Zm4 12h4",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  up: "m6 14 6-6 6 6",
  shield: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 10 3 3 5-6",
  check: "m5 12 4 4L19 6",
  info: "M12 11v6m0-10v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  close: "m6 6 12 12M6 18 18 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  crosshair: "M12 2v5m0 10v5M2 12h5m10 0h5M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  trend: "m3 17 6-6 4 4 8-10m-6 0h6v6",
  line: "M3 12h18",
  pencil: "m4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4",
  camera: "M4 6h4l2-3h4l2 3h4v15H4V6Zm12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  image: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.01",
  search: "M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  filter: "M3 5h18l-7 8v7l-4-2v-5L3 5Z",
  server: "M3 3h18v7H3zM3 14h18v7H3zM7 6h.01M7 17h.01",
  monitor: "M3 3h18v14H3zM8 21h8m-4-4v4",
  database:
    "M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3ZM4 6v12c0 2 4 3 8 3s8-1 8-3V6M4 12c0 2 4 3 8 3s8-1 8-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  copy: "M8 8h13v13H8zM16 8V3H3v13h5",
  menu: "M3 6h18M3 12h18M3 18h18",
  pause: "M8 4v16M16 4v16",
  play: "m7 3 14 9-14 9V3Z",
  external: "M14 3h7v7M21 3 10 14M10 3H3v18h18v-7",
  wallet: "M3 5h16v4h3v10H3V5Zm13 7h6v4h-6v-4ZM3 5l13-3v3",
  lock: "M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
  history: "M3 3v6h6M4 8a9 9 0 1 1-1 7M12 7v6l4 2",
  logout: "M9 3H3v18h6m6-14 5 5-5 5m-7-5h12",
  bars: "M5 3v18m-2-9h4V6H3v6Zm9-10v18m-2-4h4V9h-4v7Zm9-13v18m-2-4h4V6h-4v11",
};
function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.info}"/></svg>`;
}
function esc(x) {
  return String(x ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}
const $ = (s, r = document) => r.querySelector(s);
const accountMoney = (v) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: state.account.currency || "USD",
    }).format(v);
  } catch {
    return money(v) + " " + state.account.currency;
  }
};
const money = (v, d = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : "—";
const signed = (v) => (v >= 0 ? "+" : "−") + "$" + money(Math.abs(v));
const timefmt = (v) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(v));
const datefmt = (v) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(v));
const stamp = () => new Date().toISOString();
const short = (id) =>
  String(id).length > 18
    ? String(id).slice(0, 8) + "…" + String(id).slice(-4)
    : String(id);
const uuid = () =>
  crypto.randomUUID?.() ||
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
const state = {
  route: "market",
  analyses: [],
  history: {},
  quote: null,
  configuration: null,
  unresolvedCount: 0,
  authFailed: false,
  renderPending: false,
  tf: "M15",
  tab: "positions",
  menu: false,
  mode: "demo",
  api: null,
  base: "",
  connection: null,
  symbol: "XAUUSD",
  account: {
    login: 10001,
    server: "Aurum Practice",
    mode: "demo",
    equity: 10017.98,
    currency: "USD",
    trade_allowed: true,
  },
  analysis: null,
  plans: [],
  positions: [],
  commands: [],
  events: [],
  uploads: [],
  horizon: 240,
  scenario: "waiting",
  query: "",
  page: 1,
  networkError: "",
  analysing: false,
  liveCandles: {},
  updatedAt: stamp(),
  pendingKeys: new Map(),
  busy: new Set(),
};
function sampleAnalysis(scenario = "waiting") {
  const blocked = scenario === "blocked",
    buy = scenario === "ready";
  return {
    id: "ana-demo-" + uuid().slice(0, 8),
    created_at: stamp(),
    expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    reassess_at: new Date(Date.now() + 30 * 60000).toISOString(),
    data: {
      symbol: state.symbol,
      timeframe: state.tf,
      horizon_minutes: state.horizon,
      bias: "bullish",
      action: buy ? "BUY" : "WAIT",
      proposed_side: "BUY",
      entry_condition: `Wait for a closed ${state.tf} candle above 4,033, then a bullish retest of the entry zone.`,
      entry_zone: [4030, 4033],
      entry_rule: {
        type: "CLOSE_ABOVE_THEN_RETEST",
        breakout_level: 4033,
        retest_zone: [4030, 4033],
        max_retest_bars: 4,
      },
      stop_loss: 4021,
      take_profits: [4051, 4064],
      invalidation: {
        type: "CANDLE_CLOSE_BELOW",
        timeframe: state.tf,
        price: 4021,
      },
      reassess_after_minutes: 30,
      missing_data: ["economic_calendar"],
      execution_blockers: blocked ? ["ECONOMIC_CALENDAR_UNAVAILABLE"] : [],
      rationale: blocked
        ? "The economic calendar is unavailable. The server must resolve this blocker before a trade can be submitted."
        : "The higher-timeframe structure remains constructive. A pullback into support may offer an entry, but a closed-candle confirmation is required. This is an illustrative demo setup, not a live signal.",
    },
    provenance: { model: "Illustrative demo", market_data_as_of: stamp() },
  };
}
function initDemo() {
  state.mode = "demo";
  state.analyses = [];
  state.history = {};
  state.quote = null;
  state.configuration = null;
  state.unresolvedCount = 0;
  state.authFailed = false;
  state.balance = 10000;
  state.api = null;
  state.connection = { id: "conn-practice", mode: "demo" };
  state.symbol = "XAUUSD";
  state.brokerBackend = "mock";
  state.liveCandles = {};
  state.networkError = "";
  state.account = {
    login: 10001,
    server: "Aurum Practice",
    mode: "demo",
    equity: 10017.98,
    currency: "USD",
    trade_allowed: true,
  };
  state.analysis = sampleAnalysis();
  state.positions = [
    {
      ticket: "108492731",
      symbol: "XAUUSD",
      side: "BUY",
      volume: 0.02,
      sl: 4014,
      tp: 4051,
      price_open: 4027.4,
      magic: 261026,
    },
    {
      ticket: "108492618",
      symbol: "XAUUSD",
      side: "SELL",
      volume: 0.01,
      sl: 4053,
      tp: 4018,
      price_open: 4040.6,
      magic: 261026,
    },
  ];
  const a = sampleAnalysis();
  state.plans = [
    {
      id: "plan-demo-4821",
      analysis_id: a.id,
      state: "MONITORING",
      analysis: a,
      data: { sizing: { volume_lots: 0.01 }, take_profit_index: 0 },
      created_at: stamp(),
    },
  ];
  state.commands = [];
  state.analyses = [state.analysis];
  state.events = [
    {
      title: "Market analysis completed",
      description: "M15 + H1 · Waiting for a confirmed retest",
      type: "spark",
      at: stamp(),
      state: "WAIT",
    },
    {
      title: "Trade plan is monitoring",
      description: "XAUUSD · Buy on confirmation · 0.01 lots",
      type: "plans",
      at: new Date(Date.now() - 4 * 60000).toISOString(),
      state: "MONITORING",
    },
    {
      title: "Practice position opened",
      description: "XAUUSD · Buy 0.02 lots at 4,027.40",
      type: "positions",
      at: new Date(Date.now() - 18 * 60000).toISOString(),
      state: "FILLED",
    },
    {
      title: "Practice terminal ready",
      description: "Demo account 10001 · Synthetic market data",
      type: "plug",
      at: new Date(Date.now() - 45 * 60000).toISOString(),
      state: "CONNECTED",
    },
  ];
}
initDemo();
let toastTimer, modalRestore, pollTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4500);
}
function notify(title, description, type = "activity", status = "") {
  if (state.mode === "api") return;
  state.events.unshift({
    id: uuid(),
    title,
    description,
    type,
    at: stamp(),
    state: status,
  });
  state.events = state.events.slice(0, 100);
}
function badge(value) {
  const tone = [
    "FILLED",
    "CLOSED",
    "UPDATED",
    "READY",
    "BUY",
    "CONNECTED",
    "PARTIALLY_CLOSED",
  ].includes(value)
    ? "green"
    : ["UNKNOWN", "REJECTED", "INVALIDATED", "BLOCKED"].includes(value)
      ? "red"
      : "amber";
  return `<span class="badge ${tone}"><span class="dot"></span>${esc(value.replaceAll("_", " "))}</span>`;
}
function empty(title, description, action = "") {
  return `<div class="empty">${icon("layers")}<h3>${title}</h3><p>${description}</p>${action}</div>`;
}
function currentPrice() {
  if (state.mode === "api")
    return (
      state.quote?.bid ?? state.liveCandles[state.tf]?.at(-1)?.close ?? NaN
    );
  const bars = state.liveCandles[state.tf];
  return bars?.length ? bars.at(-1).close : 4032.18;
}
function pnl(p) {
  return (
    (currentPrice() - p.price_open) *
    (p.side === "BUY" ? 1 : -1) *
    p.volume *
    100
  );
}
function navLink(route, label, ic, count) {
  return `<a href="#${route}" class="${state.route === route ? "active" : ""}" aria-label="${label}" ${state.route === route ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${count !== undefined ? `<span class="count">${count}</span>` : ""}</a>`;
}
function shell() {
  const routeTitles = {
    market: "Market workspace",
    analysis: "AI analysis",
    plans: "Trade plans",
    positions: "Positions",
    activity: "Activity",
    connection: "Connection",
    api: "API reference",
  };
  document.title = `${routeTitles[state.route] || "Workspace"} — Aurum`;
  return `<div class="shell ${state.menu ? "menu-open" : ""}"><button onclick="window.aurumAction(event)" class="drawer-backdrop" data-action="menu" aria-label="Close navigation"></button>
 <aside class="sidebar" aria-label="Main navigation" ${window.matchMedia("(max-width:600px)").matches && !state.menu ? "inert" : ""}><a class="brand" href="#market"><span class="brand-mark">${icon("trend")}</span><span>aurum<span class="gold">.</span></span></a><p class="nav-label">Workspace</p><nav class="nav">${navLink("market", "Market workspace", "chart")}${navLink("analysis", "AI analysis", "spark")}${navLink("plans", "Trade plans", "plans", state.plans.filter((p) => p.state === "MONITORING").length)}${navLink("positions", "Positions", "positions", state.positions.length)}${navLink("activity", "Activity", "activity")}</nav><div class="nav-divider"></div><p class="nav-label">Manage</p><nav class="nav">${navLink("connection", "Connection", "plug")}${navLink("api", "API reference", "code")}</nav><div class="sidebar-bottom"><div class="terminal-mini"><div class="row between"><span class="row"><span class="dot positive"></span>${state.mode === "demo" ? "Practice terminal" : "MT5 terminal"}</span><span class="badge ${state.account.mode === "real" ? "red" : "amber"}">${state.account.mode.toUpperCase()}</span></div><div class="row between muted small"><span class="mono">${esc(state.account.login)}</span><span>${state.mode === "demo" ? "Simulation ready" : "Account linked"}</span></div></div><div class="sidebar-user"><div class="avatar">PM</div><div class="grow"><p>Panha's workspace</p><small>Personal trading account</small></div><button onclick="window.aurumAction(event)" class="icon-button" data-action="settings" aria-label="Open workspace settings">${icon("settings")}</button></div></div></aside>
 <div class="workspace"><header class="topbar"><div class="row"><button onclick="window.aurumAction(event)" class="icon-button mobile-menu" data-action="menu" aria-label="Open navigation" aria-expanded="${state.menu}">${icon("menu")}</button><div class="breadcrumb"><span>Workspace</span><span class="subtle">/</span><span>${routeTitles[state.route]}</span></div></div><div class="topbar-actions"><time class="mono muted">${timefmt(Date.now())} <span class="subtle">UTC+7</span></time><button onclick="window.aurumAction(event)" class="mode-chip" data-action="${state.mode === "demo" ? "scenarios" : "connection"}"><span class="dot"></span>${state.mode === "demo" ? "Demo workspace" : state.account.mode === "real" ? "Real account" : state.brokerBackend === "mock" ? "API · mock broker" : "MT5 demo account"}${icon("down")}</button><div class="separator"></div><button onclick="window.aurumAction(event)" class="icon-button" data-action="settings" aria-label="Connection settings">${icon("settings")}</button></div></header>
 <main id="main" class="content" tabindex="-1">${state.networkError ? `<div class="status-banner red">${icon("info")}<div><strong>Connection needs attention</strong><p>${esc(state.networkError)}. Data may be stale. Trading actions are paused.</p></div><button onclick="window.aurumAction(event)" class="button ghost" data-action="refresh">Retry</button></div>` : ""}${page()}</main></div></div>`;
}
function pageHeading(title, desc, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${desc}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function footer() {
  return `<footer class="page-footer"><span>${icon("shield")}${state.mode === "demo" ? "Demo workspace · All prices and executions are simulated." : "Broker data snapshot · Verify command outcomes before taking another action."}</span><span>AURUM TERMINAL <span class="subtle">v2.0</span></span></footer>`;
}
function page() {
  switch (state.route) {
    case "analysis":
      return analysisPage();
    case "plans":
      return plansPage();
    case "positions":
      return positionsPage();
    case "activity":
      return activityPage();
    case "connection":
      return connectionPage();
    case "api":
      return apiPage();
    default:
      return marketPage();
  }
}
function marketPage() {
  return `${pageHeading("Market workspace", "A clear view of the market. A deliberate next move.", `<button onclick="window.aurumAction(event)" class="button ghost" data-action="refresh">${icon("refresh")}Refresh</button><button onclick="window.aurumAction(event)" class="button primary" data-action="analyse">${icon("spark")}Analyse market</button>`)}<div class="workspace-grid"><div><section class="panel" aria-label="Gold market chart">${marketChart()}</section><div class="insight-strip"><div class="insight">${icon("wallet")}<div><h3>Account equity</h3><p class="mono">${state.mode === "demo" ? "$" + money(state.balance + state.positions.reduce((v, p) => v + pnl(p), 0)) : accountMoney(state.account.equity)}</p><small>${state.mode === "demo" ? "Practice account" : "Broker-reported equity"}</small></div></div><div class="insight">${icon("positions")}<div><h3>Open positions</h3><p>${state.positions.length} <span class="muted small">positions</span></p><small>${state.mode === "demo" ? signed(state.positions.reduce((s, p) => s + pnl(p), 0)) + " unrealised" : "Latest terminal snapshot"}</small></div></div><div class="insight">${icon("plans")}<div><h3>Active trade plans</h3><p>${state.plans.filter((p) => p.state === "MONITORING").length} <span class="muted small">monitoring</span></p><small>Entry conditions checked by worker</small></div></div></div><section class="panel workspace-lower" aria-label="Positions and trade plans"><div class="section-tabs" role="group" aria-label="Workspace data"><button onclick="window.aurumAction(event)" data-action="tab" data-tab="positions" class="${state.tab === "positions" ? "selected" : ""}">Open positions <span class="tab-count">${state.positions.length}</span></button><button onclick="window.aurumAction(event)" data-action="tab" data-tab="plans" class="${state.tab === "plans" ? "selected" : ""}">Trade plans <span class="tab-count">${state.plans.length}</span></button><button onclick="window.aurumAction(event)" data-action="tab" data-tab="activity" class="${state.tab === "activity" ? "selected" : ""}">Recent activity</button><a href="#${state.tab === "activity" ? "activity" : state.tab === "plans" ? "plans" : "positions"}" class="small muted" style="margin-left:auto">View all ${icon("chevron")}</a></div>${state.tab === "positions" ? positionsTable(state.positions.slice(0, 3), true) : state.tab === "plans" ? plansTable() : activityList(state.events.slice(0, 3))}</section></div><aside>${analysisCard()}<div class="stack" style="margin-top:18px"><section class="panel"><div class="risk-panel"><div class="row between"><h2>Execution guardrails</h2>${icon("shield", "positive")}</div><div class="risk-row"><span>Execution mode</span><b>${state.mode === "demo" ? "Simulated" : state.account.mode === "real" ? "Real account" : "Broker demo"}</b></div><div class="risk-row"><span>Entries per analysis</span><b>1 maximum</b></div><div class="risk-row"><span>Order validation</span><b>Server-side</b></div><div class="risk-row"><span>Max position size</span><b>${state.configuration ? money(state.configuration.max_volume_lots) : "0.10"} lots</b></div><div class="risk-row"><span>Max risk per entry</span><b>${state.configuration ? state.configuration.max_risk_percent : "1"}%</b></div><div style="height:1px;background:var(--border);margin-top:14px"></div><p class="hint" style="margin-top:9px">SL, TP, spread and volume are checked before execution.</p></div><div class="help-box">${icon("info")}<span>AI suggests a setup. Your trade plan defines when an order can be sent.</span></div></section></div></aside></div>${footer()}`;
}
function demoCandles(tf) {
  let seed = TIMEFRAMES.indexOf(tf) + 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const bars = [];
  let prev = 4008;
  const sec = { M5: 300, M10: 600, M15: 900, M30: 1800, H1: 3600, H4: 14400 }[
    tf
  ];
  const end = Math.floor(Date.now() / 1000 / sec) * sec;
  for (let i = 0; i < 66; i++) {
    const target =
      4008 + i * 0.44 + Math.sin(i * 0.16) * 7 + Math.sin(i * 0.46) * 2;
    const open = prev;
    const close = target + (rnd() - 0.5) * 4;
    const high = Math.max(open, close) + rnd() * 3.1;
    const low = Math.min(open, close) - rnd() * 3.3;
    bars.push({
      time: end - (66 - i) * sec,
      open,
      high,
      low,
      close,
      tick_volume: 80 + Math.floor(rnd() * 360),
    });
    prev = close;
  }
  const d = 4032.18 - bars.at(-1).close;
  for (const b of bars) {
    b.open += d;
    b.close += d;
    b.low += d;
    b.high += d;
  }
  return bars;
}
function marketChart() {
  const live = state.mode === "api";
  const lastBar = chartBars().at(-1);
  return `<div class="market-head"><div class="instrument"><div class="gold-symbol">Au</div><div><div class="row"><h2>${esc(state.symbol.replace("XAUUSD", "XAU / USD"))}</h2><span class="badge ${live ? "green" : "amber"}">${live ? (state.brokerBackend === "mock" ? "API MOCK" : "SNAPSHOT") : "DEMO DATA"}</span></div><p>Gold / US Dollar · ${live ? (state.brokerBackend === "mock" ? "Server mock data" : "MT5 broker") : "Illustrative market"}</p></div></div><div class="market-price"><strong>${money(currentPrice())}</strong><p class="${live ? "muted" : "positive"}">${live ? "Last closed candle" : "+25.24 (+0.63%)"} <span class="subtle">${live ? "" : "today · demo"}</span></p></div></div><div class="market-stats"><div><span>Bid / Ask</span><strong>${live ? money(state.quote?.bid) + " / " + money(state.quote?.ask) : "4,032.18 / 4,032.38"}</strong></div><div><span>${live ? "Data source" : "Day range"}</span><strong>${live ? "MT5 closed candles" : "3,998.40 — 4,051.20"}</strong></div><div><span>${live ? "Candles" : "Spread"}</span><strong>${live ? (state.liveCandles[state.tf]?.length ?? 0) : "20 pts"}</strong></div><div><span>Time zone</span><strong>UTC+7</strong></div></div><div class="chart-toolbar"><div class="timeframes" role="group" aria-label="Chart timeframe">${TIMEFRAMES.map((t) => `<button onclick="window.aurumAction(event)" data-action="timeframe" data-tf="${t}" class="${state.tf === t ? "selected" : ""}" aria-pressed="${state.tf === t}">${t}</button>`).join("")}</div><div class="toolbar-extra"><span class="chart-controls-label">${icon("bars")}</span><button onclick="window.aurumAction(event)" class="button" data-action="chart-data">${icon("code")}Candle data</button><button onclick="window.aurumAction(event)" class="icon-button" data-action="capture" aria-label="Use chart as analysis screenshot" title="Use chart screenshot">${icon("camera")}</button><button onclick="window.aurumAction(event)" class="icon-button" data-action="expand-chart" aria-label="Expand chart" title="Expand chart">${icon("expand")}</button></div></div><div class="chart-wrap"><div class="drawing-tools" aria-label="Chart tools"><button onclick="window.aurumAction(event)" class="icon-button gold" data-action="crosshair" aria-label="Inspect candle" title="Inspect a candle">${icon("crosshair")}</button><button onclick="window.aurumAction(event)" class="icon-button" data-action="toggle-levels" aria-label="Toggle analysis levels" title="Toggle analysis levels">${icon("line")}</button><button onclick="window.aurumAction(event)" class="icon-button" data-action="chart-data" aria-label="View candle data" title="Candle data">${icon("bars")}</button><button onclick="window.aurumAction(event)" class="icon-button" data-action="capture" aria-label="Capture chart" title="Capture chart">${icon("camera")}</button></div><div class="chart-area"><div class="chart-legend"><strong>${esc(state.symbol)} · ${state.tf}</strong><span class="positive">${live ? "Closed candles" : `O ${money(lastBar?.open)} H ${money(lastBar?.high)} L ${money(lastBar?.low)} C ${money(lastBar?.close)}`}</span></div><div class="chart-watermark">XAUUSD</div>${chartSvg()}<div class="chart-crosshair"></div><div class="chart-hover"></div></div></div><div class="chart-caption"><span>${icon("clock")}Closed candles · ${live ? "Broker snapshot" : "Illustrative chart"}</span><span>${live ? "Refresh for latest data" : "Gold spot · Prices in USD"}</span></div><div class="chart-bottom"><div><span class="row"><span class="dot positive"></span>${live ? (state.brokerBackend === "mock" ? "Server mock snapshot" : "MT5 snapshot") : "Simulation running"}</span><span>${live ? "Updated " + timefmt(state.updatedAt) : "Not a live price feed"}</span></div><span class="mono">${state.tf} / UTC+7</span></div>`;
}
let showLevels = true;
function chartBars() {
  return state.mode === "demo"
    ? demoCandles(state.tf)
    : state.liveCandles[state.tf] || [];
}
function chartSvg(large = false) {
  if (!chartBars().length)
    return `<svg class="chart-svg" viewBox="0 0 900 385" role="img" aria-label="No broker candle data available"><text x="450" y="190" text-anchor="middle" style="fill:var(--muted);font-size:14px">No broker candles available. Refresh the terminal connection.</text></svg>`;
  const phone = window.matchMedia("(max-width:600px)").matches && !large;
  const bars = chartBars().slice(phone ? -36 : -66),
    w = phone ? 480 : 900,
    h = 385,
    left = 10,
    right = 76,
    top = 44,
    bottom = 72,
    usable = w - left - right,
    plot = h - top - bottom;
  let min = Math.min(...bars.map((b) => b.low)),
    max = Math.max(...bars.map((b) => b.high));
  const a = state.analysis?.data;
  if (showLevels && state.mode === "demo") {
    min = Math.min(min, a?.stop_loss ?? min) - 3;
    max = Math.max(max, a?.take_profits?.[0] ?? max) + 4;
  } else {
    min -= 2;
    max += 2;
  }
  const y = (v) => top + ((max - v) / (max - min)) * plot;
  const step = usable / bars.length;
  let out = `<svg class="chart-svg" id="candle-chart" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">${esc(state.symbol)} ${state.tf} candlestick chart</title><desc id="chart-desc">${state.mode === "demo" ? "Illustrative synthetic" : "Broker-reported closed"} candles. Use Candle data for numerical values. Green candles close above their open; red candles close below it.</desc>`;
  for (let i = 0; i < 6; i++) {
    const v = max - (i * (max - min)) / 5,
      yy = y(v);
    out += `<line x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}" stroke="#2a303a" stroke-opacity=".7"/><text x="${w - right + 12}" y="${yy + 3}">${money(v)}</text>`;
  }
  for (let i = 0; i < bars.length; i += 11) {
    const x = left + i * step + step / 2;
    out += `<line x1="${x}" y1="${top - 10}" x2="${x}" y2="${h - 34}" stroke="#2a303a" stroke-opacity=".6"/><text x="${x}" y="${h - 10}" text-anchor="middle">${timefmt(bars[i].time * 1000)}</text>`;
  }
  if (showLevels && a?.entry_zone) {
    const lo = a.entry_zone[0],
      hi = a.entry_zone[1];
    if (y(hi) > top - 20 && y(lo) < h - bottom + 20)
      out += `<rect x="${left}" y="${y(hi)}" width="${usable}" height="${Math.max(y(lo) - y(hi), 2)}" fill="#e8c47d" fill-opacity=".055"/><line x1="${left}" y1="${y(lo)}" x2="${w - right}" y2="${y(lo)}" stroke="#e8c47d" stroke-opacity=".5" stroke-dasharray="4 5"/><text x="${left + 10}" y="${y(hi) - 6}" style="fill:#c7a768;font-size:8px">ENTRY ZONE</text>`;
  }
  const maxVol = Math.max(...bars.map((b) => b.tick_volume || 1));
  bars.forEach((b, i) => {
    const x = left + i * step + step / 2,
      up = b.close >= b.open,
      color = up ? "#6ac7a5" : "#d97681",
      body = Math.max(1.6, Math.abs(y(b.close) - y(b.open)));
    out += `<line x1="${x}" y1="${y(b.high)}" x2="${x}" y2="${y(b.low)}" stroke="${color}" stroke-width="1.1"/><rect x="${x - step * 0.27}" y="${Math.min(y(b.open), y(b.close))}" width="${step * 0.54}" height="${body}" fill="${color}" rx=".3"/><rect x="${x - step * 0.27}" y="${h - 35 - ((b.tick_volume || 1) / maxVol) * 26}" width="${step * 0.54}" height="${((b.tick_volume || 1) / maxVol) * 26}" fill="${color}" fill-opacity=".2"/>`;
  });
  if (showLevels && a) {
    for (const [value, label, color] of [
      [a.stop_loss, "SL", "#f38e94"],
      [a.take_profits?.[0], "TP1", "#6dd5ad"],
    ])
      if (value && y(value) >= top - 5 && y(value) < h - bottom + 15)
        out += `<line x1="${left}" y1="${y(value)}" x2="${w - right}" y2="${y(value)}" stroke="${color}" stroke-opacity=".55" stroke-dasharray="4 5"/><rect x="${w - right - 86}" y="${y(value) - 10}" width="84" height="18" rx="3" fill="#14181e"/><text x="${w - right - 80}" y="${y(value) + 2}" style="fill:${color};font-size:8px">${label} ${money(value)}</text>`;
  }
  const last = bars.at(-1)?.close ?? 4032.18,
    yy = y(last);
  out += `<line x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}" stroke="#6dd5ad" stroke-opacity=".5" stroke-dasharray="2 4"/><rect x="${w - right + 1}" y="${yy - 10}" width="73" height="21" rx="3" fill="#6dd5ad"/><text x="${w - right + 8}" y="${yy + 4}" style="fill:#10281f;font-size:10px;font-weight:600">${money(last)}</text></svg>`;
  return out;
}
function analysisCard() {
  const analysis = state.analysis;
  if (!analysis)
    return `<section class="panel analysis-panel"><div class="analysis-head row">${icon("spark")}<h2>AI market analysis</h2></div>${empty("Your next move starts here", "Send a chart screenshot to review a structured market setup.", `<button onclick="window.aurumAction(event)" class="button primary" data-action="analyse">Analyse market</button>`)}</section>`;
  const a = analysis.data,
    blocked = executionBlocker(analysis, state.mode),
    ready = a.action === "BUY" || a.action === "SELL";
  const ratio =
    a.entry_zone && a.stop_loss && a.take_profits.length
      ? Math.abs(
          (a.take_profits[0] - (a.entry_zone[0] + a.entry_zone[1]) / 2) /
            ((a.entry_zone[0] + a.entry_zone[1]) / 2 - a.stop_loss),
        )
      : null;
  return `<section class="panel analysis-panel" aria-label="AI analysis result"><div class="analysis-head"><div class="row between"><div class="row"><div class="ai-icon">${icon("spark")}</div><h2>AI market analysis</h2></div><button onclick="window.aurumAction(event)" class="icon-button" data-action="analysis-details" aria-label="View analysis details">${icon("more")}</button></div><p>${state.mode === "demo" ? "Illustrative setup" : esc(analysis.provenance?.model || "AI model")} <span class="subtle">·</span> ${a.timeframe} ${state.mode === "demo" && a.timeframe !== "H1" ? "+ H1" : ""} <span class="subtle">·</span> ${timefmt(analysis.created_at)}</p></div><div class="analysis-status"><div class="row between"><span class="label">Suggested action</span>${icon(blocked ? "lock" : ready ? "check" : "clock", blocked ? "negative" : "gold")}</div><h3>${blocked ? "Execution blocked" : ready ? `${a.action === "BUY" ? "Buy" : "Sell"} setup ready` : "Wait for confirmation"}</h3><p>${blocked ? esc(blocked) : ready ? "Entry conditions are met in this example. Review the price and execution limits before submitting." : `Wait for a closed ${a.timeframe} candle above the breakout level, then a confirmed retest.`}</p></div><div class="analysis-meta"><div><span>Market bias</span><strong class="${a.bias === "bullish" ? "positive" : a.bias === "bearish" ? "negative" : "muted"}">${a.bias === "bullish" ? "↗ " : a.bias === "bearish" ? "↘ " : ""}${a.bias[0].toUpperCase() + a.bias.slice(1)}</strong></div><div><span>Trade horizon</span><strong>${a.horizon_minutes >= 60 ? a.horizon_minutes / 60 + " hours" : a.horizon_minutes + " minutes"}</strong></div><div><span>Risk / reward</span><strong class="mono">${ratio ? "1 : " + ratio.toFixed(1) : "—"}</strong></div></div><div class="levels"><div class="level-row"><label><span class="level-dot entry"></span>Entry zone</label><strong class="gold">${a.entry_zone ? a.entry_zone.map((v) => money(v, 0)).join(" – ") : "Not set"}</strong></div><div class="level-row"><label><span class="level-dot stop"></span>Stop loss</label><strong>${a.stop_loss ? money(a.stop_loss) : "Not set"}</strong></div>${a.take_profits.map((v, i) => `<div class="level-row"><label><span class="level-dot profit"></span>Take profit ${i + 1}</label><strong>${money(v)}</strong></div>`).join("")}</div><div class="analysis-explain"><span class="eyebrow">The setup</span><p>${a.invalidation ? `Invalidated if a closed ${a.invalidation.timeframe} candle moves ${a.invalidation.type === "CANDLE_CLOSE_BELOW" ? "below" : "above"} ${money(a.invalidation.price)}. Reassess in ${a.reassess_after_minutes} minutes.` : "No executable entry conditions were identified."}</p></div><div class="analysis-footer"><button onclick="window.aurumAction(event)" class="button primary full" data-action="review-trade">${icon(ready ? "arrow" : "plans")}${ready ? "Review order" : "Review trade plan"}${icon("arrow")}</button><div class="analysis-footnote"><span>${blocked ? "Resolve blockers before execution" : "One entry · Server risk checks"}</span><button onclick="window.aurumAction(event)" class="details-toggle" data-action="analysis-details">Details ${icon("chevron")}</button></div></div><div class="mini-note">${icon("info")} ${state.mode === "demo" ? "Simulated setup. No real order will be placed." : "AI analysis is uncertain. No guaranteed win rate."}</div></section>`;
}
function positionsTable(rows, compact = false) {
  if (!rows.length)
    return empty(
      "No open positions",
      "Your positions appear here after the broker confirms an entry.",
      `<button onclick="window.aurumAction(event)" class="button ghost" data-action="analyse">${icon("spark")}Analyse market</button>`,
    );
  return `<div class="table-wrap"><table><thead><tr><th>Symbol / side</th><th>Lots</th><th>Entry price</th>${compact ? "" : "<th>Stop loss</th><th>Take profit</th>"}<th>Unrealised P/L</th><th style="text-align:right">Manage</th></tr></thead><tbody>${rows.map((p) => `<tr><td><div class="table-symbol"><span class="gold-symbol">Au</span><strong>${esc(p.symbol)}</strong><span class="side-indicator ${p.side === "SELL" ? "sell" : ""}">${p.side}</span></div></td><td class="mono">${money(p.volume)}</td><td class="mono">${money(p.price_open)}</td>${compact ? "" : `<td class="mono">${money(p.sl)}</td><td class="mono">${money(p.tp)}</td>`}<td class="mono ${state.mode === "demo" ? (pnl(p) >= 0 ? "positive" : "negative") : ""}">${state.mode === "demo" ? signed(pnl(p)) : Number.isFinite(p.profit) ? accountMoney(p.profit) : "Unavailable"}</td><td><div class="table-actions" style="justify-content:flex-end"><button onclick="window.aurumAction(event)" class="icon-button" data-action="protection" data-ticket="${esc(p.ticket)}" ${state.mode === "api" && p.magic !== 261026 ? 'disabled title="Only app-created positions can be modified"' : ""} aria-label="Edit protection for position ${esc(p.ticket)}" title="Edit SL / TP">${icon("settings")}</button><button onclick="window.aurumAction(event)" class="button ghost" data-action="close-position" data-ticket="${esc(p.ticket)}" ${state.mode === "api" && p.magic !== 261026 ? 'disabled title="Only app-created positions can be closed"' : ""}>Close</button></div></td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>${rows.length} position${rows.length === 1 ? "" : "s"} · ${state.mode === "demo" ? "Practice account" : "Worker snapshot"}</span><span class="row">${icon("refresh")}${state.mode === "demo" ? "Simulated values" : "Updated " + timefmt(state.updatedAt)}</span></div>`;
}
function plansTable() {
  return state.plans.length
    ? `<div class="table-wrap"><table><thead><tr><th>Symbol / direction</th><th>Entry</th><th>Lots</th><th>Status</th><th></th></tr></thead><tbody>${state.plans
        .slice(0, 3)
        .map(
          (p) =>
            `<tr><td><strong>${esc(state.symbol)}</strong> <span class="side-indicator">${esc(p.analysis?.data?.proposed_side || "BUY")}</span></td><td class="mono">${p.analysis?.data?.entry_zone?.map((v) => money(v, 0)).join(" – ") || "From analysis"}</td><td class="mono">${money(p.data.sizing.volume_lots)}</td><td>${badge(p.state)}</td><td><a href="#plans">View plan →</a></td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : empty(
        "No trade plans yet",
        "Create a conditional plan from an eligible analysis.",
      );
}
function activityList(events) {
  return events.length
    ? `<div class="activity-list">${events.map((e) => `<div class="activity-item"><div class="activity-icon">${icon(e.type)}</div><div class="grow"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></div><span class="time">${timefmt(e.at)}</span></div>`).join("")}</div>`
    : empty(
        "No activity yet",
        "Analysis results and execution updates will appear here.",
      );
}
function analysisPage() {
  return `${pageHeading("AI market analysis", "Bring your chart. Review the setup before you act.", `<button onclick="window.aurumAction(event)" class="button ghost" data-action="capture">${icon("camera")}Use current chart</button>`)}<div class="analysis-layout"><div class="stack"><section class="panel"><div class="panel-head"><h2>Analysis inputs</h2><span class="badge amber">${state.tf} · ${state.symbol}</span></div><div class="form-section"><div class="form-grid"><div class="field"><label for="analysis-timeframe">Primary timeframe</label><select id="analysis-timeframe" data-change="analysis-tf">${TIMEFRAMES.map((t) => `<option ${t === state.tf ? "selected" : ""}>${t}</option>`).join("")}</select><small>Duration of each candle</small></div><div class="field"><label for="analysis-horizon">Analysis horizon</label><select id="analysis-horizon" data-change="horizon">${[
    [30, "Next 30 minutes"],
    [60, "Next hour"],
    [240, "Next 4 hours"],
    [480, "Next 8 hours"],
    [1440, "Next 24 hours"],
  ]
    .map(
      ([v, label]) =>
        `<option value="${v}" ${v === state.horizon ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select><small>Scenario window, not a target deadline</small></div></div></div><div class="form-section"><div class="row between" style="margin-bottom:15px"><h3 style="margin:0">Chart screenshots</h3><span class="small muted">${state.uploads.length} / 6 images</span></div><div class="upload-zone" id="upload-zone"><input id="chart-files" type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" aria-label="Choose chart screenshots">${icon("upload")}<h3>Give your analysis the full picture</h3><p>Drag charts here, or choose screenshots from your device.</p><button onclick="window.aurumAction(event)" class="button" data-action="browse">${icon("image")}Choose screenshots</button><span class="hint">PNG, JPG or WebP · Up to 8 MB each · Max 6 files</span></div><div id="upload-error" class="field-error" role="status"></div><div class="upload-list">${state.uploads.map((u, i) => `<div class="upload-item"><img class="upload-thumb" src="${esc(u.preview)}" alt="Selected chart screenshot ${i + 1}"><div class="grow"><p class="filename">${esc(u.file.name)}</p><span class="hint">${Math.round(u.file.size / 1024)} KB</span></div><div class="field"><label for="upload-tf-${i}">Timeframe</label><select id="upload-tf-${i}" data-change="upload-tf" data-index="${i}">${TIMEFRAMES.map((t) => `<option ${t === u.tf ? "selected" : ""}>${t}</option>`).join("")}</select></div><button onclick="window.aurumAction(event)" class="icon-button" data-action="remove-upload" data-index="${i}" aria-label="Remove ${esc(u.file.name)}">${icon("close")}</button></div><div class="field" style="margin-left:63px"><label for="capture-${i}">Actual capture time (device time)</label><input id="capture-${i}" type="datetime-local" data-change="capture-time" data-index="${i}" value="${esc(localDate(u.captured))}"></div>`).join("")}</div></div><div class="form-section"><h3>Context included</h3><div class="evidence-grid"><div class="evidence-item row">${icon("check", "positive")}<div>Closed candle data<small>${state.mode === "demo" ? "Synthetic demo candles" : "From the MT5 worker"}</small></div></div><div class="evidence-item row">${icon("check", "positive")}<div>Numerical indicators<small>RSI and ATR calculated by server</small></div></div></div><div class="notice amber" style="margin-top:14px">${icon("info")} <strong>Economic calendar unavailable.</strong> The server determines whether this missing context blocks execution. No news events are inferred.</div></div><div class="form-section"><button onclick="window.aurumAction(event)" class="button primary full" data-action="run-analysis" ${state.analysing ? "disabled" : ""}>${state.analysing ? '<span class="spinner"></span> Analysing chart…' : icon("spark") + " Run analysis"}</button><p class="hint" style="text-align:center;margin-top:10px">${state.mode === "demo" ? "Demo analysis uses an illustrative result. No AI request or trade is sent." : "Screenshots are sent through your FastAPI server to its configured AI model."}</p><div id="analysis-error" class="field-error" role="status"></div></div></section><section class="panel"><div class="panel-head"><h2>What you’ll get back</h2>${icon("plans", "muted")}</div><div class="panel-body"><ul class="info-list"><li>${icon("check")}<div><strong>A conditional market view</strong><small>Direction, entry zone and the confirmation required.</small></div></li><li>${icon("check")}<div><strong>A defined exit and invalidation</strong><small>Stop loss, take-profit alternatives and when to reassess.</small></div></li><li>${icon("check")}<div><strong>Clear limitations</strong><small>Missing data and execution blockers. No invented win rate.</small></div></li></ul></div></section></div><aside>${analysisCard()}</aside></div>${analysisHistory()}${footer()}`;
}
function plansPage() {
  const monitoring = state.plans.filter((p) => p.state === "MONITORING").length;
  return `${pageHeading("Trade plans", "Let conditions lead. Keep every entry intentional.", `<button onclick="window.aurumAction(event)" class="button primary" data-action="review-trade">${icon("plans")}New trade plan</button>`)}<div class="summary-grid"><div class="summary-card"><span class="muted">Monitoring</span><strong>${monitoring}</strong><small>Watching closed-candle conditions</small></div><div class="summary-card"><span class="muted">Entries per plan</span><strong>01</strong><small>One analysis. One reservation.</small></div><div class="summary-card"><span class="muted">Needs attention</span><strong class="${state.plans.some((p) => ["UNKNOWN", "BLOCKED", "REASSESS_REQUIRED"].includes(p.state)) ? "negative" : ""}">${state.plans.filter((p) => ["UNKNOWN", "BLOCKED", "REASSESS_REQUIRED"].includes(p.state)).length}</strong><small>Review before another entry</small></div></div><div class="page-grid"><section class="plan-list">${state.plans.length ? state.plans.map((p) => planCard(p)).join("") + historyMore("plans") : empty("Your first trade plan", "Analyse a chart, then review an eligible conditional setup.", `<a class="button primary" href="#analysis">Analyse market</a>`)}</section><aside class="panel"><div class="panel-head"><h2>How a plan works</h2>${icon("info", "muted")}</div><div class="panel-body"><ul class="info-list"><li>${icon("check")}<div><strong>Wait for the breakout</strong><small>A closed candle must pass the specified level.</small></div></li><li>${icon("clock")}<div><strong>Confirm the retest</strong><small>A later candle touches the zone and confirms the direction.</small></div></li><li>${icon("shield")}<div><strong>Validate before execution</strong><small>The worker checks live price, spread, SL/TP and account limits.</small></div></li></ul><div class="notice" style="margin-top:15px">A monitoring plan is not an open position. Cancel it before it enters the execution queue.</div></div></aside></div>${footer()}`;
}
function planCard(p) {
  const a = p.analysis?.data || state.analysis?.data;
  return `<article class="plan-card"><div class="row between"><div class="instrument"><div class="gold-symbol">Au</div><div><h2>${esc(a?.symbol || state.symbol)} <span class="side-indicator">${esc(a?.proposed_side || "BUY")}</span></h2><p>${a?.timeframe || state.tf} · Conditional entry</p></div></div>${badge(p.state)}</div><p class="description">${esc(a?.entry_condition || "Conditions are stored in the saved analysis.")}</p><div class="plan-numbers"><div><span>Entry zone</span><strong class="gold">${a?.entry_zone?.map((v) => money(v, 0)).join(" – ") || "—"}</strong></div><div><span>Stop loss</span><strong>${a?.stop_loss ? money(a.stop_loss) : "—"}</strong></div><div><span>Take profit</span><strong>${a?.take_profits?.length ? money(a.take_profits[p.data.take_profit_index || 0]) : "—"}</strong></div><div><span>Position size</span><strong>${money(p.data.sizing.volume_lots)} lots</strong></div></div><div class="plan-steps"><div class="plan-step done">Setup reviewed</div><div class="plan-step ${p.state === "MONITORING" ? "current" : ["QUEUED", "SUBMITTING", "FILLED", "PARTIALLY_FILLED"].includes(p.state) ? "done" : ""}">Breakout & retest</div><div class="plan-step ${["FILLED", "PARTIALLY_FILLED"].includes(p.state) ? "done" : ""}">Broker execution</div></div>${p.reason ? `<div class="notice red" style="margin-bottom:14px">${esc(p.reason)}</div>` : ""}<div class="card-footer"><span class="mono">${esc(short(p.id))}</span><div class="row">${state.mode === "demo" && p.state === "MONITORING" ? `<button onclick="window.aurumAction(event)" class="button ghost" data-action="simulate-trigger" data-id="${esc(p.id)}">${icon("play")}Simulate trigger</button>` : ""}<button onclick="window.aurumAction(event)" class="button ghost" data-action="plan-details" data-id="${esc(p.id)}">Details</button>${["MONITORING", "PAUSED"].includes(p.state) ? `<button onclick="window.aurumAction(event)" class="button ghost" data-action="plan-control" data-control="${p.state === "PAUSED" ? "resume" : "pause"}" data-id="${esc(p.id)}">${p.state === "PAUSED" ? "Resume" : "Pause"}</button><button onclick="window.aurumAction(event)" class="button danger" data-action="cancel-plan" data-id="${esc(p.id)}">Cancel plan</button>` : ""}</div></div></article>`;
}
function positionsPage() {
  const sum = state.positions.reduce((v, p) => v + pnl(p), 0);
  return `${pageHeading("Open positions", "Manage exposure. Know exactly what is still open.", `<button onclick="window.aurumAction(event)" class="button ghost" data-action="refresh">${icon("refresh")}Refresh positions</button>`)}<div class="summary-grid"><div class="summary-card"><span class="muted">Open positions</span><strong>${state.positions.length}</strong><small>Account ${esc(state.account.login)}</small></div><div class="summary-card"><span class="muted">Total volume</span><strong>${money(state.positions.reduce((v, p) => v + p.volume, 0))}<span class="small muted"> lots</span></strong><small>Across all displayed positions</small></div><div class="summary-card"><span class="muted">${state.mode === "demo" ? "Unrealised P/L" : "Data updated"}</span><strong class="${state.mode === "demo" ? "positive" : ""}">${state.mode === "demo" ? signed(sum) : timefmt(state.updatedAt)}</strong><small>${state.mode === "demo" ? "Illustrative mark-to-market" : "UTC+7 · Snapshot, not a live stream"}</small></div></div>${state.commands.some((c) => c.state === "UNKNOWN") ? `<div class="status-banner red">${icon("info")}<div><strong>Uncertain execution requires reconciliation</strong><p>A command has an unknown outcome. New entries are blocked. Check broker history before any retry.</p></div><a class="button danger" href="#activity">Inspect activity</a></div>` : ""}<section class="panel"><div class="toolbar"><div class="search">${icon("search")}<input id="position-search" placeholder="Search symbol or ticket…" aria-label="Search positions" value="${esc(state.query)}">${state.query ? `<button onclick="window.aurumAction(event)" class="icon-button" data-action="clear-search" aria-label="Clear position search">${icon("close")}</button>` : ""}</div><span class="badge ${state.account.mode === "real" ? "red" : "amber"}">${state.account.mode.toUpperCase()} ACCOUNT</span></div><div id="position-results">${positionResults()}</div></section><div class="notice" style="margin-top:18px">${icon("info")} Closing a position creates a command. The position remains open until the broker confirms the close. Partial fills are shown in activity. Only positions opened by this app can be modified.</div>${footer()}`;
}
function positionResults() {
  const q = state.query.toLowerCase();
  const matches = state.positions.filter((p) =>
    `${p.symbol} ${p.ticket} ${p.side}`.toLowerCase().includes(q),
  );
  const size = 8,
    start = (state.page - 1) * size;
  return `${matches.length ? positionsTable(matches.slice(start, start + size)) : empty(state.query ? "No matching positions" : "No open positions", state.query ? "Try another symbol or ticket number." : "Confirmed open positions will appear here.")}<div class="table-footer"><span>${matches.length ? `${start + 1}–${Math.min(start + size, matches.length)} of ${matches.length}` : "0 positions"}</span><div class="pagination"><button onclick="window.aurumAction(event)" class="icon-button" data-action="page-prev" aria-label="Previous page" ${state.page <= 1 ? "disabled" : ""}>${icon("chevron", "reverse")}</button><span>Page ${state.page} / ${Math.max(1, Math.ceil(matches.length / size))}</span><button onclick="window.aurumAction(event)" class="icon-button" data-action="page-next" aria-label="Next page" ${start + size >= matches.length ? "disabled" : ""}>${icon("chevron")}</button></div></div>`;
}
function activityPage() {
  return `${pageHeading("Activity & execution", "Follow each request all the way to its broker outcome.", `<button onclick="window.aurumAction(event)" class="button ghost" data-action="refresh">${icon("refresh")}Refresh status</button><button onclick="window.aurumAction(event)" class="button ghost" data-action="export-history">Export commands</button>`)}${state.commands.some((c) => c.state === "UNKNOWN") ? `<div class="status-banner red">${icon("info")}<div><strong>Do not retry an unknown order</strong><p>Check broker orders, deals and current positions using the request tag. The server blocks new entries until an operator resolves it.</p></div></div>` : ""}<div class="page-grid"><div class="stack">${state.commands.length ? `<section class="panel"><div class="panel-head"><h2>Execution commands</h2><span class="tag">${state.mode === "api" ? "Server history" : "Demo session"}</span></div><div class="table-wrap"><table><thead><tr><th>Command</th><th>Operation</th><th>Outcome</th><th></th></tr></thead><tbody>${state.commands.map((c) => `<tr><td class="mono">${esc(short(c.id))}</td><td>${esc(c.kind)}</td><td>${badge(c.state)}</td><td><button onclick="window.aurumAction(event)" class="button ghost" data-action="command-details" data-id="${esc(c.id)}">Inspect</button>${c.state === "QUEUED" ? ` <button onclick="window.aurumAction(event)" class="button danger" data-action="cancel-command" data-id="${esc(c.id)}">Cancel queued</button>` : ""}</td></tr>`).join("")}</tbody></table></div>${historyMore("commands")}</section>` : ""}<section class="panel"><div class="panel-head"><h2>Workspace timeline</h2><span class="small muted">UTC+7</span></div>${activityList(state.events)}${historyMore("events")}</section></div><aside class="panel"><div class="panel-head"><h2>Read the state, not just the request</h2></div><div class="panel-body"><ul class="info-list"><li>${icon("clock")}<div><strong>Queued / Submitting</strong><small>A request exists. A fill is not confirmed.</small></div></li><li>${icon("check")}<div><strong>Filled / Closed / Updated</strong><small>The broker confirmed the operation.</small></div></li><li>${icon("info", "negative")}<div><strong>Unknown</strong><small>Outcome is uncertain. Inspect broker history; do not submit it again.</small></div></li></ul><p class="hint" style="margin-top:15px">${state.mode === "api" ? "Records are restored from the server on reconnect. Credentials stay in memory." : "Demo activity is simulated and resets on reload."}</p></div></aside></div>${footer()}`;
}
function connectionPage() {
  const connected = state.mode === "api";
  return `${pageHeading("Connection", "One workspace. One configured MT5 account.", `<button onclick="window.aurumAction(event)" class="button ${connected ? "ghost" : "primary"}" data-action="settings">${icon("plug")}${connected ? "Manage connection" : "Connect your API"}</button>`)}<div class="page-grid"><div class="stack"><section class="panel"><div class="panel-head"><h2>Trading terminal</h2>${badge(connected ? "CONNECTED" : "DEMO")}</div><div class="panel-body"><div class="instrument"><div class="gold-symbol">Au</div><div><h2>${connected ? "MetaTrader 5" : "Aurum practice terminal"}</h2><p>${connected ? "Account linked through your FastAPI server" : "Explore the entire workflow without a broker connection"}</p></div></div><dl class="connection-details"><div><dt>Account login</dt><dd>${esc(state.account.login)}</dd></div><div><dt>Account mode</dt><dd>${esc(state.account.mode.toUpperCase())}</dd></div><div><dt>Broker server</dt><dd>${esc(state.account.server)}</dd></div><div><dt>Trading symbol</dt><dd>${esc(state.symbol)}</dd></div><div><dt>Account currency</dt><dd>${esc(state.account.currency)}</dd></div><div><dt>Terminal permission</dt><dd>${state.account.trade_allowed ? "Trading allowed" : "Trading disabled"}</dd></div></dl><div class="notice ${connected ? "" : "amber"}">${icon("info")} ${connected ? "The backend selects the MT5 account configured on its Windows worker. This UI cannot change broker credentials." : "This is a simulated environment. Account balances, market data and executions are examples."}</div><div class="row" style="margin-top:18px"><button onclick="window.aurumAction(event)" class="button" data-action="refresh">${icon("refresh")}Check connection</button>${connected ? `<button onclick="window.aurumAction(event)" class="button ghost" data-action="disconnect">Disconnect session</button>` : `<button onclick="window.aurumAction(event)" class="button ghost" data-action="scenarios">Explore demo scenarios</button>`}</div></div></section><section class="panel"><div class="panel-head"><h2>Connection architecture</h2><span class="tag">Server-managed credentials</span></div><div class="connection-diagram"><div>${icon("monitor")}Your workspace</div>${icon("arrow")}<div>${icon("server")}FastAPI</div>${icon("arrow")}<div>${icon("monitor")}Windows MT5</div></div><div class="panel-body" style="padding-top:0"><div class="evidence-grid"><div class="evidence-item row">${icon("database", "gold")}<div>Neon PostgreSQL<small>Analyses, plans and commands</small></div></div><div class="evidence-item row">${icon("spark", "gold")}<div>AI model provider<small>Configured on the backend</small></div></div></div><p class="hint" style="margin-top:16px">Neon, OpenAI and MT5 credentials stay on the server. Android MT5 connects separately to the same broker account.</p></div></section></div><aside class="panel"><div class="panel-head"><h2>Before you connect</h2></div><div class="panel-body"><ul class="info-list"><li>${icon("check")}<div><strong>Start your Windows worker</strong><small>MT5 must be logged into the intended account.</small></div></li><li>${icon("check")}<div><strong>Check your API origin</strong><small>Use HTTPS for a hosted backend.</small></div></li><li>${icon("check")}<div><strong>Allow this frontend origin</strong><small>Configure FastAPI CORS before connecting.</small></div></li><li>${icon("shield")}<div><strong>Begin on a demo account</strong><small>Real trading also requires the server’s explicit setting.</small></div></li></ul></div></aside></div>${footer()}`;
}
function apiPage() {
  const groups = [...new Set(ENDPOINTS.map((e) => e[0]))];
  return `${pageHeading("API reference", "Every screen follows your FastAPI contract.", state.mode === "api" ? `<a class="button ghost" href="${esc(state.base)}/docs" target="_blank" rel="noopener">${icon("external")}Open Swagger</a>` : "")}<div class="notice" style="margin-bottom:20px">${icon("code")} All application routes use <code>/api/v1</code> and <code>X-API-Key</code>. Order, close and protection requests also require an <code>Idempotency-Key</code>. Credentials are held in memory for this session only.</div>${groups
    .map(
      (g) =>
        `<section class="panel api-group"><div class="panel-head"><h2>${g}</h2><span class="tag">${ENDPOINTS.filter((e) => e[0] === g).length} endpoints</span></div>${ENDPOINTS.filter(
          (e) => e[0] === g,
        )
          .map(
            (e) =>
              `<div class="api-row"><span class="method ${e[1].toLowerCase()}">${e[1]}</span><code>/api/v1${e[2]}</code><span>${e[3]}</span></div>`,
          )
          .join("")}</section>`,
    )
    .join(
      "",
    )}<section class="panel api-group"><div class="panel-head"><h2>Service health & documentation</h2></div><div class="api-row"><span class="method">GET</span><code>/health</code><span>Database-backed service health</span></div><div class="api-row"><span class="method">GET</span><code>/docs · /redoc · /openapi.json</code><span>Swagger, ReDoc and OpenAPI schema</span></div></section><div class="notice amber">${icon("info")} Server history, plan pause/resume and queued cancellation are supported in API v0.2. Provider credentials and risk limits remain server-managed; UNKNOWN orders are never retried automatically.</div>${footer()}`;
}
function analysisHistory() {
  return `<section class="panel" style="margin-top:20px"><div class="panel-head"><h2>Saved analyses</h2><button onclick="window.aurumAction(event)" class="button ghost" data-action="export-analyses">Export analyses</button></div>${state.analyses.length ? `<div class="table-wrap"><table><thead><tr><th>Captured context</th><th>Timeframe</th><th>Action</th><th>Bias</th><th></th></tr></thead><tbody>${state.analyses.map((a) => `<tr><td>${datefmt(a.created_at)} UTC+7</td><td>${esc(a.data.timeframe)}</td><td>${badge(a.data.action)}</td><td>${esc(a.data.bias)}</td><td><button onclick="window.aurumAction(event)" class="button ghost" data-action="select-analysis" data-id="${esc(a.id)}">Open analysis</button></td></tr>`).join("")}</tbody></table></div>` : empty("No saved analyses", "Run an analysis to save its setup and context.")}${historyMore("analyses")}</section>`;
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function planControl(id, control, button) {
  const plan = state.plans.find((p) => p.id === id);
  try {
    setBusy(button, true);
    if (state.mode === "api") {
      Object.assign(
        plan,
        await (control === "pause"
          ? state.api.pausePlan(id)
          : state.api.resumePlan(id)),
      );
    } else {
      await sleep(350);
      if (control === "resume" && executionBlocker(plan.analysis, "api"))
        throw new Error("This setup needs a fresh analysis before resuming.");
      plan.state = control === "pause" ? "PAUSED" : "MONITORING";
    }
    closeModal();
    render();
    toast("Trade plan " + (control === "pause" ? "paused." : "resumed."));
  } catch (error) {
    setBusy(button, false);
    formError(error.message);
  }
}
async function cancelQueued(id, button) {
  try {
    setBusy(button, true);
    const c = state.commands.find((c) => c.id === id);
    if (state.mode === "api")
      Object.assign(c, await state.api.cancelCommand(id));
    else {
      if (c.state !== "QUEUED")
        throw new Error("The command has left the queue. Inspect its outcome.");
      c.state = "CANCELLED";
      const plan = state.plans.find((p) => p.id === c.data?.plan_id);
      if (plan) plan.state = "CANCELLED";
    }
    closeModal();
    render();
    toast("Queued command cancelled before submission.");
  } catch (error) {
    setBusy(button, false);
    formError(error.message);
  }
}
function localDate(value) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function render() {
  const focused = document.activeElement?.id;
  $("#app").innerHTML = shell();
  bindChart();
  bindUpload();
  if (focused && $("#" + focused))
    $("#" + focused).focus({ preventScroll: true });
}
function navigate() {
  const route = location.hash.slice(1).split("?")[0] || "market";
  state.route = [
    "market",
    "analysis",
    "plans",
    "positions",
    "activity",
    "connection",
    "api",
  ].includes(route)
    ? route
    : "market";
  state.menu = false;
  render();
  window.scrollTo(0, 0);
  $("#main")?.focus({ preventScroll: true });
}
window.addEventListener("hashchange", navigate);
function openModal(title, description, body, actions = "") {
  const modal = $("#modal");
  modal.style.maxWidth = "";
  modalRestore = document.activeElement;
  modal.innerHTML = `<div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${description}</p></div><button onclick="window.aurumAction(event)" class="icon-button" data-action="modal-close" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-content">${body}</div><div class="modal-footer"><button onclick="window.aurumAction(event)" class="button ghost" data-action="modal-close" autofocus>Cancel</button>${actions}</div>`;
  modal.showModal();
  document.body.style.overflow = "hidden";
}
function closeModal() {
  const modal = $("#modal");
  if (modal.open) modal.close();
  document.body.style.overflow = "";
  modalRestore?.isConnected && modalRestore.focus();
}
$("#modal").addEventListener("close", () => {
  document.body.style.overflow = "";
  modalRestore?.isConnected && modalRestore.focus();
});
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
function formError(message, selector = "#modal-error") {
  const el = $(selector);
  if (el) {
    el.textContent = message;
    el.setAttribute("role", "alert");
    if (selector === "#modal-error") {
      let input = message.includes("SL")
        ? $("#protect-sl")
        : message.toLowerCase().includes("volume")
          ? $("#partial-volume")
          : message.toLowerCase().includes("lot")
            ? $("#trade-lots")
            : message.includes("Deviation")
              ? $("#trade-deviation")
              : null;
      if (input) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "modal-error");
        input.focus();
      }
    }
  } else toast(message);
}
function setBusy(button, value) {
  if (!button) return;
  if (value) {
    const error = $("#modal-error");
    if (error && $("#modal").contains(button)) error.textContent = "";
  }
  button.disabled = value;
  button.setAttribute("aria-busy", String(value));
  if (value) {
    button.dataset.original = button.innerHTML;
    button.style.minWidth = button.offsetWidth + "px";
    button.innerHTML = '<span class="spinner"></span> Working…';
  } else {
    if (button.dataset.original) button.innerHTML = button.dataset.original;
    button.style.minWidth = "";
  }
}
function confirmModal(
  title,
  description,
  body,
  action,
  label,
  danger = false,
  data = "",
) {
  openModal(
    title,
    description,
    body + `<div id="modal-error" class="field-error" role="alert"></div>`,
    `<button onclick="window.aurumAction(event)" class="button ${danger ? "danger" : "primary"}" data-action="${action}" ${data}>${label}</button>`,
  );
}
function settingsModal() {
  openModal(
    "Connect your FastAPI backend",
    "Use your API’s owner key. Broker and provider secrets stay on the server.",
    `<form id="connection-form" novalidate><div class="stack"><div class="field"><label for="api-base">FastAPI base URL</label><input id="api-base" type="url" placeholder="https://your-api.example.com" value="${esc(state.base || (location.hostname === "localhost" || location.hostname === "127.0.0.1" ? location.origin : ""))}" autocomplete="url" aria-describedby="api-base-help"><small id="api-base-help">Origin only, without /api/v1. CORS must allow this site.</small></div><div class="field"><label for="api-key">Owner API key</label><div class="field-inline"><input id="api-key" type="password" placeholder="Your X-API-Key" autocomplete="off" spellcheck="false" aria-describedby="key-help"><button onclick="window.aurumAction(event)" class="icon-button" data-action="toggle-secret" type="button" aria-label="Show API key">${icon("eye")}</button></div><small id="key-help">Kept in memory. Never saved in browser storage.</small></div><div class="field"><label for="connection-mode">Expected MT5 account mode</label><select id="connection-mode"><option value="demo">Demo account</option><option value="real">Real account</option></select><small>The requested mode must match the configured terminal.</small></div><div class="notice amber">${icon("shield")} Connecting does not place a trade. Every trade still requires an eligible analysis and an explicit review.</div><div id="modal-error" class="field-error" role="alert"></div></div></form>`,
    `<button onclick="window.aurumAction(event)" class="button primary" data-action="connect-api">${icon("plug")}Connect backend</button>`,
  );
}
function scenariosModal() {
  openModal(
    "Explore the demo",
    "All scenarios use illustrative data. No real orders or AI requests are sent.",
    `<div class="scenario-options"><button onclick="window.aurumAction(event)" class="scenario-option" data-action="scenario" data-scenario="waiting">${icon("clock")}<span><strong>Waiting for confirmation</strong><small>Review a setup and create a conditional trade plan.</small></span></button><button onclick="window.aurumAction(event)" class="scenario-option" data-action="scenario" data-scenario="ready">${icon("trend")}<span><strong>Ready to enter</strong><small>Review an immediate BUY order and track its simulated fill.</small></span></button><button onclick="window.aurumAction(event)" class="scenario-option" data-action="scenario" data-scenario="blocked">${icon("lock")}<span><strong>Missing market context</strong><small>See how execution is blocked when the calendar is unavailable.</small></span></button><button onclick="window.aurumAction(event)" class="scenario-option" data-action="scenario" data-scenario="unknown">${icon("info")}<span><strong>Uncertain execution</strong><small>Inspect an UNKNOWN command without retrying an order.</small></span></button></div>`,
    `<button onclick="window.aurumAction(event)" class="button ghost" data-action="reset-demo">Reset all demo data</button>`,
  );
}
function reviewTrade() {
  const analysis = state.analysis;
  if (!analysis) {
    location.hash = "analysis";
    return;
  }
  const a = analysis.data,
    kind = ["BUY", "SELL"].includes(a.action) ? "order" : "plan";
  let blocker = executionBlocker(analysis, state.mode);
  if (
    state.unresolvedCount > 0 ||
    state.commands.some((c) => c.state === "UNKNOWN")
  )
    blocker =
      "An execution outcome is unknown. Reconcile the existing command before another entry.";
  if (
    state.mode === "api" &&
    (!state.account.trade_allowed ||
      (state.account.mode === "real" &&
        !state.configuration?.allow_real_trading))
  )
    blocker = "The server or terminal has disabled trading for this account.";
  const reserved =
    state.plans.some((p) => p.analysis_id === analysis.id) ||
    state.commands.some(
      (c) => c.kind === "OPEN" && c.data?.analysis_id === analysis.id,
    );
  if (reserved)
    blocker =
      "This analysis is already reserved for a trade. Generate a fresh analysis for another entry.";
  openModal(
    kind === "plan" ? "Review conditional trade plan" : "Review market order",
    `${state.symbol} · ${a.proposed_side || "No direction"} · ${state.mode === "demo" ? "Simulated execution" : state.account.mode.toUpperCase() + " account"}`,
    `<div class="modal-summary"><div><span>Entry zone</span><strong>${a.entry_zone?.map((v) => money(v)).join(" – ") || "Not set"}</strong></div><div><span>Stop loss</span><strong>${a.stop_loss ? money(a.stop_loss) : "Not set"}</strong></div><div><span>Trigger</span><strong style="font-family:var(--font-sans)">${kind === "plan" ? "Closed-candle confirmation" : "Immediate market request"}</strong></div><div><span>Analysis validity</span><strong>${datefmt(analysis.reassess_at)} UTC+7</strong></div></div>${blocker ? `<div class="notice red" style="margin-bottom:18px">${icon("lock")} ${esc(blocker)}</div>` : ""}<form id="trade-form" novalidate><div class="form-grid"><div class="field"><label for="trade-lots">Lot size</label><input id="trade-lots" type="number" min="0.01" step="0.01" value="0.01" inputmode="decimal" aria-describedby="trade-lots-help"><small id="trade-lots-help">Broker minimum and step are validated by the server.</small></div><div class="field"><label for="trade-tp">Take-profit target</label><select id="trade-tp">${a.take_profits.map((p, i) => `<option value="${i}">TP ${i + 1} · ${money(p)}</option>`).join("")}</select><small>One TP is attached to the position.</small></div><div class="field"><label for="trade-spread">Max spread (points)</label><input id="trade-spread" type="number" min="1" value="50" inputmode="numeric"></div><div class="field"><label for="trade-deviation">Max deviation (points)</label><input id="trade-deviation" type="number" min="0" max="1000" value="20" inputmode="numeric"></div></div><div class="notice" style="margin-top:18px">${icon("info")} ${kind === "plan" ? "The plan monitors conditions. It does not open a position immediately." : "A queued request is not a confirmed fill. Track the broker outcome in Activity."}</div><div id="modal-error" class="field-error" role="alert" style="margin-top:10px"></div></form>`,
    `<button onclick="window.aurumAction(event)" class="button primary" data-action="submit-trade" data-kind="${kind}" ${blocker ? "disabled" : ""}>${icon(kind === "plan" ? "plans" : "arrow")}${kind === "plan" ? "Start monitoring" : state.mode === "demo" ? "Place demo order" : "Submit " + a.proposed_side + " order"}</button>`,
  );
}
function showAnalysis() {
  const a = state.analysis;
  if (!a) return;
  openModal(
    "Analysis details",
    "Inspect the saved setup, missing context and source data.",
    `<div class="notice" style="margin-bottom:16px">${esc(a.data.rationale || "No rationale supplied.")}</div><div class="form-grid" style="margin-bottom:18px"><div><span class="field-label">Reassess at</span><p class="small mono" style="margin-top:5px">${datefmt(a.reassess_at)} UTC+7</p></div><div><span class="field-label">Missing context</span><p class="small" style="margin-top:5px">${esc(a.data.missing_data?.join(", ") || "None reported")}</p></div></div><pre class="json-view">${esc(JSON.stringify(a.data, null, 2))}</pre>`,
    `<button onclick="window.aurumAction(event)" class="button ghost" data-action="copy-analysis">${icon("copy")}Copy JSON</button>${state.mode === "api" ? '<button onclick="window.aurumAction(event)" class="button" data-action="refresh-analysis">Refresh saved analysis</button>' : ""}`,
  );
}
function closePositionModal(ticket) {
  const p = state.positions.find((p) => p.ticket === ticket);
  if (!p) return;
  confirmModal(
    "Close position",
    `${p.symbol} · ${p.side} · Ticket ${p.ticket}`,
    `<div class="modal-summary"><div><span>Open volume</span><strong>${money(p.volume)} lots</strong></div><div><span>Account</span><strong>${esc(state.account.login)} · ${state.account.mode}</strong></div></div><form novalidate><div class="field"><label for="close-volume">Close volume</label><select id="close-volume"><option value="full">Full position (${money(p.volume)} lots)</option><option value="partial">Partial close</option></select></div><div class="field hidden" id="partial-field" style="margin-top:15px"><label for="partial-volume">Volume to close (lots)</label><input id="partial-volume" type="number" min="0.01" step="0.01" value="0.01" inputmode="decimal"><small>The remaining volume must also satisfy broker lot rules.</small></div></form><div class="notice" style="margin-top:18px">${icon("info")} This queues a close request. The position stays open until the broker confirms the close.</div>`,
    "confirm-close",
    state.mode === "demo" ? "Close demo position" : "Submit close request",
    true,
    `data-ticket="${esc(ticket)}"`,
  );
}
function protectionModal(ticket) {
  const p = state.positions.find((p) => p.ticket === ticket);
  if (!p) return;
  confirmModal(
    "Update position protection",
    `${p.symbol} · ${p.side} ${money(p.volume)} lots · ${p.ticket}`,
    `<form novalidate><div class="form-grid"><div class="field"><label for="protect-sl">Stop loss</label><input id="protect-sl" type="number" value="${p.sl}" step="0.01" inputmode="decimal"></div><div class="field"><label for="protect-tp">Take profit</label><input id="protect-tp" type="number" value="${p.tp}" step="0.01" inputmode="decimal"></div></div></form><div class="notice" style="margin-top:18px">${icon("shield")} The server validates price distance, precision and the updated stop-loss risk before submitting.</div>`,
    "confirm-protection",
    "Submit SL / TP update",
    false,
    `data-ticket="${esc(ticket)}"`,
  );
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function commandKey(kind, body) {
  const signature = kind + JSON.stringify(body);
  const previous = state.pendingKeys.get(signature);
  const known = state.commands.find((c) => c.idempotency_key === previous);
  if (known && TERMINAL_STATES.has(known.state) && known.state !== "UNKNOWN")
    state.pendingKeys.delete(signature);
  if (!state.pendingKeys.has(signature))
    state.pendingKeys.set(signature, uuid());
  return state.pendingKeys.get(signature);
}
function keepCommand(c) {
  const i = state.commands.findIndex((x) => x.id === c.id);
  if (i >= 0) state.commands[i] = { ...state.commands[i], ...c };
  else state.commands.unshift(c);
}
async function submitTrade(button) {
  const kind = button.dataset.kind;
  const analysis = state.analysis;
  try {
    if (
      state.mode === "api" &&
      (state.networkError ||
        state.authFailed ||
        state.unresolvedCount > 0 ||
        !state.account.trade_allowed)
    )
      throw new Error(
        "Restore the terminal connection and resolve any unknown execution before submitting a new entry.",
      );
    const block = executionBlocker(analysis, state.mode);
    if (block) throw new Error(block);
    const body = executionPayload(
      analysis,
      state.connection.id,
      {
        lots: $("#trade-lots").value,
        tp: $("#trade-tp").value,
        spread: $("#trade-spread").value,
        deviation: $("#trade-deviation").value,
      },
      kind,
    );
    if (
      state.mode === "demo" &&
      (body.sizing.volume_lots > 0.1 ||
        body.sizing.volume_lots < 0.01 ||
        Math.abs(
          body.sizing.volume_lots * 100 -
            Math.round(body.sizing.volume_lots * 100),
        ) > 0.00001)
    )
      throw new Error("Demo lot size must be 0.01–0.10 in steps of 0.01.");
    setBusy(button, true);
    if (kind === "plan") {
      let plan;
      if (state.mode === "api") plan = await state.api.createPlan(body);
      else {
        await sleep(700);
        plan = {
          id: "plan-" + uuid().slice(0, 8),
          analysis_id: analysis.id,
          data: body,
          state: "MONITORING",
        };
      }
      plan.analysis = analysis;
      state.plans.unshift(plan);
      notify(
        "Trade plan is monitoring",
        `${state.symbol} · ${analysis.data.proposed_side} ${money(body.sizing.volume_lots)} lots`,
        "plans",
        "MONITORING",
      );
      closeModal();
      location.hash = "plans";
      render();
      toast("Trade plan created. No position has been opened.");
    } else {
      let command;
      if (state.mode === "api")
        command = await state.api.order(body, commandKey("OPEN", body));
      else {
        await sleep(600);
        command = {
          id: "cmd-" + uuid().slice(0, 8),
          kind: "OPEN",
          state: "QUEUED",
          data: body,
          created_at: stamp(),
        };
      }
      keepCommand(command);
      notify(
        "Order request queued",
        `${state.symbol} · ${analysis.data.proposed_side} ${money(body.sizing.volume_lots)} lots`,
        "clock",
        "QUEUED",
      );
      closeModal();
      location.hash = "activity";
      render();
      toast("Order queued. Waiting for the execution outcome.");
      if (state.mode === "demo")
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
          };
          state.positions.push(p);
          command.state = "FILLED";
          command.result = {
            state: "FILLED",
            position_ticket: p.ticket,
            filled_volume: p.volume,
            mock: true,
          };
          return "Demo order filled";
        });
    }
  } catch (e) {
    setBusy(button, false);
    formError(e.message);
  }
}
function finishDemoCommand(command, finish) {
  setTimeout(() => {
    if (
      state.mode !== "demo" ||
      !state.commands.some((c) => c.id === command.id)
    )
      return;
    if (command.state === "CANCELLED") return;
    const title = finish();
    notify(title, `${state.symbol} · ${command.id}`, "check", command.state);
    keepCommand(command);
    render();
    toast(title + ". Simulated execution only.");
  }, 1400);
}
async function positionMutation(button, kind) {
  const ticket = button.dataset.ticket,
    p = state.positions.find((p) => p.ticket === ticket);
  if (!p) return;
  try {
    let body;
    if (kind === "CLOSE") {
      let volume =
        $("#close-volume").value === "full"
          ? null
          : Number($("#partial-volume").value);
      if (
        volume !== null &&
        (!Number.isFinite(volume) || volume <= 0 || volume > p.volume)
      )
        throw new Error(
          "Enter a close volume greater than zero and no larger than the position.",
        );
      if (
        state.mode === "demo" &&
        volume !== null &&
        Math.abs(volume * 100 - Math.round(volume * 100)) > 0.00001
      )
        throw new Error("Demo close volume must use 0.01-lot increments.");
      body = {
        connection_id: state.connection.id,
        volume_lots: volume,
        max_deviation_points: 20,
      };
    } else {
      const sl = Number($("#protect-sl").value),
        tp = Number($("#protect-tp").value);
      if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0)
        throw new Error("Enter valid positive SL and TP prices.");
      if (
        state.mode === "demo" &&
        !(p.side === "BUY"
          ? sl < currentPrice() && tp > currentPrice()
          : tp < currentPrice() && sl > currentPrice())
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
      };
    }
    setBusy(button, true);
    let command;
    if (state.mode === "api")
      command =
        kind === "CLOSE"
          ? await state.api.close(ticket, body, commandKey(kind + ticket, body))
          : await state.api.protection(
              ticket,
              body,
              commandKey(kind + ticket, body),
            );
    else {
      await sleep(600);
      command = {
        id: "cmd-" + uuid().slice(0, 8),
        kind,
        state: "QUEUED",
        data: { ...body, ticket },
        created_at: stamp(),
      };
    }
    keepCommand(command);
    notify(
      kind === "CLOSE" ? "Close request queued" : "Protection update queued",
      `${p.symbol} · Ticket ${ticket}`,
      "clock",
      "QUEUED",
    );
    closeModal();
    render();
    toast("Request queued. The position has not changed yet.");
    if (state.mode === "demo")
      finishDemoCommand(command, () => {
        if (kind === "CLOSE") {
          const volume = body.volume_lots ?? p.volume;
          state.balance += (pnl(p) * volume) / p.volume;
          p.volume = Math.max(0, Number((p.volume - volume).toFixed(2)));
          if (p.volume === 0)
            state.positions = state.positions.filter(
              (x) => x.ticket !== ticket,
            );
          command.state = p.volume === 0 ? "CLOSED" : "PARTIALLY_CLOSED";
          command.result = {
            closed_volume: volume,
            remaining_volume: p.volume,
            mock: true,
          };
          return p.volume === 0
            ? "Demo position closed"
            : "Demo position partially closed";
        }
        p.sl = body.stop_loss;
        p.tp = body.take_profit;
        command.state = "UPDATED";
        command.result = { mock: true, position_ticket: ticket };
        return "Demo protection updated";
      });
  } catch (e) {
    setBusy(button, false);
    formError(e.message);
  }
}
let refreshEpoch = 0;
function applyWorkspace(data) {
  state.configuration = data.configuration;
  if (data.account) state.account = data.account;
  state.quote = data.quote;
  state.positions = data.positions;
  state.updatedAt = data.updated_at || state.updatedAt;
  state.unresolvedCount = data.unresolved_count;
  for (const [name, key] of [
    ["analyses", "analyses"],
    ["plans", "plans"],
    ["commands", "commands"],
    ["events", "events"],
  ]) {
    const incoming =
      name === "events" ? data[key].items.map(eventView) : data[key].items;
    state[name] = mergeRecords(state[name], incoming);
    state.history[name] = {
      total: data[key].total,
      hasMore: state[name].length < data[key].total,
    };
  }
  if (!state.analysis && state.analyses.length)
    state.analysis = state.analyses[0];
  else if (state.analysis) {
    const latest = state.analyses.find((a) => a.id === state.analysis.id);
    if (latest) state.analysis = latest;
  }
  state.authFailed = false;
  state.networkError = data.stale
    ? "The worker snapshot is stale. Check the Windows terminal and worker."
    : data.quote && !data.quote.fresh
      ? "No recent broker quote is available. The market may be closed."
      : "";
  state.page = Math.min(
    state.page,
    Math.max(
      1,
      Math.ceil(
        state.positions.filter((p) =>
          `${p.symbol} ${p.ticket} ${p.side}`
            .toLowerCase()
            .includes(state.query.toLowerCase()),
        ).length / 8,
      ),
    ),
  );
}
async function refreshData(quiet = false) {
  if (state.mode === "demo") {
    if (!quiet) toast("Practice terminal ready. Prices are illustrative.");
    render();
    return;
  }
  const epoch = ++refreshEpoch,
    api = state.api,
    connection = state.connection.id,
    tf = state.tf;
  try {
    const data = await api.workspace(connection);
    if (epoch !== refreshEpoch || api !== state.api) return;
    applyWorkspace(data);
    // Previously loaded older records can still be active; refresh those IDs as well.
    const recentPlans = new Set(data.plans.items.map((p) => p.id)),
      recentCommands = new Set(data.commands.items.map((c) => c.id));
    const watchers = [
      ...state.plans
        .filter(
          (p) =>
            !recentPlans.has(p.id) &&
            ["MONITORING", "QUEUED", "SUBMITTING"].includes(p.state),
        )
        .map((p) => ({ row: p, read: () => api.plan(p.id) })),
      ...state.commands
        .filter(
          (c) => !recentCommands.has(c.id) && !TERMINAL_STATES.has(c.state),
        )
        .map((c) => ({ row: c, read: () => api.command(c.id) })),
    ];
    for (const watch of watchers) {
      const fresh = await watch.read();
      if (epoch !== refreshEpoch || api !== state.api) return;
      Object.assign(watch.row, fresh);
    }

    if (!data.stale) {
      const candles = await api.candles(connection, tf);
      if (epoch !== refreshEpoch || api !== state.api) return;
      state.liveCandles[tf] = candles.closed_candles;
    }
    if (
      !$("#modal").open &&
      !document.activeElement?.matches("input,select,textarea")
    )
      render();
    else state.renderPending = true;
    if (!quiet) toast("Workspace and account history refreshed.");
  } catch (error) {
    if (epoch !== refreshEpoch || api !== state.api) return;
    state.networkError = error.message;
    state.authFailed = error.message.startsWith("401:");
    if (!$("#modal").open) render();
  }
}
async function loadHistory(kind, button) {
  if (state.mode !== "api") return;
  const routes = {
    analyses: "analyses",
    plans: "trade-plans",
    commands: "commands",
    events: "activity",
  };
  try {
    setBusy(button, true);
    const result = await state.api.list(
      routes[kind],
      state.connection.id,
      state[kind].length,
    );
    state[kind] = mergeRecords(
      state[kind],
      kind === "events" ? result.items.map(eventView) : result.items,
    );
    state.history[kind] = {
      total: result.total,
      hasMore: state[kind].length < result.total,
    };
    render();
  } catch (error) {
    setBusy(button, false);
    toast(error.message);
  }
}
function historyMore(kind) {
  return state.mode === "api" && state.history[kind]?.hasMore
    ? `<div class="panel-body row between"><span class="hint">Showing ${state[kind].length} of ${state.history[kind].total}</span><button onclick="window.aurumAction(event)" class="button ghost" data-action="load-history" data-kind="${kind}">Load older ${kind}</button></div>`
    : "";
}
async function connectApi(button) {
  const base = $("#api-base").value.trim(),
    key = $("#api-key").value,
    mode = $("#connection-mode").value;
  try {
    if (!base) throw new Error("Enter your FastAPI base URL.");
    if (key.length < 32) {
      $("#api-key").setAttribute("aria-invalid", "true");
      $("#api-key").focus();
      throw new Error("Enter your server API key (at least 32 characters).");
    }
    if (mode === "real" && !$("#real-confirm")) {
      const form = $("#connection-form");
      const label = document.createElement("label");
      label.className = "check-line";
      label.style.marginTop = "12px";
      label.innerHTML =
        '<input id="real-confirm" type="checkbox"> I understand this connects to a real-money account.';
      form.append(label);
      throw new Error("Confirm the real-account connection before continuing.");
    }
    if (mode === "real" && !$("#real-confirm").checked)
      throw new Error("Confirm the real-account connection before continuing.");
    const api = new ApiClient(base, key);
    setBusy(button, true);
    const [health, configuration] = await Promise.all([
      api.health(),
      api.request("/api/v1/configuration"),
    ]);
    let connection,
      status,
      historyOnly = false;
    try {
      status = await api.status();
    } catch (error) {
      if (!error.message.startsWith("503:")) throw error;
      const saved = await api.request("/api/v1/mt5/connections");
      const matches = saved.items.filter((c) => c.mode === mode);
      if (matches.length !== 1)
        throw new Error(
          "Start the worker to select the configured account safely. History-only reconnect needs exactly one saved account in this mode.",
        );
      connection = matches[0];
      historyOnly = true;
    }
    if (!historyOnly) {
      if (status.account.mode !== mode)
        throw new Error(
          "Selected account mode does not match the MT5 terminal.",
        );
      connection = await api.connect(mode);
    }
    const initial = await api.workspace(connection.id);
    state.api = api;
    state.mode = "api";
    state.base = api.base;
    state.connection = connection;
    state.account = initial.account || {
      login: connection.login,
      server: connection.server,
      mode: connection.mode,
      equity: NaN,
      currency: "USD",
      trade_allowed: false,
    };
    state.symbol = configuration.symbol;
    state.brokerBackend = configuration.broker_backend;
    state.analysis = null;
    state.analyses = [];
    state.history = {};
    state.quote = null;
    state.configuration = configuration;
    state.unresolvedCount = 0;
    state.authFailed = false;
    state.plans = [];
    state.commands = [];
    state.events = [];
    state.liveCandles = {};
    applyWorkspace(initial);
    closeModal();
    render();
    toast(
      historyOnly
        ? "History restored. Trading is paused until the worker reconnects."
        : "API connected. Saved workspace restored.",
    );
    if (!initial.stale) await refreshData(true);
  } catch (e) {
    setBusy(button, false);
    formError(
      e.message.includes("fetch")
        ? "Cannot reach the API. Check its URL, HTTPS, CORS and worker status."
        : e.message,
    );
  }
}
async function runAnalysis(button) {
  if (state.analysing) return;
  if (state.mode === "api" && !state.uploads.length) {
    formError(
      "Add at least one screenshot for the primary timeframe.",
      "#analysis-error",
    );
    return;
  }
  if (state.uploads.length && !state.uploads.some((u) => u.tf === state.tf)) {
    formError(
      "Add a screenshot matching the primary timeframe.",
      "#analysis-error",
    );
    return;
  }
  for (const u of state.uploads) {
    const age = Date.now() - new Date(u.captured).getTime();
    if (!Number.isFinite(age) || age > 15 * 60000 || age < -30000) {
      formError(
        "Confirm a capture time within the last 15 minutes for every screenshot.",
        "#analysis-error",
      );
      return;
    }
  }
  state.analysing = true;
  setBusy(button, true);
  $("#analysis-error").textContent = "";
  try {
    let result;
    if (state.mode === "api") {
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
        }),
      );
      state.uploads.forEach((u) => form.append("images", u.file, u.file.name));
      result = await state.api.analyse(form);
    } else {
      await sleep(1600);
      result = sampleAnalysis(
        state.scenario === "unknown" ? "waiting" : state.scenario,
      );
    }
    state.analysis = result;
    state.analyses = mergeRecords(state.analyses, [result]);
    notify(
      "Market analysis completed",
      `${state.symbol} · ${state.tf} · ${result.data.action}`,
      "spark",
      result.data.action,
    );
    state.analysing = false;
    render();
    toast("Analysis complete. Review the setup and any blockers.");
  } catch (e) {
    state.analysing = false;
    setBusy(button, false);
    formError(e.message, "#analysis-error");
  }
}
async function addFiles(list) {
  const errors = [];
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
    } catch (e) {
      URL.revokeObjectURL(preview);
      errors.push(file.name + ": " + e.message);
    }
  }
  render();
  if (errors.length) formError(errors.join(" "), "#upload-error");
  else toast("Screenshot added. Check its timeframe and actual capture time.");
}
function bindUpload() {
  const zone = $("#upload-zone");
  if (!zone) return;
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    addFiles(e.dataTransfer.files);
  });
}
function bindChart() {
  const area = $(".chart-area");
  if (!area) return;
  area.addEventListener("pointermove", (e) => {
    const rect = area.getBoundingClientRect(),
      ratio = Math.min(
        1,
        Math.max(0, (e.clientX - rect.left) / (rect.width * 0.91)),
      );
    const bars = chartBars();
    if (!bars.length) return;
    const bar =
      bars[Math.min(bars.length - 1, Math.floor(ratio * bars.length))];
    const x = e.clientX - rect.left;
    $(".chart-crosshair", area).style.left = x + "px";
    const tooltip = $(".chart-hover", area);
    tooltip.style.left = Math.max(4, Math.min(x + 10, rect.width - 190)) + "px";
    tooltip.textContent = `${timefmt(bar.time * 1000)} · C ${money(bar.close)}`;
  });
}
async function captureChart() {
  try {
    if (state.mode === "api" && !chartBars().length)
      throw new Error("Load broker candles before capturing a chart.");
    const source = chartSvg()
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
    canvas.getContext("2d").drawImage(img, 0, 0, 1800, 770);
    URL.revokeObjectURL(url);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("Chart capture failed.");
    const file = new File(
      [blob],
      `${state.symbol}-${state.tf}-${state.mode === "demo" ? "demo" : "snapshot"}.png`,
      { type: "image/png", lastModified: Date.now() },
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
    location.hash = "analysis";
    render();
    toast("Chart captured. Review the timestamp before analysis.");
  } catch (e) {
    toast(e.message);
  }
}
async function cancelPlan(id, button) {
  const p = state.plans.find((p) => p.id === id);
  if (!p) return;
  try {
    setBusy(button, true);
    if (state.mode === "api") {
      const result = await state.api.cancelPlan(id);
      Object.assign(p, result);
    } else {
      await sleep(500);
      p.state = "CANCELLED";
    }
    notify(
      "Trade plan cancelled",
      `${state.symbol} · No further entry monitoring`,
      "pause",
      "CANCELLED",
    );
    closeModal();
    render();
    toast("Plan cancelled. Existing positions are unchanged.");
  } catch (e) {
    setBusy(button, false);
    formError(e.message);
  }
}
async function poll() {
  if (
    state.mode === "api" &&
    !document.hidden &&
    state.api &&
    !state.authFailed
  )
    await refreshData(true);
}
let polling = false;
pollTimer = setInterval(async () => {
  if (polling) return;
  polling = true;
  try {
    await poll();
  } finally {
    polling = false;
  }
}, 2500);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.mode === "api") refreshData(true);
});
window.addEventListener("offline", () => {
  if (state.mode === "api") {
    state.networkError = "Your device is offline";
    render();
  }
});
window.addEventListener("online", () => {
  if (state.mode === "api") refreshData(true);
});

window.aurumAction = async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  try {
    switch (action) {
      case "export-analyses":
        download(
          "aurum-analyses.json",
          JSON.stringify(
            state.analyses.map((a) => ({
              id: a.id,
              created_at: a.created_at,
              expires_at: a.expires_at,
              reassess_at: a.reassess_at,
              data: a.data,
            })),
            null,
            2,
          ),
          "application/json",
        );
        toast("Loaded analyses exported.");
        break;
      case "load-history":
        await loadHistory(button.dataset.kind, button);
        break;
      case "select-analysis":
        state.analysis = state.analyses.find((a) => a.id === button.dataset.id);
        if (state.mode === "api")
          state.analysis = await state.api.analysis(button.dataset.id);
        render();
        showAnalysis();
        break;
      case "export-history":
        download(
          "aurum-history.csv",
          csv(
            state.commands.map((c) => ({
              id: c.id,
              kind: c.kind,
              state: c.state,
              created_at: c.created_at,
            })),
            ["id", "kind", "state", "created_at"],
          ),
          "text/csv",
        );
        toast("Loaded command records exported.");
        break;
      case "plan-control":
        confirmModal(
          button.dataset.control === "pause"
            ? "Pause monitoring?"
            : "Resume monitoring?",
          "The original analysis validity still applies.",
          '<p class="small muted">Pausing stops entry monitoring. Resuming watches new candles; it never replays an old signal.</p>',
          "confirm-plan-control",
          button.dataset.control === "pause" ? "Pause plan" : "Resume plan",
          false,
          `data-id="${esc(button.dataset.id)}" data-control="${button.dataset.control}"`,
        );
        break;
      case "confirm-plan-control":
        await planControl(button.dataset.id, button.dataset.control, button);
        break;
      case "cancel-command":
        confirmModal(
          "Cancel queued command?",
          "Only a command that has not started submitting can be cancelled.",
          '<p class="small muted">The server checks the command state under a lock. A submitting or filled order cannot be cancelled here.</p>',
          "confirm-cancel-command",
          "Cancel queued command",
          true,
          `data-id="${esc(button.dataset.id)}"`,
        );
        break;
      case "confirm-cancel-command":
        await cancelQueued(button.dataset.id, button);
        break;
      case "menu":
        state.menu = !state.menu;
        render();
        break;
      case "modal-close":
        closeModal();
        break;
      case "settings":
        settingsModal();
        break;
      case "connection":
        location.hash = "connection";
        break;
      case "scenarios":
        scenariosModal();
        break;
      case "toggle-secret": {
        const input = $("#api-key"),
          show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute(
          "aria-label",
          show ? "Hide API key" : "Show API key",
        );
        break;
      }
      case "connect-api":
        await connectApi(button);
        break;
      case "disconnect":
        confirmModal(
          "Disconnect this session",
          "Your server and broker continue running.",
          `<p class="muted small">Disconnecting clears the API key from this page’s memory. It does not cancel trade plans or close positions on the server.</p>`,
          "confirm-disconnect",
          "Disconnect session",
          true,
        );
        break;
      case "confirm-disconnect":
        state.api = null;
        initDemo();
        closeModal();
        render();
        toast("API session disconnected. Demo workspace restored.");
        break;
      case "scenario":
        if (state.mode !== "demo") break;
        state.scenario = button.dataset.scenario;
        state.analysis = sampleAnalysis(
          state.scenario === "unknown" ? "waiting" : state.scenario,
        );
        if (state.scenario === "unknown") {
          state.commands.unshift({
            id: "cmd-unknown-" + uuid().slice(0, 6),
            kind: "OPEN",
            state: "UNKNOWN",
            data: {},
            result: {
              request_tag: "gold:demo-uncertain",
              error:
                "The broker response was interrupted. Reconcile order and deal history before retrying.",
            },
          });
          location.hash = "activity";
        } else location.hash = "market";
        closeModal();
        render();
        toast("Demo scenario loaded: " + state.scenario + ".");
        break;
      case "reset-demo":
        initDemo();
        state.scenario = "waiting";
        closeModal();
        location.hash = "market";
        render();
        toast("Demo workspace reset.");
        break;
      case "refresh":
        await refreshData();
        break;
      case "timeframe":
        state.tf = button.dataset.tf;
        render();
        if (state.mode === "api") await refreshData(true);
        break;
      case "tab":
        state.tab = button.dataset.tab;
        render();
        break;
      case "analyse":
        location.hash = "analysis";
        if (state.route === "analysis") $("#chart-files")?.focus();
        break;
      case "browse":
        $("#chart-files").click();
        break;
      case "remove-upload": {
        const i = Number(button.dataset.index);
        URL.revokeObjectURL(state.uploads[i].preview);
        state.uploads.splice(i, 1);
        render();
        break;
      }
      case "capture":
        await captureChart();
        break;
      case "run-analysis":
        await runAnalysis(button);
        break;
      case "review-trade":
        if (state.networkError) {
          toast("Restore the API connection before reviewing a new trade.");
          break;
        }
        reviewTrade();
        break;
      case "submit-trade":
        await submitTrade(button);
        break;
      case "analysis-details":
        showAnalysis();
        break;
      case "copy-analysis":
        await navigator.clipboard.writeText(
          JSON.stringify(state.analysis.data, null, 2),
        );
        toast("Analysis JSON copied.");
        break;
      case "refresh-analysis":
        setBusy(button, true);
        try {
          state.analysis = await state.api.analysis(state.analysis.id);
          closeModal();
          render();
          showAnalysis();
        } catch (err) {
          setBusy(button, false);
          toast(err.message);
        }
        break;
      case "close-position":
        closePositionModal(button.dataset.ticket);
        break;
      case "protection":
        protectionModal(button.dataset.ticket);
        break;
      case "confirm-close":
        await positionMutation(button, "CLOSE");
        break;
      case "confirm-protection":
        await positionMutation(button, "PROTECTION");
        break;
      case "cancel-plan":
        confirmModal(
          "Cancel this trade plan?",
          "Stop monitoring before an order enters the queue.",
          `<div class="notice">Plan <span class="mono">${esc(short(button.dataset.id))}</span> will stop watching its entry conditions. This does not close an existing position.</div>`,
          "confirm-cancel-plan",
          "Cancel trade plan",
          true,
          `data-id="${esc(button.dataset.id)}"`,
        );
        break;
      case "confirm-cancel-plan":
        await cancelPlan(button.dataset.id, button);
        break;
      case "plan-details": {
        const p = state.plans.find((p) => p.id === button.dataset.id);
        openModal(
          "Trade plan details",
          "Saved conditions and current monitoring state.",
          `<div class="row" style="margin-bottom:16px">${badge(p.state)}<span class="mono small muted">${esc(short(p.id))}</span></div><pre class="json-view">${esc(JSON.stringify({ id: p.id, state: p.state, execution: p.data, setup: p.analysis?.data }, null, 2))}</pre>`,
        );
        break;
      }
      case "simulate-trigger": {
        const p = state.plans.find((p) => p.id === button.dataset.id);
        if (p.state !== "MONITORING" || state.mode !== "demo") break;
        p.state = "QUEUED";
        const c = {
          id: "cmd-demo-" + uuid().slice(0, 6),
          kind: "OPEN",
          state: "QUEUED",
          data: { analysis_id: p.analysis_id },
          created_at: stamp(),
        };
        keepCommand(c);
        notify(
          "Demo entry conditions simulated",
          "Trade plan is queued for simulated execution.",
          "plans",
          "QUEUED",
        );
        render();
        finishDemoCommand(c, () => {
          p.state = "FILLED";
          c.state = "FILLED";
          const a = p.analysis.data;
          state.positions.push({
            ticket: String(108500000 + Math.floor(Math.random() * 9999)),
            symbol: state.symbol,
            side: a.proposed_side,
            volume: p.data.sizing.volume_lots,
            sl: a.stop_loss,
            tp: a.take_profits[p.data.take_profit_index || 0],
            price_open: 4032.18,
            magic: 261026,
          });
          return "Demo trade plan filled";
        });
        break;
      }
      case "command-details": {
        const c = state.commands.find((c) => c.id === button.dataset.id);
        openModal(
          "Execution command",
          "An accepted request and a completed trade are different states.",
          `<div class="row" style="margin-bottom:16px">${badge(c.state)}<span class="small muted">${esc(c.kind)}</span></div>${c.state === "UNKNOWN" ? '<div class="notice red" style="margin-bottom:16px">Do not retry this command. An operator must reconcile the outcome with broker history.</div>' : ""}<pre class="json-view">${esc(JSON.stringify(c, null, 2))}</pre>`,
        );
        break;
      }
      case "clear-search":
        state.query = "";
        state.page = 1;
        render();
        $("#position-search")?.focus();
        break;
      case "page-prev":
        state.page = Math.max(1, state.page - 1);
        $("#position-results").innerHTML = positionResults();
        break;
      case "page-next":
        state.page++;
        $("#position-results").innerHTML = positionResults();
        break;
      case "toggle-levels":
        showLevels = !showLevels;
        render();
        toast(
          showLevels
            ? "Analysis price levels shown."
            : "Analysis price levels hidden.",
        );
        break;
      case "crosshair":
        toast(
          "Move across the chart to inspect a candle. Candle data is available for keyboard access.",
        );
        break;
      case "expand-chart":
        openModal(
          `${state.symbol} · ${state.tf}`,
          "Closed candles · " +
            (state.mode === "demo"
              ? "Illustrative demo data"
              : "Broker snapshot"),
          `<div style="min-height:300px">${chartSvg(true)}</div>`,
        );
        $("#modal").style.maxWidth = "1050px";
        break;
      case "chart-data": {
        const bars = (
          state.liveCandles[state.tf] || demoCandles(state.tf)
        ).slice(-10);
        openModal(
          "Closed candle data",
          `${state.symbol} · ${state.tf} · UTC+7 · ${state.mode === "demo" ? "Illustrative values" : "Broker snapshot"}`,
          `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th></tr></thead><tbody>${bars.map((b) => `<tr><td class="mono">${timefmt(b.time * 1000)}</td><td class="mono">${money(b.open)}</td><td class="mono">${money(b.high)}</td><td class="mono">${money(b.low)}</td><td class="mono">${money(b.close)}</td></tr>`).join("")}</tbody></table></div>`,
        );
        break;
      }
    }
  } catch (error) {
    toast(error.message || "Something went wrong. Please try again.");
  }
};
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "chart-files") {
    addFiles(el.files);
    return;
  }
  if (el.id === "close-volume")
    $("#partial-field").classList.toggle("hidden", el.value !== "partial");
  const action = el.dataset.change;
  if (action === "analysis-tf") {
    state.tf = el.value;
    render();
    if (state.mode === "api") refreshData(true);
  }
  if (action === "horizon") state.horizon = Number(el.value);
  if (action === "upload-tf")
    state.uploads[Number(el.dataset.index)].tf = el.value;
  if (action === "capture-time") {
    if (el.value)
      state.uploads[Number(el.dataset.index)].captured = new Date(
        el.value,
      ).toISOString();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.matches("input[aria-invalid=true]"))
    e.target.removeAttribute("aria-invalid");
  if (e.target.id === "position-search") {
    state.query = e.target.value;
    state.page = 1;
    $("#position-results").innerHTML = positionResults();
    const clear = $(".search button");
    if (state.query && !clear) {
      const button = document.createElement("button");
      button.className = "icon-button";
      button.dataset.action = "clear-search";
      button.addEventListener("click", window.aurumAction);
      button.setAttribute("aria-label", "Clear position search");
      button.innerHTML = icon("close");
      $(".search").append(button);
    } else if (!state.query && clear) clear.remove();
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "connection-form")
    $('#modal [data-action="connect-api"]')?.click();
  if (e.target.id === "trade-form")
    $('#modal [data-action="submit-trade"]')?.click();
});
$("#modal").addEventListener("close", () => {
  $("#modal").style.maxWidth = "";
});
navigate();
