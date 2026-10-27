<script setup lang="ts">
import { iconPath } from '~/utils/icons'

const props = defineProps<{ name: string; cls?: string }>()
</script>

<template>
  <svg :class="['icon', props.cls]" viewBox="0 0 24 24" aria-hidden="true">
    <path :d="iconPath(props.name)" />
  </svg>
</template>
