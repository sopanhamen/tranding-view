<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'

const props = defineProps<{ kind: string }>()
const { state, historyBusy, loadHistory } = useWorkspace()

const info = computed(() => state.history[props.kind])
const count = computed(() => (state as unknown as Record<string, unknown[]>)[props.kind]?.length ?? 0)
</script>

<template>
  <div v-if="state.mode === 'api' && info?.hasMore" class="panel-body row between">
    <span class="hint">Showing {{ count }} of {{ info.total }}</span>
    <button class="button ghost" :disabled="historyBusy.has(props.kind)" :aria-busy="historyBusy.has(props.kind)" @click="loadHistory(props.kind)">
      <template v-if="historyBusy.has(props.kind)"><span class="spinner" /> Working…</template>
      <template v-else>Load older {{ props.kind }}</template>
    </button>
  </div>
</template>
