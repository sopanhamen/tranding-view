<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref, watch, nextTick } from 'vue'
import { useWorkspace, sizingLabel } from '~/composables/useWorkspace'
import { errorMessage, blockingReasons, reasonText, type ExecutionValues, type SizingType } from '~/utils/api'
import { buildChartSvg } from '~/utils/chart'
import { money, timefmt, datefmt, humanize, relative, accountMoney } from '~/utils/format'

const {
  state,
  modal,
  modalError,
  modalBusy,
  closeModal,
  connectApi,
  previewTrade,
  submitTrade,
  positionMutation,
  applyScenario,
  resetDemo,
  chartBars,
  demoCandles,
  selectAnalysis,
  toast,
} = useWorkspace()

const config = useRuntimeConfig()
const dlg = ref<HTMLDialogElement | null>(null)
const type = computed(() => modal.value?.type ?? '')
const modalBodyHtml = computed(() => (modal.value as { bodyHtml?: string } | null)?.bodyHtml)

// --- connection form state ---
const connBase = ref('')
const connMode = ref<'demo' | 'real'>('demo')
const connLogin = ref('')
const connPassword = ref('')
const connServer = ref('')
const connBroker = ref('')
const connRealConfirm = ref(false)
const CONN_MODES: { value: 'demo' | 'real'; label: string }[] = [
  { value: 'demo', label: 'Demo account' },
  { value: 'real', label: 'Real account' },
]

// --- review-trade form state ---
const SIZING_DEFAULTS: Record<SizingType, string> = { FIXED_LOTS: '0.01', RISK_PERCENT: '0.5', RISK_AMOUNT: '50' }
const SIZING_TYPES: { value: SizingType; label: string }[] = [
  { value: 'FIXED_LOTS', label: 'Fixed lots' },
  { value: 'RISK_PERCENT', label: '% of equity' },
  { value: 'RISK_AMOUNT', label: 'Risk amount' },
]
const sizingType = ref<SizingType>('FIXED_LOTS')
const sizingValue = ref('0.01')
const tradeTp = ref('0')
const tradeSpread = ref('50')
const tradeDeviation = ref('20')
const orderType = ref('MARKET')
const orderPrice = ref('')
const preview = ref<any>(null)
const previewError = ref('')
const previewBusy = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewAbort: AbortController | null = null

// --- close-position form state ---
const closeMode = ref('full')
const partialVolume = ref('0.01')

// --- protection form state ---
const protectSl = ref('')
const protectTp = ref('')
const allowWider = ref(false)

const analysis = computed(() => state.analysis)
const a = computed(() => analysis.value?.data)
const position = computed(() => state.positions.find((p: any) => p.ticket === modal.value?.ticket))
const plan = computed(() => state.plans.find((p: any) => p.id === modal.value?.id))
const command = computed(() => state.commands.find((c: any) => c.id === modal.value?.id))
const isOrder = computed(() => modal.value?.kind === 'order')

const chartDataBars = computed(() => (state.liveCandles[state.tf] || demoCandles(state.tf)).slice(-10))
const expandSvg = computed(() =>
  buildChartSvg(chartBars(), {
    symbol: state.symbol,
    tf: state.tf,
    mode: state.mode,
    analysis: state.analysis,
    showLevels: state.showLevels,
    large: true,
  }),
)

const title = computed(() => {
  const m = modal.value
  if (!m) return ''
  switch (m.type) {
    case 'settings':
      return 'Connect your FastAPI backend'
    case 'scenarios':
      return 'Explore the demo'
    case 'review-trade':
      return m.kind === 'plan' ? 'Review conditional trade plan' : 'Review order'
    case 'analysis-details':
      return 'Analysis details'
    case 'close-position':
      return 'Close position'
    case 'protection':
      return 'Update position protection'
    case 'plan-details':
      return 'Trade plan details'
    case 'command-details':
      return 'Execution command'
    case 'chart-data':
      return 'Closed candle data'
    case 'expand-chart':
      return `${state.symbol} · ${state.tf}`
    case 'confirm':
      return m.title
    default:
      return ''
  }
})

