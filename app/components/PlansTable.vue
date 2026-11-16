<script setup lang="ts">
import { useWorkspace, sizingLabel } from '~/composables/useWorkspace'
import { money } from '~/utils/format'

const { state } = useWorkspace()
</script>

<template>
  <div v-if="state.plans.length" class="table-wrap">
    <table>
      <thead>
        <tr><th>Symbol / direction</th><th>Entry</th><th>Sizing</th><th>Status</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="p in state.plans.slice(0, 3)" :key="p.id">
          <td>
            <strong>{{ p.analysis?.data?.symbol || state.symbol }}</strong>
            <span v-if="p.analysis?.data?.proposed_side" class="side-indicator" :class="{ sell: p.analysis.data.proposed_side === 'SELL' }">{{ p.analysis.data.proposed_side }}</span>
          </td>
          <td class="mono">{{ p.analysis?.data?.entry_zone?.map((v: number) => money(v)).join(' – ') || '—' }}</td>
          <td class="mono">{{ sizingLabel(p.data?.sizing) }}</td>
          <td><Badge :value="p.state" /></td>
          <td><NuxtLink to="/plans">View plan →</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </div>
  <EmptyState
    v-else
    title="No trade plans yet"
    description="Create a conditional plan from a WAIT analysis that has an entry rule."
  />
</template>
