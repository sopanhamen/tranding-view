<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWorkspace } from '~/composables/useWorkspace'
import { blockingReasons } from '~/utils/api'
import { datefmt, download, humanize } from '~/utils/format'

const { state, openModal, toast, selectAnalysis } = useWorkspace()

function exportAnalyses() {
  download(
    'aurum-analyses.json',
    JSON.stringify(
      state.analyses.map((a: any) => ({
        id: a.id,
        created_at: a.created_at,
        expires_at: a.expires_at,
        reassess_at: a.reassess_at,
        data: a.data,
      })),
      null,
      2,
    ),
    'application/json',
  )
  toast('Loaded analyses exported.')
}

// One-word status: reserved beats expired beats blocked.
function status(a: any): string {
  if (a.eligibility?.reserved_for) return 'RESERVED'
  const reasons = blockingReasons(a, state.now)
  if (!reasons.length) return 'READY'
  if (reasons[0].code === 'ANALYSIS_EXPIRED' || reasons[0].code === 'ANALYSIS_REASSESS_REQUIRED') return 'EXPIRED'
  return a.data.proposed_side ? 'BLOCKED' : 'NO_SETUP'
}

async function open(id: string) {
  await selectAnalysis(id)
  openModal({ type: 'analysis-details' })
}
</script>

<template>
  <section class="panel" style="margin-top: 20px">
    <div class="panel-head"><h2>Saved analyses</h2><button class="button ghost" @click="exportAnalyses"><Icon name="download" />Export</button></div>
    <div v-if="state.analyses.length" class="table-wrap">
      <table>
        <thead><tr><th>Created (UTC+7)</th><th>Timeframe</th><th>Decision</th><th>Outlook</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="a in state.analyses" :key="a.id" :class="{ selected: state.analysis?.id === a.id }">
            <td>{{ datefmt(a.created_at) }}</td>
            <td>{{ a.data.timeframe }}</td>
            <td><Badge :value="a.data.decision" /></td>
            <td>{{ humanize(a.data.outlook) }}</td>
            <td><Badge :value="status(a)" /></td>
            <td style="text-align: right">
              <button class="button ghost" @click="selectAnalysis(a.id)">Use</button>
              <button class="button ghost" @click="open(a.id)">Details</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else title="No saved analyses" description="Run an analysis to save its setup and context." />
    <HistoryMore kind="analyses" />
  </section>
</template>
