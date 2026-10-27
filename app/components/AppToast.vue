<script setup lang="ts">
import { useWorkspace } from '~/composables/useWorkspace'

const { toastMessage } = useWorkspace()
</script>

<template>
  <div id="toast" role="status" aria-live="polite" :class="{ visible: !!toastMessage }">
    {{ toastMessage }}
  </div>
</template>
