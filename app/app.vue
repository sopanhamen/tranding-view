<script setup lang="ts">
import { onMounted } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { cn } from '~/utils/cn'
import { useWorkspace, defaultBase } from '~/composables/useWorkspace'

const reducedMotion = useReducedMotion()
const config = useRuntimeConfig()
const { restoreSession } = useWorkspace()

onMounted(() => {
  // ApiClient routes network calls through Nuxt $fetch.
  window.aurumFetch = $fetch
  // Open on the server's current MT5 connection, if there is one.
  restoreSession(defaultBase(String(config.public.apiBase || '')))
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
