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

const horizonOptions = [
  { value: 30, label: 'Next 30 minutes' },
  { value: 60, label: 'Next hour' },
  { value: 240, label: 'Next 4 hours' },
  { value: 480, label: 'Next 8 hours' },
  { value: 1440, label: 'Next 24 hours' },
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
      <FormButton variant="ghost" icon="camera" @click="onCapture">Use current chart</FormButton>
    </PageHeading>

    <div class="analysis-layout">
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Analysis inputs</h2><span class="badge amber">{{ state.tf }} · {{ state.symbol }}</span></div>

          <div class="form-section">
            <div class="form-grid">
              <FormSelect
                id="analysis-timeframe"
                :model-value="state.tf"
                :options="TIMEFRAMES"
                label="Primary timeframe"
                help="Duration of each candle"
                @update:model-value="setTimeframe"
              />
              <FormSelect
                id="analysis-horizon"
                :model-value="state.horizon"
                :options="horizonOptions"
                label="Analysis horizon"
                help="Scenario window, not a target deadline"
                @update:model-value="setHorizon"
              />
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
              <FormButton icon="image" @click="fileInput?.click()">Choose screenshots</FormButton>
              <span class="hint">PNG, JPG or WebP · Up to 8 MB each · Max 6 files</span>
            </div>
            <FormError :message="uploadError" role="status" />
            <div class="upload-list">
              <template v-for="(u, i) in state.uploads" :key="i">
                <div class="upload-item">
                  <img class="upload-thumb" :src="u.preview" :alt="`Selected chart screenshot ${i + 1}`" >
                  <div class="grow"><p class="filename">{{ u.file.name }}</p><span class="hint">{{ Math.round(u.file.size / 1024) }} KB</span></div>
                  <FormSelect :id="`upload-tf-${i}`" v-model="u.tf" :options="TIMEFRAMES" label="Timeframe" />
                  <FormIconButton icon="close" :label="`Remove ${u.file.name}`" @click="removeUpload(i)" />
                </div>
                <FormInput
                  :id="`capture-${i}`"
                  :model-value="localDate(u.captured)"
                  label="Actual capture time (device time)"
                  type="datetime-local"
                  style="margin-left: 63px"
                  @update:model-value="setCaptureTime(i, $event)"
                />
              </template>
            </div>
          </div>

          <div class="form-section">
            <FormTextarea
              id="analysis-notes"
              v-model="state.notes"
              label="Notes for the analyst"
              optional
              :help="`${state.notes.length} / 500`"
              rows="3"
              maxlength="500"
              placeholder="e.g. Watching the London open; prefer pullback entries."
            />
          </div>

          <div class="form-section">
            <h3>Context included</h3>
            <div class="evidence-grid">
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Closed candle data<small>From the MT5 worker</small></div></div>
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Numerical indicators<small>RSI14, ATR14, EMA20/50/200, ROC and swing structure per timeframe</small></div></div>
              <div class="evidence-item row"><Icon name="check" cls="positive" /><div>Live quote and broker spec<small>Spread, lot rules and stop levels</small></div></div>
              <div class="evidence-item row"><Icon :name="state.uploads.length ? 'check' : 'image'" :cls="state.uploads.length ? 'positive' : 'muted'" /><div>Your screenshots<small>{{ state.uploads.length ? state.uploads.length + ' attached' : 'None attached' }}</small></div></div>
            </div>
            <div class="notice amber" style="margin-top: 14px"><Icon name="info" /> <strong>Economic calendar unavailable.</strong> The server reports this as a limitation and decides whether it blocks execution. No news events are inferred.</div>
          </div>

          <div class="form-section">
            <FormButton
              variant="primary"
              full
              icon="spark"
              :disabled="!state.api || !state.connection || state.historyOnly"
              :loading="state.analysing"
              loading-text="Analysing market… this can take up to a minute"
              @click="runAnalysis()"
            >
              Run analysis
            </FormButton>
            <p class="hint" style="text-align: center; margin-top: 10px">{{ !state.api ? 'Connect your MT5 account to run an analysis.' : !state.connection || state.historyOnly ? 'Analysis needs a live MT5 snapshot. Start the worker to continue.' : `Runs on the server with the ${state.aiBackend} AI backend. Nothing is traded.` }}</p>
            <FormError :message="analysisError" role="status" />
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
