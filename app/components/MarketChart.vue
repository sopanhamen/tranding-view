<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { TIMEFRAMES } from '~/utils/api'
import { buildChartSvg } from '~/utils/chart'
import { money, timefmt, esc } from '~/utils/format'

const { state, chartBars, currentPrice, openModal, captureChart, toggleLevels, toast, setTimeframe } =
  useWorkspace()

const live = computed(() => state.mode === 'api')
const bars = computed(() => chartBars())
const lastBar = computed(() => bars.value.at(-1))

const chartOpts = computed(() => ({
  symbol: state.symbol,
  tf: state.tf,
  mode: state.mode,
  analysis: state.analysis,
  showLevels: state.showLevels,
}))

const svg = computed(() => buildChartSvg(bars.value, chartOpts.value))

const crosshair = ref<HTMLElement | null>(null)
const hover = ref<HTMLElement | null>(null)

function onPointerMove(e: PointerEvent) {
  const area = e.currentTarget as HTMLElement
  const rect = area.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / (rect.width * 0.91)))
  const b = bars.value
  if (!b.length) return
  const bar = b[Math.min(b.length - 1, Math.floor(ratio * b.length))]
  const x = e.clientX - rect.left
  if (crosshair.value) crosshair.value.style.left = x + 'px'
  if (hover.value) {
    hover.value.style.left = Math.max(4, Math.min(x + 10, rect.width - 190)) + 'px'
    hover.value.textContent = `${timefmt(bar.time * 1000)} · C ${money(bar.close)}`
  }
}

function onCapture() {
  captureChart(buildChartSvg(chartBars(), chartOpts.value))
}
function onCrosshair() {
  toast('Move across the chart to inspect a candle. Candle data is available for keyboard access.')
}
</script>

<template>
  <div class="market-head">
    <div class="instrument">
      <div class="gold-symbol">Au</div>
      <div>
        <div class="row">
          <h2>{{ esc(state.symbol.replace('XAUUSD', 'XAU / USD')) }}</h2>
          <span class="badge" :class="live ? 'green' : 'amber'">{{
            live ? (state.brokerBackend === 'mock' ? 'API MOCK' : 'SNAPSHOT') : 'DEMO DATA'
          }}</span>
        </div>
        <p>Gold / US Dollar · {{ live ? (state.brokerBackend === 'mock' ? 'Server mock data' : 'MT5 broker') : 'Illustrative market' }}</p>
      </div>
    </div>
    <div class="market-price">
      <strong>{{ money(currentPrice()) }}</strong>
      <p :class="live ? 'muted' : 'positive'">
        {{ live ? 'Last closed candle' : '+25.24 (+0.63%)' }}
        <span class="subtle">{{ live ? '' : 'today · demo' }}</span>
      </p>
    </div>
  </div>

  <div class="market-stats">
    <div><span>Bid / Ask</span><strong>{{ live ? money(state.quote?.bid) + ' / ' + money(state.quote?.ask) : '4,032.18 / 4,032.38' }}</strong></div>
    <div><span>{{ live ? 'Data source' : 'Day range' }}</span><strong>{{ live ? 'MT5 closed candles' : '3,998.40 — 4,051.20' }}</strong></div>
    <div><span>{{ live ? 'Candles' : 'Spread' }}</span><strong>{{ live ? (state.liveCandles[state.tf]?.length ?? 0) : '20 pts' }}</strong></div>
    <div><span>Time zone</span><strong>UTC+7</strong></div>
  </div>

  <div class="chart-toolbar">
    <div class="timeframes" role="group" aria-label="Chart timeframe">
      <button
        v-for="t in TIMEFRAMES"
        :key="t"
        :class="{ selected: state.tf === t }"
        :aria-pressed="state.tf === t"
        @click="setTimeframe(t)"
      >
        {{ t }}
      </button>
    </div>
    <div class="toolbar-extra">
      <span class="chart-controls-label"><Icon name="bars" /></span>
      <button class="button" @click="openModal({ type: 'chart-data' })"><Icon name="code" />Candle data</button>
      <button class="icon-button" aria-label="Use chart as analysis screenshot" title="Use chart screenshot" @click="onCapture"><Icon name="camera" /></button>
      <button class="icon-button" aria-label="Expand chart" title="Expand chart" @click="openModal({ type: 'expand-chart' })"><Icon name="expand" /></button>
    </div>
  </div>

  <div class="chart-wrap">
    <div class="drawing-tools" aria-label="Chart tools">
      <button class="icon-button gold" aria-label="Inspect candle" title="Inspect a candle" @click="onCrosshair"><Icon name="crosshair" /></button>
      <button class="icon-button" aria-label="Toggle analysis levels" title="Toggle analysis levels" @click="toggleLevels"><Icon name="line" /></button>
      <button class="icon-button" aria-label="View candle data" title="Candle data" @click="openModal({ type: 'chart-data' })"><Icon name="bars" /></button>
      <button class="icon-button" aria-label="Capture chart" title="Capture chart" @click="onCapture"><Icon name="camera" /></button>
    </div>
    <div class="chart-area" @pointermove="onPointerMove">
      <div class="chart-legend">
        <strong>{{ esc(state.symbol) }} · {{ state.tf }}</strong>
        <span class="positive">{{
          live ? 'Closed candles' : `O ${money(lastBar?.open)} H ${money(lastBar?.high)} L ${money(lastBar?.low)} C ${money(lastBar?.close)}`
        }}</span>
      </div>
      <div class="chart-watermark">XAUUSD</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="chart-svg-host" v-html="svg" />
      <div ref="crosshair" class="chart-crosshair" />
      <div ref="hover" class="chart-hover" />
    </div>
  </div>

  <div class="chart-caption">
    <span><Icon name="clock" />Closed candles · {{ live ? 'Broker snapshot' : 'Illustrative chart' }}</span>
    <span>{{ live ? 'Refresh for latest data' : 'Gold spot · Prices in USD' }}</span>
  </div>

  <div class="chart-bottom">
    <div>
      <span class="row"><span class="dot positive" />{{ live ? (state.brokerBackend === 'mock' ? 'Server mock snapshot' : 'MT5 snapshot') : 'Simulation running' }}</span>
      <span>{{ live ? 'Updated ' + timefmt(state.updatedAt) : 'Not a live price feed' }}</span>
    </div>
    <span class="mono">{{ state.tf }} / UTC+7</span>
  </div>
</template>
