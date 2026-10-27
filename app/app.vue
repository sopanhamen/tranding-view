<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { cn } from '~/utils/cn'
const reducedMotion = useReducedMotion()
onMounted(async () => {
  window.aurumFetch = $fetch
  const controllerUrl = '/app.js'
  await import(/* @vite-ignore */ controllerUrl)
})
</script>
<template>
  <motion.div :class="cn('min-h-screen bg-canvas text-copy')" :initial="{ opacity: reducedMotion ? 1 : 0 }" :animate="{ opacity: 1 }" :transition="{ duration: reducedMotion ? 0 : 0.2 }">
    <a class="skip-link" href="#main">Skip to workspace</a>
    <div id="app" />
    <div id="toast" role="status" aria-live="polite" />
    <dialog id="modal" aria-labelledby="modal-title" />
  </motion.div>
</template>
