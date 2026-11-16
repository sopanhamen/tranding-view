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
            <div class="row between" style="margin-bottom: 15px"><h3 style="margin: 0">Chart screenshots <span class="tag">Optional</span></h3><span class="small muted">{{ state.uploads.length }} / 6 images</span></div>
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
              <h3>Add your own chart markup</h3>
              <p>The analysis always uses live MT5 candles and indicators. Screenshots add your drawn context.</p>
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
            <div class="field">
              <label for="analysis-notes">Notes for the analyst <span class="subtle">(optional)</span></label>
              <textarea id="analysis-notes" v-model="state.notes" rows="3" maxlength="500" placeholder="e.g. Watching the London open; prefer pullback entries." style="resize: none" aria-describedby="notes-help" />
              <small id="notes-help">{{ state.notes.length }} / 500</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Context included</h3>
            <div class="evidence-grid">
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Closed candle data<small>{{ state.mode === 'demo' ? 'Synthetic demo candles' : 'From the MT5 worker' }}</small></div></div>
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Numerical indicators<small>RSI14, ATR14, EMA20/50/200, ROC and swing structure per timeframe</small></div></div>
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Live quote and broker spec<small>Spread, lot rules and stop levels</small></div></div>
              <div class="evidence-item row"><Icon :name="state.uploads.length ? 'check' : 'image'" :cls="state.uploads.length ? 'positive' : 'muted'" /><div>Your screenshots<small>{{ state.uploads.length ? state.uploads.length + ' attached' : 'None attached' }}</small></div></div>
            </div>
            <div class="notice amber" style="margin-top: 14px"><Icon name="info" /> <strong>Economic calendar unavailable.</strong> The server reports this as a limitation and decides whether it blocks execution. No news events are inferred.</div>
          </div>

          <div class="form-section">
            <button class="button primary full" :disabled="state.analysing || (state.mode === 'api' && (!state.connection || state.historyOnly))" @click="runAnalysis()">
              <template v-if="state.analysing"><span class="spinner" /> Analysing market… this can take up to a minute</template>
              <template v-else><Icon name="spark" /> Run analysis</template>
            </button>
            <p class="hint" style="text-align: center; margin-top: 10px">{{ state.mode === 'demo' ? 'Demo analysis uses an illustrative result. No AI request or trade is sent.' : !state.connection || state.historyOnly ? 'Analysis needs a live MT5 snapshot. Start the worker to continue.' : `Runs on the server with the ${state.aiBackend} AI backend. Nothing is traded.` }}</p>
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
