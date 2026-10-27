<script setup lang="ts">
import { useWorkspace } from '~/composables/useWorkspace'
import { money } from '~/utils/format'

const { state } = useWorkspace()
</script>

<template>
  <div v-if="state.plans.length" class="table-wrap">
    <table>
      <thead>
        <tr><th>Symbol / direction</th><th>Entry</th><th>Lots</th><th>Status</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="p in state.plans.slice(0, 3)" :key="p.id">
          <td>
            <strong>{{ state.symbol }}</strong>
            <span class="side-indicator">{{ p.analysis?.data?.proposed_side || 'BUY' }}</span>
          </td>
          <td class="mono">{{ p.analysis?.data?.entry_zone?.map((v: number) => money(v, 0)).join(' – ') || 'From analysis' }}</td>
          <td class="mono">{{ money(p.data.sizing.volume_lots) }}</td>
          <td><Badge :value="p.state" /></td>
          <td><NuxtLink to="/plans">View plan →</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </div>
  <EmptyState
    v-else
    title="No trade plans yet"
    description="Create a conditional plan from an eligible analysis."
  />
</template>