const description = computed(() => {
  const m = modal.value
  if (!m) return ''
  switch (m.type) {
    case 'settings':
      return 'Log the worker’s MT5 terminal into your account. The password is stored encrypted on the server.'
    case 'scenarios':
      return 'All scenarios use illustrative data. No real orders or AI requests are sent.'
    case 'review-trade':
      return `${state.symbol} · ${a.value?.proposed_side || 'No direction'} · ${state.mode === 'demo' ? 'Simulated execution' : state.account.mode.toUpperCase() + ' account ' + state.account.login}`
    case 'analysis-details':
      return 'The saved setup, its evidence, limitations and live eligibility.'
    case 'close-position':
      return position.value ? `${position.value.symbol} · ${position.value.side} · Ticket ${position.value.ticket}` : ''
    case 'protection':
      return position.value
        ? `${position.value.symbol} · ${position.value.side} ${money(position.value.volume)} lots · ${position.value.ticket}`
        : ''
    case 'plan-details':
      return 'Saved conditions and current monitoring state.'
    case 'command-details':
      return 'An accepted request and a completed trade are different states.'
    case 'chart-data':
      return `${state.symbol} · ${state.tf} · UTC+7 · ${state.mode === 'demo' ? 'Illustrative values' : 'Broker snapshot'}`
    case 'expand-chart':
      return 'Closed candles · ' + (state.mode === 'demo' ? 'Illustrative demo data' : 'Broker snapshot')
    case 'confirm':
      return m.description
    default:
      return ''
  }
})

const reviewBlocker = computed(() => modal.value?.blocker as string | null)
const side = computed(() => a.value?.proposed_side ?? 'BUY')
const orderTypes = computed(() => ['MARKET', `${side.value}_LIMIT`, `${side.value}_STOP`])
const actionableUntil = computed(() =>
  analysis.value ? Math.min(Date.parse(analysis.value.expires_at), Date.parse(analysis.value.reassess_at)) : NaN,
)
const canSubmit = computed(
  () => !reviewBlocker.value && !modalBusy.value && (!isOrder.value || (preview.value?.valid === true && !previewBusy.value)),
)

const sizingHelp = computed(() => {
  if (sizingType.value === 'FIXED_LOTS') {
    const s = state.spec
    return s?.volume_min ? `Broker min ${s.volume_min}, step ${s.volume_step}, max ${s.volume_max} lots.` : 'Broker lot rules are validated by the server.'
  }
  return sizingType.value === 'RISK_PERCENT'
    ? 'Lots are sized so the stop loss risks this share of equity.'
    : `Lots are sized so the stop loss risks this amount (${state.account.currency}).`
})

function defaultBase() {
  if (state.base) return state.base
  if (config.public.apiBase) return String(config.public.apiBase)
  if (typeof location === 'undefined') return ''
  return ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8000' : ''
}

function tradeValues(): ExecutionValues {
  return {
    sizingType: sizingType.value,
    sizingValue: sizingValue.value,
    tp: tradeTp.value,
    spread: tradeSpread.value,
    deviation: tradeDeviation.value,
    orderType: orderType.value,
    price: orderPrice.value,
  }
}

function setSizing(t: SizingType) {
  sizingType.value = t
  sizingValue.value = t === 'FIXED_LOTS' && state.spec?.volume_min ? String(state.spec.volume_min) : SIZING_DEFAULTS[t]
}

function schedulePreview() {
  if (type.value !== 'review-trade' || !isOrder.value || reviewBlocker.value) return
  clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 350)
}

