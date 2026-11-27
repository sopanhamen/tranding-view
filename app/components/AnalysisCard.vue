<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { blockingReasons, reasonText, tradeKind } from '~/utils/api'
import { money, timefmt, esc, relative, humanize } from '~/utils/format'

const { state, openModal, reviewTrade, toast, go, sessionBlocker } = useWorkspace()

const analysis = computed(() => state.analysis)
const a = computed(() => analysis.value?.data)
const kind = computed(() => tradeKind(analysis.value))
const reasons = computed(() => blockingReasons(analysis.value, state.now))
const blocked = computed(() => reasons.value.length > 0)

const actionableUntil = computed(() => {
  const an = analysis.value
  if (!an) return null
  return Math.min(Date.parse(an.expires_at), Date.parse(an.reassess_at))
})

const targets = computed(() => {
  const rr = analysis.value?.assessment?.reward_risk?.take_profits ?? []
  return (a.value?.take_profits ?? []).map((price: number, i: number) => ({
    price,
    rr: rr[i]?.gross_reward_risk as number | null | undefined,
  }))
})

const headline = computed(() => {
  if (blocked.value) return a.value?.proposed_side ? 'Execution blocked' : 'No trade proposed'
  if (kind.value === 'order') return `${a.value.decision === 'BUY' ? 'Buy' : 'Sell'} setup ready`
  if (kind.value === 'plan') return 'Wait for confirmation'
  return 'No trade proposed'
})

const summary = computed(() => {
  if (blocked.value) return reasons.value.map(reasonText).join(' ')
  const trigger = analysis.value?.assessment?.entry?.required_trigger
  if (kind.value === 'order')
    return a.value.entry_method === 'PENDING'
      ? `Pending ${humanize(a.value.proposed_order_type)} inside the entry zone. Preview the order before submitting.`
      : 'Price is inside the entry zone. Preview size and risk before submitting.'
  if (kind.value === 'plan') return trigger || a.value.entry_condition
  return a.value?.entry_condition || 'The model found no setup worth trading.'
})

const outlookTone = computed(() =>
  a.value?.outlook === 'BULLISH' ? 'positive' : a.value?.outlook === 'BEARISH' ? 'negative' : 'muted',
)

function onReview() {
  const session = sessionBlocker()
  if (session) {
    toast(session)
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
      description="Run an analysis on the live MT5 snapshot. Screenshots are optional."
    >
      <FormButton variant="primary" @click="go('analysis')">Analyse market</FormButton>
    </EmptyState>
  </section>

  <section v-else class="panel analysis-panel" aria-label="AI analysis result">
    <div class="analysis-head">
      <div class="row between">
        <div class="row"><div class="ai-icon"><Icon name="spark" /></div><h2>AI market analysis</h2></div>
        <FormIconButton icon="more" label="View analysis details" @click="openModal({ type: 'analysis-details' })" />
      </div>
      <p>
        {{ esc(analysis.provenance?.model || 'AI model') }}
        <span class="subtle">·</span> {{ a.timeframe }}
        <span class="subtle">·</span> {{ timefmt(analysis.created_at) }}
      </p>
    </div>

    <div class="analysis-status">
      <div class="row between">
        <span class="label">Decision · <Badge :value="a.decision" /></span>
        <Icon :name="blocked ? 'lock' : kind === 'order' ? 'check' : 'clock'" :cls="blocked ? 'negative' : 'gold'" />
      </div>
      <h3>{{ headline }}</h3>
      <p>{{ summary }}</p>
      <p v-if="actionableUntil" class="hint" :class="{ negative: actionableUntil <= state.now }" style="margin-top: 8px">
        <Icon name="clock" />
        {{
          actionableUntil > state.now
            ? `Actionable until ${timefmt(actionableUntil)} (${relative(actionableUntil, state.now)})`
            : `Expired ${relative(actionableUntil, state.now)} — run a fresh analysis`
        }}
      </p>
    </div>

    <div class="analysis-meta">
      <div>
        <span>Outlook</span>
        <strong :class="outlookTone">{{ humanize(a.outlook) }}</strong>
      </div>
      <div>
        <span>AI confidence</span>
        <strong :title="'Qualitative and uncalibrated. Never a win probability.'">{{ humanize(a.confidence) }}<span class="subtle small"> *</span></strong>
      </div>
      <div>
        <span>Reward / risk</span>
        <strong class="mono">{{ targets[0]?.rr ? '1 : ' + targets[0].rr.toFixed(2) : '—' }}</strong>
      </div>
    </div>

    <div class="levels">
      <div class="level-row">
        <label><span class="level-dot entry" />Entry zone</label>
        <strong class="gold">{{ a.entry_zone ? a.entry_zone.map((v: number) => money(v)).join(' – ') : 'Not set' }}</strong>
      </div>
      <div class="level-row">
        <label><span class="level-dot stop" />Stop loss</label>
        <strong>{{ a.stop_loss ? money(a.stop_loss) : 'Not set' }}</strong>
      </div>
      <div v-for="(t, i) in targets" :key="i" class="level-row">
        <label><span class="level-dot profit" />Take profit {{ Number(i) + 1 }}</label>
        <strong>{{ money(t.price) }}<span v-if="t.rr" class="subtle small"> · {{ t.rr.toFixed(2) }}R</span></strong>
      </div>
    </div>

    <div v-if="a.reasons?.length || a.risk_flags?.length" class="analysis-explain">
      <span class="eyebrow">Why</span>
      <ul class="small" style="margin: 6px 0 0; padding-left: 16px">
        <li v-for="r in a.reasons.slice(0, 3)" :key="r">{{ r }}</li>
      </ul>
      <p v-for="f in a.risk_flags" :key="f" class="small" style="margin-top: 6px">
        <Icon name="info" cls="gold" /> {{ f }}
      </p>
    </div>

    <div class="analysis-explain">
      <span class="eyebrow">Invalidation</span>
      <p>
        {{
          a.invalidation
            ? `A closed ${a.invalidation.timeframe} candle ${a.invalidation.type === 'CANDLE_CLOSE_BELOW' ? 'below' : 'above'} ${money(a.invalidation.price)} cancels this view.`
            : 'No invalidation level was set.'
        }}
      </p>
    </div>

    <div class="analysis-footer">
      <FormButton variant="primary" full :icon="kind === 'order' ? 'arrow' : 'plans'" :disabled="!kind" @click="onReview">
        {{ kind === 'order' ? 'Review order' : kind === 'plan' ? 'Review trade plan' : 'Nothing to execute' }}
      </FormButton>
      <div class="analysis-footnote">
        <span>{{ blocked ? 'Resolve blockers before execution' : 'One entry per analysis · Server risk checks' }}</span>
        <button class="details-toggle" @click="openModal({ type: 'analysis-details' })">Details <Icon name="chevron" /></button>
      </div>
    </div>

    <div class="mini-note">
      <Icon name="info" />
      * AI confidence is uncalibrated. No win probability is implied.
    </div>
  </section>
</template>
