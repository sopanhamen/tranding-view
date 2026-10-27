<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { money, timefmt, esc } from '~/utils/format'

const { state, executionBlocker, openModal, reviewTrade, toast, go } = useWorkspace()

const analysis = computed(() => state.analysis)
const a = computed(() => analysis.value?.data)
const blocked = computed(() => executionBlocker(analysis.value, state.mode))
const ready = computed(() => a.value?.action === 'BUY' || a.value?.action === 'SELL')

const ratio = computed(() => {
  const d = a.value
  if (d?.entry_zone && d.stop_loss && d.take_profits?.length) {
    const mid = (d.entry_zone[0] + d.entry_zone[1]) / 2
    return Math.abs((d.take_profits[0] - mid) / (mid - d.stop_loss))
  }
  return null
})

const biasLabel = computed(() => {
  const b = a.value?.bias ?? ''
  return (b === 'bullish' ? '↗ ' : b === 'bearish' ? '↘ ' : '') + (b ? b[0].toUpperCase() + b.slice(1) : '')
})

function openDetails() {
  openModal({ type: 'analysis-details' })
}
function onReview() {
  if (state.networkError) {
    toast('Restore the API connection before reviewing a new trade.')
    return
  }
  reviewTrade()
}
</script>

<template>
  <section v-if="!analysis" class="panel analysis-panel">
    <div class="analysis-head row"><Icon name="spark" /><h2>AI market analysis</h2></div>
    <EmptyState
      title="Your next move starts here"
      description="Send a chart screenshot to review a structured market setup."
    >
      <button class="button primary" @click="go('analysis')">Analyse market</button>
    </EmptyState>
  </section>

  <section v-else class="panel analysis-panel" aria-label="AI analysis result">
    <div class="analysis-head">
      <div class="row between">
        <div class="row"><div class="ai-icon"><Icon name="spark" /></div><h2>AI market analysis</h2></div>
        <button class="icon-button" aria-label="View analysis details" @click="openDetails">
          <Icon name="more" />
        </button>
      </div>
      <p>
        {{ state.mode === 'demo' ? 'Illustrative setup' : esc(analysis.provenance?.model || 'AI model') }}
        <span class="subtle">·</span> {{ a.timeframe }}
        {{ state.mode === 'demo' && a.timeframe !== 'H1' ? '+ H1' : '' }}
        <span class="subtle">·</span> {{ timefmt(analysis.created_at) }}
      </p>
    </div>

    <div class="analysis-status">
      <div class="row between">
        <span class="label">Suggested action</span>
        <Icon
          :name="blocked ? 'lock' : ready ? 'check' : 'clock'"
          :cls="blocked ? 'negative' : 'gold'"
        />
      </div>
      <h3>
        {{ blocked ? 'Execution blocked' : ready ? `${a.action === 'BUY' ? 'Buy' : 'Sell'} setup ready` : 'Wait for confirmation' }}
      </h3>
      <p>
        {{
          blocked
            ? blocked
            : ready
              ? 'Entry conditions are met in this example. Review the price and execution limits before submitting.'
              : `Wait for a closed ${a.timeframe} candle above the breakout level, then a confirmed retest.`
        }}
      </p>
    </div>

    <div class="analysis-meta">
      <div>
        <span>Market bias</span>
        <strong :class="a.bias === 'bullish' ? 'positive' : a.bias === 'bearish' ? 'negative' : 'muted'">{{ biasLabel }}</strong>
      </div>
      <div>
        <span>Trade horizon</span>
        <strong>{{ a.horizon_minutes >= 60 ? a.horizon_minutes / 60 + ' hours' : a.horizon_minutes + ' minutes' }}</strong>
      </div>
      <div>
        <span>Risk / reward</span>
        <strong class="mono">{{ ratio ? '1 : ' + ratio.toFixed(1) : '—' }}</strong>
      </div>
    </div>

    <div class="levels">
      <div class="level-row">
        <label><span class="level-dot entry" />Entry zone</label>
        <strong class="gold">{{ a.entry_zone ? a.entry_zone.map((v: number) => money(v, 0)).join(' – ') : 'Not set' }}</strong>
      </div>
      <div class="level-row">
        <label><span class="level-dot stop" />Stop loss</label>
        <strong>{{ a.stop_loss ? money(a.stop_loss) : 'Not set' }}</strong>
      </div>
      <div v-for="(v, i) in a.take_profits" :key="i" class="level-row">
        <label><span class="level-dot profit" />Take profit {{ i + 1 }}</label>
        <strong>{{ money(v) }}</strong>
      </div>
    </div>

    <div class="analysis-explain">
      <span class="eyebrow">The setup</span>
      <p>
        {{
          a.invalidation
            ? `Invalidated if a closed ${a.invalidation.timeframe} candle moves ${a.invalidation.type === 'CANDLE_CLOSE_BELOW' ? 'below' : 'above'} ${money(a.invalidation.price)}. Reassess in ${a.reassess_after_minutes} minutes.`
            : 'No executable entry conditions were identified.'
        }}
      </p>
    </div>

    <div class="analysis-footer">
      <button class="button primary full" @click="onReview">
        <Icon :name="ready ? 'arrow' : 'plans'" />{{ ready ? 'Review order' : 'Review trade plan' }}<Icon name="arrow" />
      </button>
      <div class="analysis-footnote">
        <span>{{ blocked ? 'Resolve blockers before execution' : 'One entry · Server risk checks' }}</span>
        <button class="details-toggle" @click="openDetails">Details <Icon name="chevron" /></button>
      </div>
    </div>

    <div class="mini-note">
      <Icon name="info" />
      {{ state.mode === 'demo' ? 'Simulated setup. No real order will be placed.' : 'AI analysis is uncertain. No guaranteed win rate.' }}
    </div>
  </section>
</template>
