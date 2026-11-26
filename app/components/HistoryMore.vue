<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'

const props = defineProps<{ kind: 'analyses' | 'plans' | 'commands' | 'events' }>()
const { state, historyBusy, loadHistory } = useWorkspace()

const info = computed(() => state.history[props.kind])
const count = computed(() => (state as unknown as Record<string, unknown[]>)[props.kind]?.length ?? 0)
const label = computed(() => (props.kind === 'events' ? 'events' : props.kind))
</script>

<template>
  <div v-if="state.mode === 'api' && info?.hasMore" class="panel-body row between">
    <span class="hint">Showing the latest {{ count }}</span>
    <FormButton variant="ghost" :loading="historyBusy.has(props.kind)" loading-text="Loading…" @click="loadHistory(props.kind)">Load older {{ label }}</FormButton>
  </div>
</template>
