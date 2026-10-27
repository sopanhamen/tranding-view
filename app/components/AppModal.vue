<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref, watch, nextTick } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { buildChartSvg } from '~/utils/chart'
import { money, timefmt, datefmt, esc } from '~/utils/format'

const {
  state,
  modal,
  modalError,
  modalBusy,
  closeModal,
  connectApi,
  submitTrade,
  positionMutation,
  applyScenario,
  resetDemo,
  executionBlocker,
  chartBars,
  demoCandles,
  toast,
} = useWorkspace()

const dlg = ref<HTMLDialogElement | null>(null)
const type = computed(() => modal.value?.type ?? '')

// --- connection form state ---
const connBase = ref('')
const connKey = ref('')
const connMode = ref('demo')
const connShowKey = ref(false)
const connRealConfirm = ref(false)

// --- review-trade form state ---
const tradeLots = ref('0.01')
const tradeTp = ref('0')
const tradeSpread = ref('50')
const tradeDeviation = ref('20')

// --- close-position form state ---
const closeMode = ref('full')
const partialVolume = ref('0.01')

// --- protection form state ---
const protectSl = ref('')
const protectTp = ref('')

const analysis = computed(() => state.analysis)
const a = computed(() => analysis.value?.data)
const position = computed(() => state.positions.find((p: any) => p.ticket === modal.value?.ticket))
const plan = computed(() => state.plans.find((p: any) => p.id === modal.value?.id))
const command = computed(() => state.commands.find((c: any) => c.id === modal.value?.id))

const chartDataBars = computed(() =>
  (state.liveCandles[state.tf] || demoCandles(state.tf)).slice(-10),
)
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
      return m.kind === 'plan' ? 'Review conditional trade plan' : 'Review market order'
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
      return 'Use your API’s owner key. Broker and provider secrets stay on the server.'
    case 'scenarios':
      return 'All scenarios use illustrative data. No real orders or AI requests are sent.'
    case 'review-trade':
      return `${state.symbol} · ${a.value?.proposed_side || 'No direction'} · ${state.mode === 'demo' ? 'Simulated execution' : state.account.mode.toUpperCase() + ' account'}`
    case 'analysis-details':
      return 'Inspect the saved setup, missing context and source data.'
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

const defaultBase = () => {
  if (typeof location === 'undefined') return ''
  return (
    state.base ||
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? location.origin : '')
  )
}

