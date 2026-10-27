<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWorkspace } from '~/composables/useWorkspace'
import { datefmt, download } from '~/utils/format'

const { state, openModal, toast } = useWorkspace()

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

async function selectAnalysis(id: string) {
  state.analysis = state.analyses.find((a: any) => a.id === id)
  if (state.mode === 'api') state.analysis = await state.api!.analysis(id)
  openModal({ type: 'analysis-details' })
}
</script>

<template>
  <section class="panel" style="margin-top: 20px">
    <div class="panel-head"><h2>Saved analyses</h2><button class="button ghost" @click="exportAnalyses">Export analyses</button></div>
    <div v-if="state.analyses.length" class="table-wrap">
      <table>
        <thead><tr><th>Captured context</th><th>Timeframe</th><th>Action</th><th>Bias</th><th /></tr></thead>
        <tbody>
          <tr v-for="a in state.analyses" :key="a.id">
            <td>{{ datefmt(a.created_at) }} UTC+7</td>
            <td>{{ a.data.timeframe }}</td>
            <td><Badge :value="a.data.action" /></td>
            <td>{{ a.data.bias }}</td>
            <td><button class="button ghost" @click="selectAnalysis(a.id)">Open analysis</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else title="No saved analyses" description="Run an analysis to save its setup and context." />
    <HistoryMore kind="analyses" />
  </section>
</template>
