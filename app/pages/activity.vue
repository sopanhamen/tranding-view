<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { short, download } from '~/utils/format'
import { csv } from '~/utils/records'

const { state, refreshData, openModal, cancelQueued, toast } = useWorkspace()

const hasUnknown = computed(() => state.commands.some((c) => c.state === 'UNKNOWN'))

function exportHistory() {
  download(
    'aurum-history.csv',
    csv(
      state.commands.map((c: any) => ({ id: c.id, kind: c.kind, state: c.state, created_at: c.created_at })),
      ['id', 'kind', 'state', 'created_at'],
    ),
    'text/csv',
  )
  toast('Loaded command records exported.')
}

function askCancel(id: string) {
  openModal({
    type: 'confirm',
    title: 'Cancel queued command?',
    description: 'Only a command that has not started submitting can be cancelled.',
    bodyHtml:
      '<p class="small muted">The server checks the command state under a lock. A submitting or filled order cannot be cancelled here.</p>',
    label: 'Cancel queued command',
    danger: true,
    onConfirm: () => cancelQueued(id),
  })
}
</script>

<template>
  <div>
    <PageHeading title="Activity &amp; execution" desc="Follow each request all the way to its broker outcome.">
      <button class="button ghost" @click="refreshData()"><Icon name="refresh" />Refresh status</button>
      <button class="button ghost" @click="exportHistory">Export commands</button>
    </PageHeading>

    <div v-if="hasUnknown" class="status-banner red">
      <Icon name="info" />
      <div><strong>Do not retry an unknown order</strong><p>Check broker orders, deals and current positions using the request tag. The server blocks new entries until an operator resolves it.</p></div>
    </div>

    <div class="page-grid">
      <div class="stack">
        <section v-if="state.commands.length" class="panel">
          <div class="panel-head"><h2>Execution commands</h2><span class="tag">{{ state.mode === 'api' ? 'Server history' : 'Demo session' }}</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Command</th><th>Operation</th><th>Outcome</th><th /></tr></thead>
              <tbody>
                <tr v-for="c in state.commands" :key="c.id">
                  <td class="mono">{{ short(c.id) }}</td>
                  <td>{{ c.kind }}</td>
                  <td><Badge :value="c.state" /></td>
                  <td>
                    <button class="button ghost" @click="openModal({ type: 'command-details', id: c.id })">Inspect</button>
                    <button v-if="c.state === 'QUEUED'" class="button danger" @click="askCancel(c.id)">Cancel queued</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <HistoryMore kind="commands" />
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Workspace timeline</h2><span class="small muted">UTC+7</span></div>
          <ActivityList :events="state.events" />
          <HistoryMore kind="events" />
        </section>
      </div>

      <aside class="panel">
        <div class="panel-head"><h2>Read the state, not just the request</h2></div>
        <div class="panel-body">
          <ul class="info-list">
            <li><Icon name="clock" /><div><strong>Queued / Submitting</strong><small>A request exists. A fill is not confirmed.</small></div></li>
            <li><Icon name="check" /><div><strong>Filled / Closed / Updated</strong><small>The broker confirmed the operation.</small></div></li>
            <li><Icon name="info" cls="negative" /><div><strong>Unknown</strong><small>Outcome is uncertain. Inspect broker history; do not submit it again.</small></div></li>
          </ul>
          <p class="hint" style="margin-top: 15px">{{ state.mode === 'api' ? 'Records are restored from the server on reconnect. Credentials stay in memory.' : 'Demo activity is simulated and resets on reload.' }}</p>
        </div>
      </aside>
    </div>

    <AppFooter />
  </div>
</template>
