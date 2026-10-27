<script setup lang="ts">
import { ref } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { TIMEFRAMES } from '~/utils/api'
import { buildChartSvg } from '~/utils/chart'
import { datefmt, localDate } from '~/utils/format'

const {
  state,
  uploadError,
  analysisError,
  setTimeframe,
  setHorizon,
  addFiles,
  removeUpload,
  runAnalysis,
  captureChart,
  chartBars,
} = useWorkspace()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const horizonOptions: [number, string][] = [
  [30, 'Next 30 minutes'],
  [60, 'Next hour'],
  [240, 'Next 4 hours'],
  [480, 'Next 8 hours'],
  [1440, 'Next 24 hours'],
]

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
}
function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer) addFiles(e.dataTransfer.files)
}
function onCapture() {
  captureChart(
    buildChartSvg(chartBars(), {
      symbol: state.symbol,
      tf: state.tf,
      mode: state.mode,
      analysis: state.analysis,
      showLevels: state.showLevels,
    }),
  )
}
function setCaptureTime(i: number, value: string) {
  if (value) state.uploads[i].captured = new Date(value).toISOString()
}
</script>

<template>
  <div>
    <PageHeading title="AI market analysis" desc="Bring your chart. Review the setup before you act.">
      <button class="button ghost" @click="onCapture"><Icon name="camera" />Use current chart</button>
    </PageHeading>

    <div class="analysis-layout">
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Analysis inputs</h2><span class="badge amber">{{ state.tf }} · {{ state.symbol }}</span></div>

          <div class="form-section">
            <div class="form-grid">
              <div class="field">
                <label for="analysis-timeframe">Primary timeframe</label>
                <select id="analysis-timeframe" :value="state.tf" @change="setTimeframe(($event.target as HTMLSelectElement).value)">
                  <option v-for="t in TIMEFRAMES" :key="t">{{ t }}</option>
                </select>
                <small>Duration of each candle</small>
              </div>
              <div class="field">
                <label for="analysis-horizon">Analysis horizon</label>
                <select id="analysis-horizon" :value="state.horizon" @change="setHorizon(Number(($event.target as HTMLSelectElement).value))">
                  <option v-for="[v, label] in horizonOptions" :key="v" :value="v">{{ label }}</option>
                </select>
                <small>Scenario window, not a target deadline</small>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="row between" style="margin-bottom: 15px"><h3 style="margin: 0">Chart screenshots</h3><span class="small muted">{{ state.uploads.length }} / 6 images</span></div>
            <div
              id="upload-zone"
              class="upload-zone"
              :class="{ dragging }"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="onDrop"
            >
              <input id="chart-files" ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" aria-label="Choose chart screenshots" @change="onFiles" >
              <Icon name="upload" />
              <h3>Give your analysis the full picture</h3>
              <p>Drag charts here, or choose screenshots from your device.</p>
              <button class="button" @click="fileInput?.click()"><Icon name="image" />Choose screenshots</button>
              <span class="hint">PNG, JPG or WebP · Up to 8 MB each · Max 6 files</span>
            </div>
            <div v-if="uploadError" class="field-error" role="status">{{ uploadError }}</div>
            <div class="upload-list">
              <template v-for="(u, i) in state.uploads" :key="i">
                <div class="upload-item">
                  <img class="upload-thumb" :src="u.preview" :alt="`Selected chart screenshot ${i + 1}`" >
                  <div class="grow"><p class="filename">{{ u.file.name }}</p><span class="hint">{{ Math.round(u.file.size / 1024) }} KB</span></div>
                  <div class="field">
                    <label :for="`upload-tf-${i}`">Timeframe</label>
                    <select :id="`upload-tf-${i}`" v-model="u.tf">
                      <option v-for="t in TIMEFRAMES" :key="t">{{ t }}</option>
                    </select>
                  </div>
                  <button class="icon-button" :aria-label="`Remove ${u.file.name}`" @click="removeUpload(i)"><Icon name="close" /></button>
                </div>
                <div class="field" style="margin-left: 63px">
                  <label :for="`capture-${i}`">Actual capture time (device time)</label>
                  <input :id="`capture-${i}`" type="datetime-local" :value="localDate(u.captured)" @change="setCaptureTime(i, ($event.target as HTMLInputElement).value)" >
                </div>
              </template>
            </div>
          </div>

          <div class="form-section">
            <h3>Context included</h3>
            <div class="evidence-grid">
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Closed candle data<small>{{ state.mode === 'demo' ? 'Synthetic demo candles' : 'From the MT5 worker' }}</small></div></div>
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Numerical indicators<small>RSI and ATR calculated by server</small></div></div>
            </div>
            <div class="notice amber" style="margin-top: 14px"><Icon name="info" /> <strong>Economic calendar unavailable.</strong> The server determines whether this missing context blocks execution. No news events are inferred.</div>
          </div>

          <div class="form-section">
            <button class="button primary full" :disabled="state.analysing" @click="runAnalysis()">
              <template v-if="state.analysing"><span class="spinner" /> Analysing chart…</template>
              <template v-else><Icon name="spark" /> Run analysis</template>
            </button>
            <p class="hint" style="text-align: center; margin-top: 10px">{{ state.mode === 'demo' ? 'Demo analysis uses an illustrative result. No AI request or trade is sent.' : 'Screenshots are sent through your FastAPI server to its configured AI model.' }}</p>
            <div v-if="analysisError" class="field-error" role="status">{{ analysisError }}</div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>What you’ll get back</h2><Icon name="plans" cls="muted" /></div>
          <div class="panel-body">
            <ul class="info-list">
              <li><Icon name="check" /><div><strong>A conditional market view</strong><small>Direction, entry zone and the confirmation required.</small></div></li>
              <li><Icon name="check" /><div><strong>A defined exit and invalidation</strong><small>Stop loss, take-profit alternatives and when to reassess.</small></div></li>
              <li><Icon name="check" /><div><strong>Clear limitations</strong><small>Missing data and execution blockers. No invented win rate.</small></div></li>
            </ul>
          </div>
        </section>
      </div>

      <aside><AnalysisCard /></aside>
    </div>

    <AnalysisHistory />
    <AppFooter />
  </div>
</template>
