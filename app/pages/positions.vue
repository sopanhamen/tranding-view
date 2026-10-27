<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { money, signed, timefmt } from '~/utils/format'

const { state, pnl, refreshData } = useWorkspace()

const SIZE = 8
const pnlSum = computed(() => state.positions.reduce((v, p) => v + pnl(p), 0))
const totalVolume = computed(() => state.positions.reduce((v, p) => v + p.volume, 0))
const hasUnknown = computed(() => state.commands.some((c) => c.state === 'UNKNOWN'))

const matches = computed(() => {
  const q = state.query.toLowerCase()
  return state.positions.filter((p) => `${p.symbol} ${p.ticket} ${p.side}`.toLowerCase().includes(q))
})
const start = computed(() => (state.page - 1) * SIZE)
const paged = computed(() => matches.value.slice(start.value, start.value + SIZE))
const pageCount = computed(() => Math.max(1, Math.ceil(matches.value.length / SIZE)))
const rangeLabel = computed(() =>
  matches.value.length
    ? `${start.value + 1}–${Math.min(start.value + SIZE, matches.value.length)} of ${matches.value.length}`
    : '0 positions',
)

function onSearch(e: Event) {
  state.query = (e.target as HTMLInputElement).value
  state.page = 1
}
function clearSearch() {
  state.query = ''
  state.page = 1
}
</script>

<template>
  <div>
    <PageHeading title="Open positions" desc="Manage exposure. Know exactly what is still open.">
      <button class="button ghost" @click="refreshData()"><Icon name="refresh" />Refresh positions</button>
    </PageHeading>

    <div class="summary-grid">
      <div class="summary-card"><span class="muted">Open positions</span><strong>{{ state.positions.length }}</strong><small>Account {{ state.account.login }}</small></div>
      <div class="summary-card"><span class="muted">Total volume</span><strong>{{ money(totalVolume) }}<span class="small muted"> lots</span></strong><small>Across all displayed positions</small></div>
      <div class="summary-card">
        <span class="muted">{{ state.mode === 'demo' ? 'Unrealised P/L' : 'Data updated' }}</span>
        <strong :class="{ positive: state.mode === 'demo' }">{{ state.mode === 'demo' ? signed(pnlSum) : timefmt(state.updatedAt) }}</strong>
        <small>{{ state.mode === 'demo' ? 'Illustrative mark-to-market' : 'UTC+7 · Snapshot, not a live stream' }}</small>
      </div>
    </div>

    <div v-if="hasUnknown" class="status-banner red">
      <Icon name="info" />
      <div><strong>Uncertain execution requires reconciliation</strong><p>A command has an unknown outcome. New entries are blocked. Check broker history before any retry.</p></div>
      <NuxtLink class="button danger" to="/activity">Inspect activity</NuxtLink>
    </div>

    <section class="panel">
      <div class="toolbar">
        <div class="search">
          <Icon name="search" />
          <input id="position-search" :value="state.query" placeholder="Search symbol or ticket…" aria-label="Search positions" @input="onSearch" >
          <button v-if="state.query" class="icon-button" aria-label="Clear position search" @click="clearSearch"><Icon name="close" /></button>
        </div>
        <span class="badge" :class="state.account.mode === 'real' ? 'red' : 'amber'">{{ state.account.mode.toUpperCase() }} ACCOUNT</span>
      </div>

      <div id="position-results">
        <PositionsTable v-if="matches.length" :rows="paged" />
        <EmptyState
          v-else
          :title="state.query ? 'No matching positions' : 'No open positions'"
          :description="state.query ? 'Try another symbol or ticket number.' : 'Confirmed open positions will appear here.'"
        />
        <div class="table-footer">
          <span>{{ rangeLabel }}</span>
          <div class="pagination">
            <button class="icon-button" aria-label="Previous page" :disabled="state.page <= 1" @click="state.page = Math.max(1, state.page - 1)"><Icon name="chevron" cls="reverse" /></button>
            <span>Page {{ state.page }} / {{ pageCount }}</span>
            <button class="icon-button" aria-label="Next page" :disabled="start + SIZE >= matches.length" @click="state.page++"><Icon name="chevron" /></button>
          </div>
        </div>
      </div>
    </section>

    <div class="notice" style="margin-top: 18px"><Icon name="info" /> Closing a position creates a command. The position remains open until the broker confirms the close. Partial fills are shown in activity. Only positions opened by this app can be modified.</div>
    <AppFooter />
  </div>
</template>
