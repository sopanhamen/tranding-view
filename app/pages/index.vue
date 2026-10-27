<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { money, signed, accountMoney } from '~/utils/format'

const { state, pnl, refreshData, go } = useWorkspace()

const pnlSum = computed(() => state.positions.reduce((s, p) => s + pnl(p), 0))
const equity = computed(() =>
  state.mode === 'demo' ? '$' + money(state.balance + pnlSum.value) : accountMoney(state.account.equity, state.account.currency),
)
const monitoringCount = computed(() => state.plans.filter((p) => p.state === 'MONITORING').length)

const viewAllPath = computed(() =>
  state.tab === 'activity' ? '/activity' : state.tab === 'plans' ? '/plans' : '/positions',
)
</script>

<template>
  <div>
    <PageHeading title="Market workspace" desc="A clear view of the market. A deliberate next move.">
      <button class="button ghost" @click="refreshData()"><Icon name="refresh" />Refresh</button>
      <button class="button primary" @click="go('analysis')"><Icon name="spark" />Analyse market</button>
    </PageHeading>

    <div class="workspace-grid">
      <div>
        <section class="panel" aria-label="Gold market chart"><MarketChart /></section>

        <div class="insight-strip">
          <div class="insight">
            <Icon name="wallet" />
            <div>
              <h3>Account equity</h3>
              <p class="mono">{{ equity }}</p>
              <small>{{ state.mode === 'demo' ? 'Practice account' : 'Broker-reported equity' }}</small>
            </div>
          </div>
          <div class="insight">
            <Icon name="positions" />
            <div>
              <h3>Open positions</h3>
              <p>{{ state.positions.length }} <span class="muted small">positions</span></p>
              <small>{{ state.mode === 'demo' ? signed(pnlSum) + ' unrealised' : 'Latest terminal snapshot' }}</small>
            </div>
          </div>
          <div class="insight">
            <Icon name="plans" />
            <div>
              <h3>Active trade plans</h3>
              <p>{{ monitoringCount }} <span class="muted small">monitoring</span></p>
              <small>Entry conditions checked by worker</small>
            </div>
          </div>
        </div>

        <section class="panel workspace-lower" aria-label="Positions and trade plans">
          <div class="section-tabs" role="group" aria-label="Workspace data">
            <button :class="{ selected: state.tab === 'positions' }" @click="state.tab = 'positions'">Open positions <span class="tab-count">{{ state.positions.length }}</span></button>
            <button :class="{ selected: state.tab === 'plans' }" @click="state.tab = 'plans'">Trade plans <span class="tab-count">{{ state.plans.length }}</span></button>
            <button :class="{ selected: state.tab === 'activity' }" @click="state.tab = 'activity'">Recent activity</button>
            <NuxtLink :to="viewAllPath" class="small muted" style="margin-left: auto">View all <Icon name="chevron" /></NuxtLink>
          </div>
          <PositionsTable v-if="state.tab === 'positions'" :rows="state.positions.slice(0, 3)" compact />
          <PlansTable v-else-if="state.tab === 'plans'" />
          <ActivityList v-else :events="state.events.slice(0, 3)" />
        </section>
      </div>

      <aside>
        <AnalysisCard />
        <div class="stack" style="margin-top: 18px">
          <section class="panel">
            <div class="risk-panel">
              <div class="row between"><h2>Execution guardrails</h2><Icon name="shield" cls="positive" /></div>
              <div class="risk-row"><span>Execution mode</span><b>{{ state.mode === 'demo' ? 'Simulated' : state.account.mode === 'real' ? 'Real account' : 'Broker demo' }}</b></div>
              <div class="risk-row"><span>Entries per analysis</span><b>1 maximum</b></div>
              <div class="risk-row"><span>Order validation</span><b>Server-side</b></div>
              <div class="risk-row"><span>Max position size</span><b>{{ state.configuration ? money(state.configuration.max_volume_lots) : '0.10' }} lots</b></div>
              <div class="risk-row"><span>Max risk per entry</span><b>{{ state.configuration ? state.configuration.max_risk_percent : '1' }}%</b></div>
              <div style="height: 1px; background: var(--border); margin-top: 14px" />
              <p class="hint" style="margin-top: 9px">SL, TP, spread and volume are checked before execution.</p>
            </div>
            <div class="help-box"><Icon name="info" /><span>AI suggests a setup. Your trade plan defines when an order can be sent.</span></div>
          </section>
        </div>
      </aside>
    </div>

    <AppFooter />
  </div>
</template>
