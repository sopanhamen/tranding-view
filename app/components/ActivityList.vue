<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { timefmt } from '~/utils/format'

defineProps<{ events: any[] }>()
</script>

<template>
  <div v-if="events.length" class="activity-list">
    <div v-for="(e, i) in events" :key="e.id ?? i" class="activity-item">
      <div class="activity-icon"><Icon :name="e.type" /></div>
      <div class="grow"><h3>{{ e.title }}</h3><p>{{ e.description }}</p></div>
      <span class="time">{{ timefmt(e.at) }}</span>
    </div>
  </div>
  <EmptyState
    v-else
    title="No activity yet"
    description="Analysis results and execution updates will appear here."
  />
</template>
