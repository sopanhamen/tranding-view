<script setup lang="ts">
import { computed, ref } from "vue";
import { useWorkspace } from "~/composables/useWorkspace";
import { TIMEFRAMES } from "~/utils/api";
import { buildChartSvg } from "~/utils/chart";
import { money, timefmt, esc } from "~/utils/format";

const {
  state,
  chartBars,
  currentPrice,
  quote,
  openModal,
  captureChart,
  toggleLevels,
  toast,
  setTimeframe,
} = useWorkspace();

const q = computed(() => quote());

const live = computed(() => !!state.api);
const bars = computed(() => chartBars());

const chartOpts = computed(() => ({
  symbol: state.symbol,
  tf: state.tf,
  analysis: state.analysis,
  showLevels: state.showLevels,
}));

const svg = computed(() => buildChartSvg(bars.value, chartOpts.value));

const crosshair = ref<HTMLElement | null>(null);
const hover = ref<HTMLElement | null>(null);

function onPointerMove(e: PointerEvent) {
  const area = e.currentTarget as HTMLElement;
  const rect = area.getBoundingClientRect();
  const ratio = Math.min(
    1,
    Math.max(0, (e.clientX - rect.left) / (rect.width * 0.91)),
  );
  const b = bars.value;
  if (!b.length) return;
  const bar = b[Math.min(b.length - 1, Math.floor(ratio * b.length))];
  const x = e.clientX - rect.left;
  if (crosshair.value) crosshair.value.style.left = x + "px";
  if (hover.value) {
    hover.value.style.left =
      Math.max(4, Math.min(x + 10, rect.width - 190)) + "px";
    hover.value.textContent = `${timefmt(bar.time * 1000)} · C ${money(bar.close)}`;
  }
}

function onCapture() {
  captureChart(buildChartSvg(chartBars(), chartOpts.value));
}
function onCrosshair() {
  toast(
    "Move across the chart to inspect a candle. Candle data is available for keyboard access.",
  );
}
</script>

<template>
  <div class="market-head">
    <div class="instrument">
      <div class="gold-symbol">Au</div>
      <div>
        <div class="row">
          <h2>{{ esc(state.symbol.replace("XAUUSD", "XAU / USD")) }}</h2>
          <span class="badge" :class="live ? 'green' : 'amber'">{{
            live
              ? state.brokerBackend === "mock"
                ? "API MOCK"
                : "SNAPSHOT"
              : "NOT CONNECTED"
          }}</span>
        </div>
        <p>
          Gold / US Dollar ·
          {{
            live
              ? state.brokerBackend === "mock"
                ? "Server mock data"
                : "MT5 broker"
              : "No broker connection"
          }}
        </p>
      </div>
    </div>
    <div class="market-price">
      <strong>{{ money(currentPrice()) }}</strong>
      <p :class="q && q.age_seconds <= 60 ? 'muted' : 'negative'">
        {{
          q
            ? `Bid · quote ${Math.round(q.age_seconds)}s old`
            : live
              ? "Last closed candle"
              : "No quote"
        }}
        <span class="subtle">{{
          q && q.age_seconds > 60 ? "market may be closed" : ""
        }}</span>
      </p>
    </div>
  </div>

  <div class="market-stats">
    <div>
      <span>Bid / Ask</span
      ><strong>{{ money(q?.bid) + " / " + money(q?.ask) }}</strong>
    </div>
    <div>
      <span>Spread</span
      ><strong>{{
        Number.isFinite(q?.spread_points)
          ? Math.round(q.spread_points) + " pts"
          : "—"
      }}</strong>
    </div>
    <div>
      <span>Closed candles</span
      ><strong>{{ state.liveCandles[state.tf]?.length ?? 0 }}</strong>
    </div>
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
      <FormButton icon="code" @click="openModal({ type: 'chart-data' })"
        >Candle data</FormButton
      >
      <FormIconButton
        icon="camera"
        label="Use chart as analysis screenshot"
        title="Use chart screenshot"
        @click="onCapture"
      />
      <FormIconButton
        icon="expand"
        label="Expand chart"
        title="Expand chart"
        @click="openModal({ type: 'expand-chart' })"
      />
    </div>
  </div>

  <div class="chart-wrap">
    <div class="drawing-tools" aria-label="Chart tools">
      <FormIconButton
        class="gold"
        icon="crosshair"
        label="Inspect candle"
        title="Inspect a candle"
        @click="onCrosshair"
      />
      <FormIconButton
        icon="line"
        label="Toggle analysis levels"
        title="Toggle analysis levels"
        @click="toggleLevels"
      />
      <FormIconButton
        icon="bars"
        label="View candle data"
        title="Candle data"
        @click="openModal({ type: 'chart-data' })"
      />
      <FormIconButton
        icon="camera"
        label="Capture chart"
        title="Capture chart"
        @click="onCapture"
      />
    </div>
    <div class="chart-area" @pointermove="onPointerMove">
      <div class="chart-legend">
        <strong>{{ esc(state.symbol) }} · {{ state.tf }}</strong>
        <span class="positive">Closed candles</span>
      </div>
      <div class="chart-watermark">XAUUSD</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="chart-svg-host" v-html="svg" />
      <div ref="crosshair" class="chart-crosshair" />
      <div ref="hover" class="chart-hover" />
    </div>
  </div>

  <div class="chart-caption">
    <span><Icon name="clock" />Closed candles · Broker snapshot</span>
    <span>Refresh for latest data</span>
  </div>

  <div class="chart-bottom">
    <div>
      <span class="row"
        ><span class="dot" :class="live ? 'positive' : 'negative'" />{{
          live
            ? state.brokerBackend === "mock"
              ? "Server mock snapshot"
              : "MT5 snapshot"
            : "Not connected"
        }}</span
      >
      <span>{{
        live ? "Updated " + timefmt(state.updatedAt) : "Connect an MT5 account"
      }}</span>
    </div>
    <span class="mono">{{ state.tf }} / UTC+7</span>
  </div>
</template>
