<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from 'vue'
import { useWorkspace, sizingLabel } from '~/composables/useWorkspace'
import { money, short, esc, humanize, datefmt } from '~/utils/format'

const props = defineProps<{ plan: any }>()
const { state, openModal, cancelPlan, simulateTrigger } = useWorkspace()

const p = computed(() => props.plan)
const a = computed(() => p.value.analysis?.data)
const cancellable = computed(() => ['MONITORING', 'QUEUED'].includes(p.value.state))

const FILLED = ['FILLED', 'PARTIALLY_FILLED']
const breakoutClass = computed(() => {
  if (p.value.breakout_time || ['QUEUED', ...FILLED].includes(p.value.state)) return 'done'
  return p.value.state === 'MONITORING' ? 'current' : ''
})
const retestClass = computed(() => {
  if (['QUEUED', ...FILLED].includes(p.value.state)) return 'done'
  return p.value.state === 'MONITORING' && p.value.breakout_time ? 'current' : ''
})
const filledClass = computed(() => (FILLED.includes(p.value.state) ? 'done' : p.value.state === 'QUEUED' ? 'current' : ''))

function askCancel() {
  openModal({
    type: 'confirm',
    title: 'Cancel this trade plan?',
    description:
      p.value.state === 'QUEUED'
        ? 'Only possible while its order is still waiting in the queue.'
        : 'Stop monitoring before an order enters the queue.',
    bodyHtml: `<div class="notice">Plan <span class="mono">${esc(short(p.value.id))}</span> will stop watching its entry conditions. This does not close an existing position, and the analysis stays reserved.</div>`,
    label: 'Cancel trade plan',
    danger: true,
    onConfirm: () => cancelPlan(p.value.id),
  })
}
</script>

<template>
  <article class="plan-card">
    <div class="row between">
      <div class="instrument">
        <div class="gold-symbol">Au</div>
        <div>
          <h2>{{ a?.symbol || state.symbol }} <span v-if="a?.proposed_side" class="side-indicator" :class="{ sell: a.proposed_side === 'SELL' }">{{ a.proposed_side }}</span></h2>
          <p>{{ a?.timeframe || '—' }} · Conditional entry · {{ p.created_at ? datefmt(p.created_at) : '' }}</p>
        </div>
      </div>
      <Badge :value="p.state" />
    </div>

    <p class="description">{{ a?.entry_condition || 'Loading the saved analysis…' }}</p>

    <div class="plan-numbers">
      <div><span>Entry zone</span><strong class="gold">{{ a?.entry_zone?.map((v: number) => money(v)).join(' – ') || '—' }}</strong></div>
      <div><span>Stop loss</span><strong>{{ a?.stop_loss ? money(a.stop_loss) : '—' }}</strong></div>
      <div><span>Take profit</span><strong>{{ a?.take_profits?.length ? money(a.take_profits[p.data?.take_profit_index || 0]) : '—' }}</strong></div>
      <div><span>Sizing</span><strong>{{ sizingLabel(p.data?.sizing) }}</strong></div>
    </div>

    <div class="plan-steps">
      <div class="plan-step done">Setup reviewed</div>
      <div class="plan-step" :class="breakoutClass">Breakout{{ a?.entry_rule ? ' ' + money(a.entry_rule.breakout_level) : '' }}</div>
      <div class="plan-step" :class="retestClass">Retest{{ p.breakout_time ? ` · bar ${p.bars_since_breakout}/${a?.entry_rule?.max_retest_bars ?? '?'}` : '' }}</div>
      <div class="plan-step" :class="filledClass">Broker execution</div>
    </div>

    <div v-if="p.reason" class="notice" :class="{ red: ['REJECTED', 'UNKNOWN', 'BLOCKED', 'INVALIDATED'].includes(p.state) }" style="margin-bottom: 14px">{{ humanize(p.state) }}: {{ p.reason }}</div>

    <div class="card-footer">
      <span class="mono">{{ short(p.id) }}</span>
      <div class="row">
        <button v-if="state.mode === 'demo' && p.state === 'MONITORING'" class="button ghost" @click="simulateTrigger(p.id)">
          <Icon name="play" />Simulate trigger
        </button>
        <button v-if="p.command_id && state.commands.some((c) => c.id === p.command_id)" class="button ghost" @click="openModal({ type: 'command-details', id: p.command_id })">Command</button>
        <button class="button ghost" @click="openModal({ type: 'plan-details', id: p.id })">Details</button>
        <button v-if="cancellable" class="button danger" @click="askCancel">Cancel plan</button>
      </div>
    </div>
  </article>
</template>
