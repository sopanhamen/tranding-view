<script setup lang="ts">
import { computed } from 'vue'
import { badgeTone } from '~/utils/format'

const props = defineProps<{ value: string }>()
const tone = computed(() => badgeTone(props.value))
const label = computed(() => props.value.replaceAll('_', ' '))
</script>

<template>
  <span class="badge" :class="tone"><span class="dot" />{{ label }}</span>
</template>
