<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { money, short, esc } from '~/utils/format'

const props = defineProps<{ plan: any }>()
const { state, openModal, planControl, cancelPlan, simulateTrigger } = useWorkspace()

const a = computed(() => props.plan.analysis?.data || state.analysis?.data)
const p = computed(() => props.plan)

function breakoutClass() {
  const s = p.value.state
  if (s === 'MONITORING') return 'current'
  if (['QUEUED', 'SUBMITTING', 'FILLED', 'PARTIALLY_FILLED'].includes(s)) return 'done'
  return ''
}
const filledClass = () => (['FILLED', 'PARTIALLY_FILLED'].includes(p.value.state) ? 'done' : '')

function askControl() {
  const control = p.value.state === 'PAUSED' ? 'resume' : 'pause'
  openModal({
    type: 'confirm',
    title: control === 'pause' ? 'Pause monitoring?' : 'Resume monitoring?',
    description: 'The original analysis validity still applies.',
    bodyHtml:
      '<p class="small muted">Pausing stops entry monitoring. Resuming watches new candles; it never replays an old signal.</p>',
    label: control === 'pause' ? 'Pause plan' : 'Resume plan',
    danger: false,
    onConfirm: () => planControl(p.value.id, control),
  })
}

function askCancel() {
  openModal({
    type: 'confirm',
    title: 'Cancel this trade plan?',
    description: 'Stop monitoring before an order enters the queue.',
    bodyHtml: `<div class="notice">Plan <span class="mono">${esc(short(p.value.id))}</span> will stop watching its entry conditions. This does not close an existing position.</div>`,
    label: 'Cancel trade plan',
    danger: true,
    onConfirm: () => cancelPlan(p.value.id),
  })
}

function openDetails() {
  openModal({ type: 'plan-details', id: p.value.id })
}
</script>

<template>
  <article class="plan-card">
    <div class="row between">
      <div class="instrument">
        <div class="gold-symbol">Au</div>
        <div>
          <h2>{{ a?.symbol || state.symbol }} <span class="side-indicator">{{ a?.proposed_side || 'BUY' }}</span></h2>
          <p>{{ a?.timeframe || state.tf }} · Conditional entry</p>
        </div>
      </div>
      <Badge :value="p.state" />
    </div>

    <p class="description">{{ a?.entry_condition || 'Conditions are stored in the saved analysis.' }}</p>

    <div class="plan-numbers">
      <div><span>Entry zone</span><strong class="gold">{{ a?.entry_zone?.map((v: number) => money(v, 0)).join(' – ') || '—' }}</strong></div>
      <div><span>Stop loss</span><strong>{{ a?.stop_loss ? money(a.stop_loss) : '—' }}</strong></div>
      <div><span>Take profit</span><strong>{{ a?.take_profits?.length ? money(a.take_profits[p.data.take_profit_index || 0]) : '—' }}</strong></div>
      <div><span>Position size</span><strong>{{ money(p.data.sizing.volume_lots) }} lots</strong></div>
    </div>

    <div class="plan-steps">
      <div class="plan-step done">Setup reviewed</div>
      <div class="plan-step" :class="breakoutClass()">Breakout &amp; retest</div>
      <div class="plan-step" :class="filledClass()">Broker execution</div>
    </div>

    <div v-if="p.reason" class="notice red" style="margin-bottom: 14px">{{ p.reason }}</div>

    <div class="card-footer">
      <span class="mono">{{ short(p.id) }}</span>
      <div class="row">
        <button
          v-if="state.mode === 'demo' && p.state === 'MONITORING'"
          class="button ghost"
          @click="simulateTrigger(p.id)"
        >
          <Icon name="play" />Simulate trigger
        </button>
        <button class="button ghost" @click="openDetails">Details</button>
        <template v-if="['MONITORING', 'PAUSED'].includes(p.state)">
          <button class="button ghost" @click="askControl">{{ p.state === 'PAUSED' ? 'Resume' : 'Pause' }}</button>
          <button class="button danger" @click="askCancel">Cancel plan</button>
        </template>
      </div>
    </div>
  </article>
</template>
