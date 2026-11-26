<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { TIMEFRAMES } from '~/utils/api'
import { money, percent, datefmt, accountMoney, humanize } from '~/utils/format'

const { state, performanceBusy, loadPerformance, openModal } = useWorkspace()

const perf = computed(() => state.performance)
const sample = computed(() => perf.value?.sample)
const OUTCOMES = ['WIN', 'LOSS', 'BREAKEVEN', 'OPEN', 'UNRESOLVED']
const SOURCES = ['mock', 'demo', 'live'].map((s) => ({ value: s, label: humanize(s) }))

onMounted(loadPerformance)
watch(() => [state.perfSource, state.perfTimeframe, state.mode], loadPerformance)
</script>

<template>
  <div>
    <PageHeading title="Performance" desc="Recorded outcomes only. No predictions, no invented win rates.">
      <FormButton v-if="state.mode === 'api'" variant="ghost" icon="refresh" :loading="performanceBusy" loading-text="Loading…" @click="loadPerformance">Refresh</FormButton>
    </PageHeading>

    <EmptyState
      v-if="state.mode !== 'api'"
      title="Connect the API to see recorded outcomes"
      description="Statistics come from trades the server opened and reconciled. The demo workspace has none."
    >
      <FormButton variant="primary" icon="plug" @click="openModal({ type: 'settings' })">Connect your API</FormButton>
    </EmptyState>

    <template v-else>
      <div class="toolbar" style="margin-bottom: 18px; gap: 12px; flex-wrap: wrap">
        <FormSegmented v-model="state.perfSource" :options="SOURCES" aria-label="Result source" style="min-width: 260px" />
        <FormSelect
          id="perf-tf"
          v-model="state.perfTimeframe"
          :options="[{ value: '', label: 'All timeframes' }, ...TIMEFRAMES]"
          label="Timeframe"
          hide-label
          aria-label="Timeframe"
          style="min-width: 160px"
        />
        <span class="hint">Sources are never mixed.</span>
      </div>

      <div v-if="perf" class="summary-grid">
        <div class="summary-card">
          <span class="muted">Win rate</span>
          <strong>{{ perf.win_rate == null ? '—' : percent(perf.win_rate) }}</strong>
          <small>{{ sample.decided }} decided of {{ sample.min_sample }} needed{{ perf.win_rate_ci95 ? ` · 95% CI ${percent(perf.win_rate_ci95.low, 0)}–${percent(perf.win_rate_ci95.high, 0)}` : '' }}</small>
        </div>
        <div class="summary-card">
          <span class="muted">Expectancy</span>
          <strong>{{ perf.expectancy_r == null ? '—' : (perf.expectancy_r >= 0 ? '+' : '') + perf.expectancy_r.toFixed(2) + 'R' }}</strong>
          <small>{{ perf.expectancy_money == null ? 'Reported once the sample is large enough' : accountMoney(perf.expectancy_money, state.account.currency) + ' per trade' }}</small>
        </div>
        <div class="summary-card">
          <span class="muted">Realised P/L</span>
          <strong :class="(perf.total_realised_pnl ?? 0) >= 0 ? 'positive' : 'negative'">{{ perf.total_realised_pnl == null ? '—' : accountMoney(perf.total_realised_pnl, state.account.currency) }}</strong>
          <small>{{ sample.trades }} recorded trade{{ sample.trades === 1 ? '' : 's' }}</small>
        </div>
      </div>

      <div v-if="perf?.explanation" class="notice amber" style="margin-bottom: 18px"><Icon name="info" /> {{ perf.explanation }}</div>

      <div class="page-grid">
        <section class="panel">
          <div class="panel-head">
            <h2>Recorded trades</h2>
            <span v-if="sample" class="row small" style="gap: 6px; flex-wrap: wrap">
              <template v-for="o in OUTCOMES" :key="o"><Badge v-if="sample[o]" :value="o" /><span v-if="sample[o]" class="mono">{{ sample[o] }}</span></template>
            </span>
          </div>
          <div v-if="state.trades.length" class="table-wrap">
            <table>
              <thead><tr><th>Opened (UTC+7)</th><th>Side</th><th>Lots</th><th>Entry → close</th><th>R</th><th>P/L</th><th>Outcome</th></tr></thead>
              <tbody>
                <tr v-for="t in state.trades" :key="t.id">
                  <td class="mono nowrap">{{ datefmt(t.opened_at) }}<br ><span class="small subtle">{{ humanize(t.strategy) }} · {{ t.timeframe || '—' }}</span></td>
                  <td><span class="side-indicator" :class="{ sell: t.side === 'SELL' }">{{ t.side }}</span></td>
                  <td class="mono">{{ money(t.volume) }}</td>
                  <td class="mono nowrap">{{ money(t.entry_price) }} → {{ t.close_price ? money(t.close_price) : 'open' }}</td>
                  <td class="mono" :class="t.realised_r == null ? '' : t.realised_r >= 0 ? 'positive' : 'negative'">{{ t.realised_r == null ? '—' : t.realised_r.toFixed(2) }}</td>
                  <td class="mono" :class="t.realised_pnl == null ? '' : t.realised_pnl >= 0 ? 'positive' : 'negative'">{{ t.realised_pnl == null ? '—' : accountMoney(t.realised_pnl, state.account.currency) }}</td>
                  <td><Badge :value="t.outcome" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState v-else :title="performanceBusy ? 'Loading trades…' : 'No recorded trades'" description="A trade is recorded when an application order fills, and resolved when the worker reconciles broker deals." />
        </section>

        <aside class="panel">
          <div class="panel-head"><h2>How outcomes are scored</h2><Icon name="info" cls="muted" /></div>
          <div class="panel-body">
            <ul v-if="perf?.definition" class="info-list">
              <li><Icon name="check" cls="positive" /><div><strong>Win</strong><small>{{ perf.definition.win }}</small></div></li>
              <li><Icon name="close" cls="negative" /><div><strong>Loss</strong><small>{{ perf.definition.loss }}</small></div></li>
              <li><Icon name="line" /><div><strong>Breakeven</strong><small>{{ perf.definition.breakeven }}</small></div></li>
              <li><Icon name="bars" /><div><strong>R multiple</strong><small>{{ perf.definition.r_multiple }}</small></div></li>
            </ul>
            <p class="hint" style="margin-top: 12px">Historical results describe the past sample only. They are not a probability for the next trade.</p>
          </div>
        </aside>
      </div>
    </template>

    <AppFooter />
  </div>
</template>