async function runPreview() {
  previewAbort?.abort()
  const controller = new AbortController()
  previewAbort = controller
  previewBusy.value = true
  previewError.value = ''
  try {
    const result = await previewTrade(tradeValues(), controller.signal)
    if (controller.signal.aborted) return
    preview.value = result
  } catch (error) {
    if (controller.signal.aborted) return
    preview.value = null
    previewError.value = errorMessage(error)
  } finally {
    if (previewAbort === controller) previewBusy.value = false
  }
}

watch([sizingType, sizingValue, tradeTp, tradeSpread, tradeDeviation, orderType, orderPrice], schedulePreview)

// Reset form fields each time a modal opens.
watch(
  () => modal.value,
  async (m) => {
    if (!m) {
      previewAbort?.abort()
      clearTimeout(previewTimer)
      if (dlg.value?.open) dlg.value.close()
      document.body.style.overflow = ''
      return
    }
    if (m.type === 'settings') {
      // Prefill everything but the password from the current API session.
      const c = state.mode === 'api' ? state.connection : null
      connBase.value = defaultBase()
      connMode.value = c?.connectionType ?? state.connectMode
      connLogin.value = c?.connection_login ? String(c.connection_login) : ''
      connPassword.value = ''
      connServer.value = c?.server ?? ''
      connBroker.value = c?.broker ?? ''
      connRealConfirm.value = false
    }
    if (m.type === 'review-trade') {
      const d = a.value
      setSizing('FIXED_LOTS')
      tradeTp.value = '0'
      tradeSpread.value = '50'
      tradeDeviation.value = '20'
      orderType.value = d?.entry_method === 'PENDING' && d.proposed_order_type ? d.proposed_order_type : 'MARKET'
      const entry = analysis.value?.assessment?.entry?.reference_entry ?? (d?.entry_zone ? (d.entry_zone[0] + d.entry_zone[1]) / 2 : null)
      orderPrice.value = entry == null ? '' : Number(entry).toFixed(state.spec?.digits ?? 2)
      preview.value = null
      previewError.value = ''
      schedulePreview()
    }
    if (m.type === 'close-position') {
      closeMode.value = 'full'
      partialVolume.value = String(state.spec?.volume_min ?? 0.01)
    }
    if (m.type === 'protection' && position.value) {
      protectSl.value = String(position.value.sl || '')
      protectTp.value = String(position.value.tp || '')
      allowWider.value = false
    }
    await nextTick()
    if (dlg.value && !dlg.value.open) dlg.value.showModal()
    document.body.style.overflow = 'hidden'
  },
  { immediate: true },
)

function onDialogClose() {
  document.body.style.overflow = ''
  if (modal.value) closeModal()
}

function onDialogClick(e: MouseEvent) {
  if (e.target !== dlg.value) return
  const r = dlg.value!.getBoundingClientRect()
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal()
}

// --- action handlers ---
function doConnect() {
  if (connMode.value === 'real' && !connRealConfirm.value) {
    modalError.value = 'Confirm the real-account connection before continuing.'
    return
  }
  connectApi({
    base: connBase.value.trim(),
    connectionType: connMode.value,
    login: connLogin.value,
    password: connPassword.value,
    server: connServer.value,
    broker: connBroker.value,
  })
}
function doSubmitTrade() {
  if (!canSubmit.value) return
  submitTrade(modal.value!.kind, tradeValues())
}
function doClose() {
  positionMutation('CLOSE', modal.value!.ticket, { closeMode: closeMode.value, partialVolume: partialVolume.value })
}
function doProtection() {
  positionMutation('PROTECTION', modal.value!.ticket, { sl: protectSl.value, tp: protectTp.value, allowWider: allowWider.value })
}
async function copyAnalysis() {
  await navigator.clipboard.writeText(JSON.stringify(a.value, null, 2))
  toast('Analysis JSON copied.')
}
async function refreshAnalysis() {
  modalBusy.value = true
  await selectAnalysis(state.analysis.id)
  modalBusy.value = false
}
</script>

