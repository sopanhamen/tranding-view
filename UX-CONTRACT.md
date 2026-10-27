# UX Contract

## Product context

Owner: Panha. Primary jobs: connect the configured terminal; inspect closed candles; analyse screenshots; review conditional entries; manage position protection and exits. English UI, en-US numeric formatting, Asia/Bangkok timestamps, Gregorian calendar. WCAG 2.2 AA target; full cross-device accessibility certification is outside this prototype's verification claim.

## Business-context sources

| Domain / scope          | Authoritative source                                                                   | Source type                   | Reviewed date |
| ----------------------- | -------------------------------------------------------------------------------------- | ----------------------------- | ------------- |
| Permission model        | backend app/api/deps.py and README.md; summary in docs/API-INTEGRATION.md              | Server API / owner-key policy | 2026-10-27    |
| Data lifecycle          | backend app/schemas.py and docs/API_WORKFLOW.md; UI mapping in docs/API-INTEGRATION.md | Verified API contract         | 2026-10-27    |
| Deletion / retention    | Backend README: raw uploads are not retained; browser uploads are session-only         | Server/privacy implementation | 2026-10-27    |
| Billing / payment       | No subscription or payment flow in this UI                                             | Current task scope            | 2026-10-27    |
| Legal / regulatory copy | No regulatory or profitability claims; illustrative demo only                          | Current task scope            | 2026-10-27    |
| Market conventions      | User request: XAUUSD M5/M10/M15/M30/H1/H4                                              | Current task                  | 2026-10-27    |

## Visual contract

DESIGN.md explains the graphite instrument-panel identity. src/styles.css is the canonical runtime token source. All screen templates reuse shared classes and common dialog, badge, table, notification and action owners. Token drift gate: npm run verify:tokens. One dark theme; forced-colors fallback and reduced-motion rules.

## Canonical UI Map

| Capability     | Canonical owner                                | Source of truth             | Allowed variants                          | Verification                              |
| -------------- | ---------------------------------------------- | --------------------------- | ----------------------------------------- | ----------------------------------------- |
| Select/Listbox | Native select in src/app.js                    | UX contract                 | native OS popup                           | Browser trade TP and analysis timeframe   |
| Date           | Native datetime-local in upload row            | UX contract                 | native device time; ISO transport         | Capture metadata validation               |
| Form           | Shared field CSS and app-owned submit handlers | UX contract and API schemas | create / edit                             | Node payload tests and browser validation |
| Scrollbar      | src/styles.css global baseline                 | DESIGN.md                   | stable table geometry                     | Static audit and computed style           |
| Toast          | toast() in src/app.js and #toast live region   | UX contract                 | success / warning / error acknowledgement | Browser state changes                     |
| CRUD           | ApiClient and shared modal mutations           | API contract                | pessimistic queued / read                 | Node request tests and browser demo flows |

Table Selection is not applicable: no bulk selection. No hard deletion exists.

## Component behavior

Semantic buttons/anchors only. Enabled actions have hover/pointer/focus states. Busy buttons retain width and prevent duplicate submit. API key inputs mask by default and expose a changing show/hide accessible label. Native input constraints are metadata; validation bubbles are disabled with novalidate. Inline error summaries remain until corrected. Textareas, when introduced, inherit resize:none.

## Dataset navigation

Position API returns a complete account snapshot: client search and pages of eight are honest. Search clearing is immediate; query/page are intentionally session-only because account tickets are sensitive and sharing them in URLs is undesirable. API v0.2 restores paginated plans, commands, events and analyses from the owner-scoped PostgreSQL history. Load older controls preserve loaded rows; snapshot refresh updates recent records. Events are bounded to 100. Missing data and no-results states differ. Filter changes reset paging. Document scrolling remains the owner for forms; tables scroll horizontally.

## Flow ledger