// Reset form fields each time a modal opens.
watch(
  () => modal.value,
  async (m) => {
    if (!m) {
      if (dlg.value?.open) dlg.value.close()
      document.body.style.overflow = ''
      return
    }
    if (m.type === 'settings') {
      connBase.value = defaultBase()
      connKey.value = ''
      connMode.value = 'demo'
      connShowKey.value = false
      connRealConfirm.value = false
    }
    if (m.type === 'review-trade') {
      tradeLots.value = '0.01'
      tradeTp.value = '0'
      tradeSpread.value = '50'
      tradeDeviation.value = '20'
    }
    if (m.type === 'close-position') {
      closeMode.value = 'full'
      partialVolume.value = '0.01'
    }
    if (m.type === 'protection' && position.value) {
      protectSl.value = String(position.value.sl)
      protectTp.value = String(position.value.tp)
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
  connectApi({ base: connBase.value.trim(), key: connKey.value, mode: connMode.value })
}
function doSubmitTrade() {
  submitTrade(modal.value!.kind, {
    lots: tradeLots.value,
    tp: tradeTp.value,
    spread: tradeSpread.value,
    deviation: tradeDeviation.value,
  })
}
function doClose() {
  positionMutation('CLOSE', modal.value!.ticket, { closeMode: closeMode.value, partialVolume: partialVolume.value })
}
function doProtection() {
  positionMutation('PROTECTION', modal.value!.ticket, { sl: protectSl.value, tp: protectTp.value })
}
async function copyAnalysis() {
  await navigator.clipboard.writeText(JSON.stringify(a.value, null, 2))
  toast('Analysis JSON copied.')
}
async function refreshAnalysis() {
  modalBusy.value = true
  try {
    state.analysis = await state.api!.analysis(state.analysis.id)
    modalBusy.value = false
  } catch (err: any) {
    modalBusy.value = false
    toast(err.message)
  }
}
</script>

<template>
  <dialog ref="dlg" aria-labelledby="modal-title" :style="type === 'expand-chart' ? 'max-width:1050px' : ''" @close="onDialogClose" @click="onDialogClick">
    <template v-if="modal">
      <div class="modal-head">
        <div><h2 id="modal-title">{{ title }}</h2><p>{{ description }}</p></div>
        <button class="icon-button" aria-label="Close dialog" @click="closeModal"><Icon name="close" /></button>
      </div>

      <div class="modal-content">
        <!-- Connection -->
        <form v-if="type === 'settings'" novalidate @submit.prevent="doConnect">
          <div class="stack">
            <div class="field">
              <label for="api-base">FastAPI base URL</label>
              <input id="api-base" v-model="connBase" type="url" placeholder="https://your-api.example.com" autocomplete="url" aria-describedby="api-base-help" >
              <small id="api-base-help">Origin only, without /api/v1. CORS must allow this site.</small>
            </div>
            <div class="field">
              <label for="api-key">Owner API key</label>
              <div class="field-inline">
                <input id="api-key" v-model="connKey" :type="connShowKey ? 'text' : 'password'" placeholder="Your X-API-Key" autocomplete="off" spellcheck="false" aria-describedby="key-help" >
                <button type="button" class="icon-button" :aria-label="connShowKey ? 'Hide API key' : 'Show API key'" @click="connShowKey = !connShowKey"><Icon name="eye" /></button>
              </div>
              <small id="key-help">Kept in memory. Never saved in browser storage.</small>
            </div>
            <div class="field">
              <label for="connection-mode">Expected MT5 account mode</label>
              <select id="connection-mode" v-model="connMode">
                <option value="demo">Demo account</option>
                <option value="real">Real account</option>
              </select>
              <small>The requested mode must match the configured terminal.</small>
            </div>
            <div class="notice amber"><Icon name="shield" /> Connecting does not place a trade. Every trade still requires an eligible analysis and an explicit review.</div>
            <label v-if="connMode === 'real'" class="check-line" style="margin-top: 12px">
              <input v-model="connRealConfirm" type="checkbox" > I understand this connects to a real-money account.
            </label>
            <div v-if="modalError" class="field-error" role="alert">{{ modalError }}</div>
          </div>
        </form>

        <!-- Scenarios -->
        <div v-else-if="type === 'scenarios'" class="scenario-options">
          <button class="scenario-option" @click="applyScenario('waiting')"><Icon name="clock" /><span><strong>Waiting for confirmation</strong><small>Review a setup and create a conditional trade plan.</small></span></button>
          <button class="scenario-option" @click="applyScenario('ready')"><Icon name="trend" /><span><strong>Ready to enter</strong><small>Review an immediate BUY order and track its simulated fill.</small></span></button>
          <button class="scenario-option" @click="applyScenario('blocked')"><Icon name="lock" /><span><strong>Missing market context</strong><small>See how execution is blocked when the calendar is unavailable.</small></span></button>
          <button class="scenario-option" @click="applyScenario('unknown')"><Icon name="info" /><span><strong>Uncertain execution</strong><small>Inspect an UNKNOWN command without retrying an order.</small></span></button>
        </div>

        <!-- Review trade -->
        <template v-else-if="type === 'review-trade'">
          <div class="modal-summary">
            <div><span>Entry zone</span><strong>{{ a.entry_zone?.map((v: number) => money(v)).join(' – ') || 'Not set' }}</strong></div>
            <div><span>Stop loss</span><strong>{{ a.stop_loss ? money(a.stop_loss) : 'Not set' }}</strong></div>
            <div><span>Trigger</span><strong style="font-family: var(--font-sans)">{{ modal.kind === 'plan' ? 'Closed-candle confirmation' : 'Immediate market request' }}</strong></div>
            <div><span>Analysis validity</span><strong>{{ datefmt(analysis.reassess_at) }} UTC+7</strong></div>
          </div>
          <div v-if="reviewBlocker" class="notice red" style="margin-bottom: 18px"><Icon name="lock" /> {{ reviewBlocker }}</div>
          <form novalidate @submit.prevent="doSubmitTrade">
            <div class="form-grid">
              <div class="field">
                <label for="trade-lots">Lot size</label>
                <input id="trade-lots" v-model="tradeLots" type="number" min="0.01" step="0.01" inputmode="decimal" aria-describedby="trade-lots-help" >
                <small id="trade-lots-help">Broker minimum and step are validated by the server.</small>
              </div>
              <div class="field">
                <label for="trade-tp">Take-profit target</label>
                <select id="trade-tp" v-model="tradeTp">
                  <option v-for="(p, i) in a.take_profits" :key="i" :value="String(i)">TP {{ i + 1 }} · {{ money(p) }}</option>
                </select>
                <small>One TP is attached to the position.</small>
              </div>
              <div class="field"><label for="trade-spread">Max spread (points)</label><input id="trade-spread" v-model="tradeSpread" type="number" min="1" inputmode="numeric" ></div>
              <div class="field"><label for="trade-deviation">Max deviation (points)</label><input id="trade-deviation" v-model="tradeDeviation" type="number" min="0" max="1000" inputmode="numeric" ></div>
            </div>
            <div class="notice" style="margin-top: 18px"><Icon name="info" /> {{ modal.kind === 'plan' ? 'The plan monitors conditions. It does not open a position immediately.' : 'A queued request is not a confirmed fill. Track the broker outcome in Activity.' }}</div>
            <div v-if="modalError" class="field-error" role="alert" style="margin-top: 10px">{{ modalError }}</div>
          </form>
        </template>

        <!-- Analysis details -->
        <template v-else-if="type === 'analysis-details'">
          <div class="notice" style="margin-bottom: 16px">{{ a.rationale || 'No rationale supplied.' }}</div>
          <div class="form-grid" style="margin-bottom: 18px">
            <div><span class="field-label">Reassess at</span><p class="small mono" style="margin-top: 5px">{{ datefmt(analysis.reassess_at) }} UTC+7</p></div>
            <div><span class="field-label">Missing context</span><p class="small" style="margin-top: 5px">{{ a.missing_data?.join(', ') || 'None reported' }}</p></div>
          </div>
          <pre class="json-view">{{ JSON.stringify(a, null, 2) }}</pre>
        </template>

        <!-- Close position -->
        <template v-else-if="type === 'close-position' && position">
          <div class="modal-summary">
            <div><span>Open volume</span><strong>{{ money(position.volume) }} lots</strong></div>
            <div><span>Account</span><strong>{{ state.account.login }} · {{ state.account.mode }}</strong></div>
          </div>
          <form novalidate>
            <div class="field">
              <label for="close-volume">Close volume</label>
              <select id="close-volume" v-model="closeMode">
                <option value="full">Full position ({{ money(position.volume) }} lots)</option>
                <option value="partial">Partial close</option>
              </select>
            </div>
            <div class="field" :class="{ hidden: closeMode !== 'partial' }" style="margin-top: 15px">
              <label for="partial-volume">Volume to close (lots)</label>
              <input id="partial-volume" v-model="partialVolume" type="number" min="0.01" step="0.01" inputmode="decimal" >
              <small>The remaining volume must also satisfy broker lot rules.</small>
            </div>
          </form>
          <div class="notice" style="margin-top: 18px"><Icon name="info" /> This queues a close request. The position stays open until the broker confirms the close.</div>
          <div v-if="modalError" class="field-error" role="alert">{{ modalError }}</div>
        </template>

        <!-- Protection -->
        <template v-else-if="type === 'protection' && position">
          <form novalidate>
            <div class="form-grid">
              <div class="field"><label for="protect-sl">Stop loss</label><input id="protect-sl" v-model="protectSl" type="number" step="0.01" inputmode="decimal" ></div>
              <div class="field"><label for="protect-tp">Take profit</label><input id="protect-tp" v-model="protectTp" type="number" step="0.01" inputmode="decimal" ></div>
            </div>
          </form>
          <div class="notice" style="margin-top: 18px"><Icon name="shield" /> The server validates price distance, precision and the updated stop-loss risk before submitting.</div>
          <div v-if="modalError" class="field-error" role="alert">{{ modalError }}</div>
        </template>

        <!-- Plan details -->
        <template v-else-if="type === 'plan-details' && plan">
          <div class="row" style="margin-bottom: 16px"><Badge :value="plan.state" /><span class="mono small muted">{{ plan.id }}</span></div>
          <pre class="json-view">{{ JSON.stringify({ id: plan.id, state: plan.state, execution: plan.data, setup: plan.analysis?.data }, null, 2) }}</pre>
        </template>

        <!-- Command details -->
        <template v-else-if="type === 'command-details' && command">
          <div class="row" style="margin-bottom: 16px"><Badge :value="command.state" /><span class="small muted">{{ command.kind }}</span></div>
          <div v-if="command.state === 'UNKNOWN'" class="notice red" style="margin-bottom: 16px">Do not retry this command. An operator must reconcile the outcome with broker history.</div>
          <pre class="json-view">{{ JSON.stringify(command, null, 2) }}</pre>
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
          <div v-html="modal.bodyHtml" />
          <div v-if="modalError" class="field-error" role="alert">{{ modalError }}</div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="button ghost" autofocus @click="closeModal">Cancel</button>

        <button v-if="type === 'settings'" class="button primary" :disabled="modalBusy" :aria-busy="modalBusy" @click="doConnect">
          <template v-if="modalBusy"><span class="spinner" /> Working…</template>
          <template v-else><Icon name="plug" />Connect backend</template>
        </button>

        <button v-else-if="type === 'scenarios'" class="button ghost" @click="resetDemo">Reset all demo data</button>

        <button v-else-if="type === 'review-trade'" class="button primary" :disabled="!!reviewBlocker || modalBusy" :aria-busy="modalBusy" @click="doSubmitTrade">
          <template v-if="modalBusy"><span class="spinner" /> Working…</template>
          <template v-else><Icon :name="modal.kind === 'plan' ? 'plans' : 'arrow'" />{{ modal.kind === 'plan' ? 'Start monitoring' : state.mode === 'demo' ? 'Place demo order' : 'Submit ' + a.proposed_side + ' order' }}</template>
        </button>

        <template v-else-if="type === 'analysis-details'">
          <button class="button ghost" @click="copyAnalysis"><Icon name="copy" />Copy JSON</button>
          <button v-if="state.mode === 'api'" class="button" :disabled="modalBusy" :aria-busy="modalBusy" @click="refreshAnalysis">
            <template v-if="modalBusy"><span class="spinner" /> Working…</template>
            <template v-else>Refresh saved analysis</template>
          </button>
        </template>

        <button v-else-if="type === 'close-position'" class="button danger" :disabled="modalBusy" :aria-busy="modalBusy" @click="doClose">
          <template v-if="modalBusy"><span class="spinner" /> Working…</template>
          <template v-else>{{ state.mode === 'demo' ? 'Close demo position' : 'Submit close request' }}</template>
        </button>

        <button v-else-if="type === 'protection'" class="button primary" :disabled="modalBusy" :aria-busy="modalBusy" @click="doProtection">
          <template v-if="modalBusy"><span class="spinner" /> Working…</template>
          <template v-else>Submit SL / TP update</template>
        </button>

        <button v-else-if="type === 'confirm'" class="button" :class="modal.danger ? 'danger' : 'primary'" :disabled="modalBusy" :aria-busy="modalBusy" @click="modal.onConfirm">
          <template v-if="modalBusy"><span class="spinner" /> Working…</template>
          <template v-else>{{ modal.label }}</template>
        </button>
      </div>
    </template>
  </dialog>
</template>