<template>
  <dialog ref="dlg" aria-labelledby="modal-title" :style="type === 'expand-chart' ? 'max-width:1050px' : ''" @close="onDialogClose" @click="onDialogClick">
    <template v-if="modal">
      <div class="modal-head">
        <div><h2 id="modal-title">{{ title }}</h2><p>{{ description }}</p></div>
        <FormIconButton icon="close" label="Close dialog" @click="closeModal" />
      </div>

      <div class="modal-content">
        <!-- Connection -->
        <form v-if="type === 'settings'" novalidate @submit.prevent="doConnect">
          <div class="stack">
            <FormInput
              id="api-base"
              v-model="connBase"
              label="FastAPI base URL"
              help="Origin only, without /api/v1. The API’s CORS must allow this site’s origin."
              type="url"
              placeholder="http://localhost:8000"
              autocomplete="url"
            />
            <FormField label="MT5 account type">
              <FormSegmented v-model="connMode" :options="CONN_MODES" aria-label="MT5 account type" />
            </FormField>
            <div class="form-grid">
              <FormInput id="mt5-login" v-model="connLogin" label="Account login" type="text" inputmode="numeric" placeholder="e.g. 12345678" autocomplete="username" spellcheck="false" />
              <FormPassword
                id="mt5-password"
                v-model="connPassword"
                label="Trading password"
                help="Not the investor password. Sent once; never kept in this page."
                autocomplete="current-password"
              />
              <FormInput
                id="mt5-server"
                v-model="connServer"
                label="Server"
                help="Exactly as shown in MT5’s login dialog."
                type="text"
                placeholder="e.g. Exness-MT5Trial7"
                autocomplete="off"
                spellcheck="false"
              />
              <FormInput id="mt5-broker" v-model="connBroker" label="Broker label" optional type="text" placeholder="e.g. Exness" maxlength="100" autocomplete="off" />
            </div>
            <div class="notice amber"><Icon name="shield" /> Connecting logs the worker’s terminal into this account but does not place a trade. If the worker is offline or still logging in you can browse history; trading stays paused until the account is active.</div>
            <FormCheckbox v-if="connMode === 'real'" v-model="connRealConfirm" style="margin-top: 12px">I understand this connects to a real-money account.</FormCheckbox>
            <FormError :message="modalError" />
          </div>
        </form>

        <!-- Scenarios -->
        <div v-else-if="type === 'scenarios'" class="scenario-options">
          <button class="scenario-option" @click="applyScenario('waiting')"><Icon name="clock" /><span><strong>Waiting for confirmation</strong><small>Review a setup and create a conditional trade plan.</small></span></button>
          <button class="scenario-option" @click="applyScenario('ready')"><Icon name="trend" /><span><strong>Ready to enter</strong><small>Preview an immediate BUY order and track its simulated fill.</small></span></button>
          <button class="scenario-option" @click="applyScenario('blocked')"><Icon name="lock" /><span><strong>Missing market context</strong><small>See how execution is blocked when the calendar is unavailable.</small></span></button>
          <button class="scenario-option" @click="applyScenario('unknown')"><Icon name="info" /><span><strong>Uncertain execution</strong><small>Inspect an UNKNOWN command without retrying an order.</small></span></button>
        </div>

        <!-- Review trade -->
        <template v-else-if="type === 'review-trade'">
          <div class="modal-summary">
            <div><span>Entry zone</span><strong>{{ a.entry_zone?.map((v: number) => money(v)).join(' – ') || 'Not set' }}</strong></div>
            <div><span>Stop loss</span><strong>{{ a.stop_loss ? money(a.stop_loss) : 'Not set' }}</strong></div>
            <div><span>Trigger</span><strong style="font-family: var(--font-sans)">{{ isOrder ? (orderType === 'MARKET' ? 'Current broker quote' : humanize(orderType) + ' at your price') : 'Closed-candle breakout + retest' }}</strong></div>
            <div><span>Actionable until</span><strong>{{ Number.isFinite(actionableUntil) ? `${timefmt(actionableUntil)} · ${relative(actionableUntil, state.now)}` : '—' }}</strong></div>
          </div>
          <div v-if="reviewBlocker" class="notice red" style="margin-bottom: 18px"><Icon name="lock" /> {{ reviewBlocker }}</div>
          <form novalidate @submit.prevent="doSubmitTrade">
            <FormField label="Position sizing" style="margin-bottom: 15px">
              <FormSegmented :model-value="sizingType" :options="SIZING_TYPES" aria-label="Position sizing" @update:model-value="setSizing" />
            </FormField>
            <div class="form-grid">
              <FormInput
                id="trade-size"
                v-model="sizingValue"
                :label="sizingType === 'FIXED_LOTS' ? 'Lot size' : sizingType === 'RISK_PERCENT' ? 'Risk (% of equity)' : `Risk (${state.account.currency})`"
                :help="sizingHelp"
                type="number"
                min="0"
                :step="sizingType === 'FIXED_LOTS' ? state.spec?.volume_step || 0.01 : 0.1"
                inputmode="decimal"
              />
              <FormSelect id="trade-tp" v-model="tradeTp" label="Take-profit target" help="One TP is attached to the position.">
                <option v-for="(p, i) in a.take_profits" :key="i" :value="String(i)">
                  TP {{ Number(i) + 1 }} · {{ money(p) }}{{ analysis.assessment?.reward_risk?.take_profits?.[i]?.gross_reward_risk ? ` · ${analysis.assessment.reward_risk.take_profits[i].gross_reward_risk.toFixed(2)}R` : '' }}
                </option>
              </FormSelect>
              <template v-if="isOrder">
                <FormSelect id="trade-type" v-model="orderType" label="Order type">
                  <option v-for="t in orderTypes" :key="t" :value="t">{{ t === 'MARKET' ? 'Market (now)' : humanize(t) }}{{ t === a.proposed_order_type ? ' · suggested' : '' }}</option>
                </FormSelect>
                <FormInput v-if="orderType !== 'MARKET'" id="trade-price" v-model="orderPrice" label="Order price" type="number" :step="state.spec?.point || 0.01" inputmode="decimal">
                  <template #help>Inside {{ a.entry_zone?.map((v: number) => money(v)).join(' – ') }}. Expires with the analysis.</template>
                </FormInput>
              </template>
              <FormInput id="trade-spread" v-model="tradeSpread" label="Max spread (points)" type="number" min="1" inputmode="numeric" />
              <FormInput id="trade-deviation" v-model="tradeDeviation" label="Max deviation (points)" type="number" min="0" max="1000" inputmode="numeric" />
            </div>

            <!-- Server preview (orders only) -->
            <div v-if="isOrder && !reviewBlocker" class="panel" style="margin-top: 18px" aria-live="polite">
              <div class="panel-head">
                <h2>Server preview</h2>
                <span v-if="previewBusy" class="small muted"><span class="spinner" /> Checking…</span>
                <Badge v-else-if="preview" :value="preview.valid ? 'READY' : 'REJECTED'" />
              </div>
              <div class="panel-body">
                <FormError v-if="previewError" :message="previewError" role="status" style="margin: 0" />
                <template v-else-if="preview">
                  <div v-if="preview.order" class="modal-summary" style="margin-bottom: 10px">
                    <div><span>Volume</span><strong>{{ money(preview.order.volume) }} lots</strong></div>
                    <div><span>Est. entry</span><strong>{{ money(preview.order.estimated_execution_price) }}</strong></div>
                    <div><span>Loss at SL</span><strong class="negative">{{ accountMoney(preview.order.risk?.estimated_loss, preview.order.risk?.currency) }}</strong></div>
                    <div><span>Profit at TP</span><strong class="positive">{{ accountMoney(preview.order.risk?.estimated_profit, preview.order.risk?.currency) }}</strong></div>
                    <div><span>Equity at risk</span><strong>{{ money(preview.order.risk?.risk_percent_of_equity) }}%</strong></div>
                    <div><span>Reward / risk</span><strong>{{ preview.order.risk?.gross_reward_risk ? preview.order.risk.gross_reward_risk.toFixed(2) + 'R' : '—' }}</strong></div>
                  </div>
                  <ul v-if="preview.rejections?.length" class="small negative" style="margin: 0; padding-left: 16px">
                    <li v-for="r in preview.rejections" :key="r.code">{{ reasonText(r) }}</li>
                  </ul>
                  <ul v-if="preview.warnings?.length" class="small" style="margin: 6px 0 0; padding-left: 16px">
                    <li v-for="w in preview.warnings" :key="w">{{ w }}</li>
                  </ul>
                  <p class="hint" style="margin-top: 8px">{{ preview.note || 'Estimates exclude slippage. The worker re-checks everything with live broker data.' }}</p>
                </template>
                <p v-else class="hint" style="margin: 0">Adjust the values to price this order.</p>
              </div>
            </div>

            <div class="notice" style="margin-top: 18px"><Icon name="info" /> {{ isOrder ? 'A queued request is not a confirmed fill. Track the broker outcome in Activity.' : 'The plan watches closed candles. Size is resolved against live prices when it triggers. No position opens now.' }}</div>
            <FormError :message="modalError" style="margin-top: 10px" />
          </form>
        </template>

        <!-- Analysis details -->
        <template v-else-if="type === 'analysis-details'">
          <div class="notice" style="margin-bottom: 16px">{{ a.rationale || 'No rationale supplied.' }}</div>
          <div class="form-grid" style="margin-bottom: 18px">
            <div><span class="field-label">Market data as of</span><p class="small mono" style="margin-top: 5px">{{ datefmt(analysis.market_data_as_of || analysis.created_at) }} UTC+7</p></div>
            <div><span class="field-label">Reassess at</span><p class="small mono" style="margin-top: 5px">{{ datefmt(analysis.reassess_at) }} UTC+7</p></div>
            <div><span class="field-label">Entry method</span><p class="small" style="margin-top: 5px">{{ humanize(a.entry_method) || 'None' }}{{ a.proposed_order_type ? ' · ' + humanize(a.proposed_order_type) : '' }}</p></div>
            <div><span class="field-label">Missing context</span><p class="small" style="margin-top: 5px">{{ a.missing_data?.map(humanize).join(', ') || 'None reported' }}</p></div>
          </div>
          <div v-if="blockingReasons(analysis, state.now).length" class="notice red" style="margin-bottom: 16px">
            <Icon name="lock" /> {{ blockingReasons(analysis, state.now).map(reasonText).join(' ') }}
          </div>
          <div v-if="a.reasons?.length" style="margin-bottom: 14px">
            <span class="field-label">Evidence</span>
            <ul class="small" style="margin: 6px 0 0; padding-left: 16px"><li v-for="r in a.reasons" :key="r">{{ r }}</li></ul>
          </div>
          <div v-if="analysis.assessment?.limitations?.length" style="margin-bottom: 14px">
            <span class="field-label">Limitations</span>
            <p class="small muted" style="margin-top: 5px">{{ analysis.assessment.limitations.map(humanize).join(' · ') }}</p>
          </div>
          <p v-if="analysis.assessment?.probability?.explanation" class="hint" style="margin-bottom: 14px">{{ analysis.assessment.probability.explanation }}</p>
          <details>
            <summary class="small muted" style="cursor: pointer; margin-bottom: 8px">Raw analysis JSON</summary>
            <pre class="json-view">{{ JSON.stringify(a, null, 2) }}</pre>
          </details>
        </template>

        <!-- Close position -->
        <template v-else-if="type === 'close-position' && position">
          <div class="modal-summary">
            <div><span>Open volume</span><strong>{{ money(position.volume) }} lots</strong></div>
            <div><span>Account</span><strong>{{ state.account.login }} · {{ state.account.mode }}</strong></div>
          </div>
          <form novalidate>
            <FormField label="Close volume">
              <FormSegmented
                v-model="closeMode"
                :options="[{ value: 'full', label: `Full · ${money(position.volume)} lots` }, { value: 'partial', label: 'Partial' }]"
                aria-label="Close volume"
              />
            </FormField>
            <FormInput
              id="partial-volume"
              v-model="partialVolume"
              :class="{ hidden: closeMode !== 'partial' }"
              style="margin-top: 15px"
              label="Volume to close (lots)"
              help="The remaining volume must also satisfy broker lot rules."
              type="number"
              :min="state.spec?.volume_min || 0.01"
              :step="state.spec?.volume_step || 0.01"
              inputmode="decimal"
            />
          </form>
          <div class="notice" style="margin-top: 18px"><Icon name="info" /> This queues a close request. The position stays open until the broker confirms the close. Closes work even while new entries are blocked.</div>
          <FormError :message="modalError" />
        </template>

        <!-- Protection -->
        <template v-else-if="type === 'protection' && position">
          <div class="modal-summary">
            <div><span>Entry</span><strong>{{ money(position.price_open) }}</strong></div>
            <div><span>Current SL / TP</span><strong>{{ money(position.sl) }} / {{ money(position.tp) }}</strong></div>
          </div>
          <form novalidate>
            <div class="form-grid">
              <FormInput id="protect-sl" v-model="protectSl" label="Stop loss" type="number" :step="state.spec?.point || 0.01" inputmode="decimal" />
              <FormInput id="protect-tp" v-model="protectTp" label="Take profit" type="number" :step="state.spec?.point || 0.01" inputmode="decimal" />
            </div>
            <FormCheckbox v-model="allowWider" style="margin-top: 12px">Allow a wider stop than the current one (increases risk)</FormCheckbox>
          </form>
          <div class="notice" style="margin-top: 18px"><Icon name="shield" /> Both SL and TP are required. A wider stop is refused unless allowed, and total risk must stay within the server limit.</div>
          <FormError :message="modalError" />
        </template>

        <!-- Plan details -->
        <template v-else-if="type === 'plan-details' && plan">
          <div class="row" style="margin-bottom: 16px"><Badge :value="plan.state" /><span class="mono small muted">{{ plan.id }}</span></div>
          <div class="modal-summary">
            <div><span>Sizing</span><strong>{{ sizingLabel(plan.data?.sizing) }}</strong></div>
            <div><span>Bars since breakout</span><strong>{{ plan.breakout_time ? plan.bars_since_breakout : 'No breakout yet' }}</strong></div>
            <div><span>Created</span><strong>{{ plan.created_at ? datefmt(plan.created_at) : '—' }}</strong></div>
            <div><span>Updated</span><strong>{{ plan.updated_at ? datefmt(plan.updated_at) : '—' }}</strong></div>
          </div>
          <div v-if="plan.reason" class="notice" style="margin-bottom: 14px">{{ plan.reason }}</div>
          <details>
            <summary class="small muted" style="cursor: pointer; margin-bottom: 8px">Raw plan JSON</summary>
            <pre class="json-view">{{ JSON.stringify({ ...plan, analysis: undefined, setup: plan.analysis?.data }, null, 2) }}</pre>
          </details>
        </template>

        <!-- Command details -->
        <template v-else-if="type === 'command-details' && command">
          <div class="row" style="margin-bottom: 16px"><Badge :value="command.state" /><span class="small muted">{{ humanize(command.kind) }} · {{ command.final === false ? 'In progress' : 'Final' }}</span></div>
          <div v-if="command.state === 'UNKNOWN'" class="notice red" style="margin-bottom: 16px">Do not retry this command. An operator must reconcile the outcome with broker history using request tag <span class="mono">{{ command.result?.request_tag || '—' }}</span>.</div>
          <div v-else-if="command.result?.error" class="notice red" style="margin-bottom: 16px">{{ command.result.error }}<template v-if="command.result.next_action"> · Next: <span class="mono">{{ command.result.next_action }}</span></template></div>
          <div class="modal-summary">
            <div><span>Created</span><strong>{{ command.created_at ? datefmt(command.created_at) : '—' }}</strong></div>
            <div><span>Position ticket</span><strong>{{ command.result?.position_ticket || command.data?.ticket || '—' }}</strong></div>
            <div><span>Broker order</span><strong>{{ command.result?.broker_order || '—' }}</strong></div>
            <div><span>Fill</span><strong>{{ command.result?.price ? money(command.result.price) : '—' }}{{ command.result?.filled_volume ? ` · ${money(command.result.filled_volume)} lots` : '' }}</strong></div>
          </div>
          <details>
            <summary class="small muted" style="cursor: pointer; margin-bottom: 8px">Raw command JSON</summary>
            <pre class="json-view">{{ JSON.stringify(command, null, 2) }}</pre>
          </details>
        </template>

        <!-- Chart data -->
        <div v-else-if="type === 'chart-data'" class="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th></tr></thead>
            <tbody>
              <tr v-for="(b, i) in chartDataBars" :key="i">
                <td class="mono">{{ timefmt(b.time * 1000) }}</td>
                <td class="mono">{{ money(b.open) }}</td>
                <td class="mono">{{ money(b.high) }}</td>
                <td class="mono">{{ money(b.low) }}</td>
                <td class="mono">{{ money(b.close) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Expand chart -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-else-if="type === 'expand-chart'" style="min-height: 300px" v-html="expandSvg" />

        <!-- Generic confirm -->
        <template v-else-if="type === 'confirm'">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="modalBodyHtml" />
          <FormError :message="modalError" />
        </template>
      </div>

      <div class="modal-footer">
        <FormButton variant="ghost" autofocus @click="closeModal">Cancel</FormButton>

        <FormButton v-if="type === 'settings'" variant="primary" icon="plug" :loading="modalBusy" loading-text="Logging in…" @click="doConnect">Connect backend</FormButton>

        <FormButton v-else-if="type === 'scenarios'" variant="ghost" @click="resetDemo">Reset all demo data</FormButton>

        <FormButton
          v-else-if="type === 'review-trade'"
          variant="primary"
          :icon="isOrder ? 'arrow' : 'plans'"
          :disabled="!canSubmit"
          :loading="modalBusy"
          loading-text="Submitting…"
          @click="doSubmitTrade"
        >
          {{ !isOrder ? 'Start monitoring' : state.mode === 'demo' ? 'Place demo order' : `Submit ${side} ${orderType === 'MARKET' ? 'market' : humanize(orderType).toLowerCase()} order` }}
        </FormButton>

        <template v-else-if="type === 'analysis-details'">
          <FormButton variant="ghost" icon="copy" @click="copyAnalysis">Copy JSON</FormButton>
          <FormButton v-if="state.mode === 'api'" icon="refresh" :loading="modalBusy" @click="refreshAnalysis">Recheck eligibility</FormButton>
        </template>

        <FormButton v-else-if="type === 'close-position'" variant="danger" :loading="modalBusy" @click="doClose">
          {{ state.mode === 'demo' ? 'Close demo position' : 'Submit close request' }}
        </FormButton>

        <FormButton v-else-if="type === 'protection'" variant="primary" :loading="modalBusy" @click="doProtection">Submit SL / TP update</FormButton>

        <FormButton v-else-if="type === 'confirm'" :variant="modal?.danger ? 'danger' : 'primary'" :loading="modalBusy" @click="modal?.onConfirm">{{ modal?.label }}</FormButton>
      </div>
    </template>
  </dialog>
</template>
