<script setup lang="ts">
import { onMounted } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { cn } from '~/utils/cn'
import { useWorkspace } from '~/composables/useWorkspace'

const reducedMotion = useReducedMotion()
const { ensureDemo } = useWorkspace()

// Seed the practice workspace before the first paint (the controller did this at
// module load). SSR is disabled, so setup already runs on the client.
ensureDemo()

onMounted(() => {
  // ApiClient routes network calls through Nuxt $fetch.
  window.aurumFetch = $fetch
})
</script>

<template>
  <motion.div
    :class="cn('min-h-screen bg-canvas text-copy')"
    :initial="{ opacity: reducedMotion ? 1 : 0 }"
    :animate="{ opacity: 1 }"
    :transition="{ duration: reducedMotion ? 0 : 0.2 }"
  >
    <a class="skip-link" href="#main">Skip to workspace</a>
    <NuxtLayout><NuxtPage /></NuxtLayout>
    <AppToast />
    <AppModal />
  </motion.div>
</template>