| Operation       | Trigger                              | Pending                                | Success destination | Success feedback                   | Failure recovery                      | Focus outcome      | Source ref                           |
| --------------- | ------------------------------------ | -------------------------------------- | ------------------- | ---------------------------------- | ------------------------------------- | ------------------ | ------------------------------------ |
| Analyse         | Run analysis                         | Indeterminate spinner; no fake percent | Stay on analysis    | Saved result and toast             | Keep uploads, inline error            | Same panel         | POST /analyses                       |
| Create plan     | Review then Start monitoring         | Disabled confirm                       | Trade plans         | Monitoring, explicitly no position | Preserve fields                       | Main route heading | POST /trade-plans                    |
| Immediate order | Review BUY/SELL then submit          | QUEUED; no optimistic position         | Activity            | Actual command state               | Same idempotency key for same payload | Activity heading   | POST /orders; GET /commands/{id}     |
| Close position  | Review ticket/full or partial volume | Queued; position retained              | Current list        | Broker-confirmed close only        | Inline error, same key                | Trigger or list    | POST /positions/{ticket}/close       |
| Update SL/TP    | Edit protection then submit          | Queued, prior values retained          | Same list           | Broker-confirmed update            | Keep fields, same key                 | Trigger or list    | PATCH /positions/{ticket}/protection |
| Cancel plan     | App confirmation naming plan         | Disabled confirmation                  | Trade plans         | Server-confirmed cancellation      | 409 leaves plan intact                | List               | POST /trade-plans/{id}/cancel        |
| Connect         | URL/key + expected mode              | Health/status/symbol checks            | Connection          | Account identity                   | Keep form; masked key                 | Connection route   | /health; /mt5 endpoints              |
| Disconnect      | Confirmation                         | Immediate memory clear                 | Demo workspace      | Warn that server continues running | Not a server shutdown                 | Route heading      | Client-session operation             |

## Navigation and responsive behavior

Hash routes set a page-specific document title. Navigation focuses main without moving scroll unexpectedly. Unsupported routes go to the market screen. Mobile drawer retains all navigation labels; large tables preserve all columns via visible horizontal scroll. Native select/datetime popup geometry is intentionally platform-owned. App dialogs restore focus to the trigger when it remains mounted.

## Overlays and feedback

One native dialog primitive, app-owned contents, showModal trapping/inert background. Initial focus is Cancel. Escape dismisses; backdrop click dismisses only outside bounds. Long content scrolls internally. Trade/close/cancel/update reviews name object and consequence. No typed confirmation for routine actions; real-account linking has an explicit acknowledgement. Toast is bottom center with polite live region; persistent errors have inline or page homes. No alert/confirm/prompt.

## Async and resilience

API-mode writes are pessimistic and server-queued. Financial mutations never auto-retry. Idempotency keys are kept in memory per operation+payload and reused on manual retry. Workspace history, account/quote and candle snapshots refresh every 2.5 seconds while this tab is visible; individual failures surface a persistent banner and pause entry review. UNKNOWN is terminal for client polling, blocks new entry and directs operator reconciliation. GET refresh ignores superseded results via epoch. Offline retains read data; no offline write queue. API keys, chart files and IDs are not in persistent storage. A reload requires re-entering the memory-only owner key, then restores history. It does not stop backend plans. Uploaded files survive in-app navigation.

## Validation

Validate files by MIME, decoded dimensions, 8MB size and max six; per-file failures preserve valid files. Primary timeframe must match an attached chart; capture time must be recent and include timezone in transport. Lot size and deviation are validated before submission; server remains authoritative for broker/risk constraints. Errors are text, never only color. Economic-calendar blockers are honored. Provider credentials and risk policies remain server-owned. Pausing and resuming a plan retains original deadlines; queued cancellation is only offered before submission. Demo seed scenarios explicitly differ from default mock backend behavior and never submit to a broker.

## Permission and clipboard

Owner-key interface, not public customer authentication. No provider credentials in frontend fields; no credentials in URLs/storage/logs/toasts. JSON copy includes only the analysis data object, not API keys. Buttons use visible disabled state plus a persistent explanation for blocked execution. The UI never offers a force-execute or UNKNOWN-retry action.

## Verification

Node contract tests: tests/api.test.js. Runtime checks: npm run check; npm run build; npm run verify:tokens. Static strict audit: premium-audit.json. Browser flow and failure evidence: docs/QA.md. Compare create-plan and close-position confirmation/queued states as sibling workflows. Desktop browser and a CSS-based narrow preview inspected; physical-device, assistive-technology and real financial execution are not claimed.

## v0.2 behavior additions

API source: backend app/api/workspace.py and migration 0002. Pause/resume uses the shared confirmation primitive; resume does not replay historical candles. Queued cancellation uses the same pessimistic confirmation and server row-lock authority as plan cancellation. History is read from the server with scoped pagination. UNKNOWN has no retry or force-resolve action. API snapshots never fall back to demo data. CSV exports only loaded command records and escapes formula prefixes. The full-stack bundle serves the same static UI from FastAPI to permit same-origin operation.
