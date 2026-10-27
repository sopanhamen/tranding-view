<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'

const { state, reviewTrade, toast } = useWorkspace()

const NEEDS = ['UNKNOWN', 'BLOCKED', 'REASSESS_REQUIRED']
const monitoring = computed(() => state.plans.filter((p) => p.state === 'MONITORING').length)
const needsAttention = computed(() => state.plans.filter((p) => NEEDS.includes(p.state)).length)

function newPlan() {
  if (state.networkError) {
    toast('Restore the API connection before reviewing a new trade.')
    return
  }
  reviewTrade()
}
</script>

<template>
  <div>
    <PageHeading title="Trade plans" desc="Let conditions lead. Keep every entry intentional.">
      <button class="button primary" @click="newPlan"><Icon name="plans" />New trade plan</button>
    </PageHeading>

    <div class="summary-grid">
      <div class="summary-card"><span class="muted">Monitoring</span><strong>{{ monitoring }}</strong><small>Watching closed-candle conditions</small></div>
      <div class="summary-card"><span class="muted">Entries per plan</span><strong>01</strong><small>One analysis. One reservation.</small></div>
      <div class="summary-card"><span class="muted">Needs attention</span><strong :class="{ negative: needsAttention > 0 }">{{ needsAttention }}</strong><small>Review before another entry</small></div>
    </div>

    <div class="page-grid">
      <section class="plan-list">
        <template v-if="state.plans.length">
          <PlanCard v-for="p in state.plans" :key="p.id" :plan="p" />
          <HistoryMore kind="plans" />
        </template>
        <EmptyState v-else title="Your first trade plan" description="Analyse a chart, then review an eligible conditional setup.">
          <NuxtLink class="button primary" to="/analysis">Analyse market</NuxtLink>
        </EmptyState>
      </section>

      <aside class="panel">
        <div class="panel-head"><h2>How a plan works</h2><Icon name="info" cls="muted" /></div>
        <div class="panel-body">
          <ul class="info-list">
            <li><Icon name="check" /><div><strong>Wait for the breakout</strong><small>A closed candle must pass the specified level.</small></div></li>
            <li><Icon name="clock" /><div><strong>Confirm the retest</strong><small>A later candle touches the zone and confirms the direction.</small></div></li>
            <li><Icon name="shield" /><div><strong>Validate before execution</strong><small>The worker checks live price, spread, SL/TP and account limits.</small></div></li>
          </ul>
          <div class="notice" style="margin-top: 15px">A monitoring plan is not an open position. Cancel it before it enters the execution queue.</div>
        </div>
      </aside>
    </div>

    <AppFooter />
  </div>
</template>
