<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { useWorkspace, ROUTE_PATHS, type RouteName } from '~/composables/useWorkspace'
import { timefmt, esc } from '~/utils/format'

const { state, openModal, go, refreshData, startBackgroundSync, stopBackgroundSync } = useWorkspace()
const route = useRoute()
const isPhone = useMediaQuery('(max-width:600px)')

const routeTitles: Record<RouteName, string> = {
  market: 'Market workspace',
  analysis: 'AI analysis',
  plans: 'Trade plans',
  positions: 'Positions',
  activity: 'Activity',
  connection: 'Connection',
  api: 'API reference',
}

const pathToRoute = Object.fromEntries(
  Object.entries(ROUTE_PATHS).map(([name, path]) => [path, name]),
) as Record<string, RouteName>

const currentRoute = computed<RouteName>(() => pathToRoute[route.path] ?? 'market')

// Keep the store's route in sync with the real router + reset mobile menu and
// the document title on navigation (the controller did this in navigate()).
watch(
  currentRoute,
  (name) => {
    state.route = name
    state.menu = false
    if (typeof document !== 'undefined') document.title = `${routeTitles[name]} — Aurum`
  },
  { immediate: true },
)

const monitoringCount = computed(() => state.plans.filter((p) => p.state === 'MONITORING').length)

const links = computed(() => [
  { route: 'market' as RouteName, label: 'Market workspace', icon: 'chart' },
  { route: 'analysis' as RouteName, label: 'AI analysis', icon: 'spark' },
  { route: 'plans' as RouteName, label: 'Trade plans', icon: 'plans', count: monitoringCount.value },
  { route: 'positions' as RouteName, label: 'Positions', icon: 'positions', count: state.positions.length },
  { route: 'activity' as RouteName, label: 'Activity', icon: 'activity' },
])

const manageLinks = [
  { route: 'connection' as RouteName, label: 'Connection', icon: 'plug' },
  { route: 'api' as RouteName, label: 'API reference', icon: 'code' },
]

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

function onModeChip() {
  if (state.mode === 'demo') openModal({ type: 'scenarios' })
  else go('connection')
}

onMounted(() => {
  startBackgroundSync()
  clock = setInterval(() => (now.value = Date.now()), 30000)
})
onUnmounted(() => {
  stopBackgroundSync()
  clearInterval(clock)
})
</script>

<template>
  <div class="shell" :class="{ 'menu-open': state.menu }">
    <button class="drawer-backdrop" aria-label="Close navigation" @click="state.menu = false" />

    <aside class="sidebar" aria-label="Main navigation" :inert="isPhone && !state.menu">
      <NuxtLink class="brand" to="/"><span class="brand-mark"><Icon name="trend" /></span><span>aurum<span class="gold">.</span></span></NuxtLink>
      <p class="nav-label">Workspace</p>
      <nav class="nav">
        <NuxtLink
          v-for="l in links"
          :key="l.route"
          :to="ROUTE_PATHS[l.route]"
          :class="{ active: currentRoute === l.route }"
          :aria-label="l.label"
          :aria-current="currentRoute === l.route ? 'page' : undefined"
        >
          <Icon :name="l.icon" /><span>{{ l.label }}</span>
          <span v-if="l.count !== undefined" class="count">{{ l.count }}</span>
        </NuxtLink>
      </nav>
      <div class="nav-divider" />
      <p class="nav-label">Manage</p>
      <nav class="nav">
        <NuxtLink
          v-for="l in manageLinks"
          :key="l.route"
          :to="ROUTE_PATHS[l.route]"
          :class="{ active: currentRoute === l.route }"
          :aria-label="l.label"
          :aria-current="currentRoute === l.route ? 'page' : undefined"
        >
          <Icon :name="l.icon" /><span>{{ l.label }}</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="terminal-mini">
          <div class="row between">
            <span class="row"><span class="dot positive" />{{ state.mode === 'demo' ? 'Practice terminal' : 'MT5 terminal' }}</span>
            <span class="badge" :class="state.account.mode === 'real' ? 'red' : 'amber'">{{ state.account.mode.toUpperCase() }}</span>
          </div>
          <div class="row between muted small">
            <span class="mono">{{ esc(state.account.login) }}</span>
            <span>{{ state.mode === 'demo' ? 'Simulation ready' : 'Account linked' }}</span>
          </div>
        </div>
        <div class="sidebar-user">
          <div class="avatar">PM</div>
          <div class="grow"><p>Panha's workspace</p><small>Personal trading account</small></div>
          <button class="icon-button" aria-label="Open workspace settings" @click="openModal({ type: 'settings' })"><Icon name="settings" /></button>
        </div>
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="row">
          <button class="icon-button mobile-menu" aria-label="Open navigation" :aria-expanded="state.menu" @click="state.menu = !state.menu"><Icon name="menu" /></button>
          <div class="breadcrumb"><span>Workspace</span><span class="subtle">/</span><span>{{ routeTitles[currentRoute] }}</span></div>
        </div>
        <div class="topbar-actions">
          <time class="mono muted">{{ timefmt(now) }} <span class="subtle">UTC+7</span></time>
          <button class="mode-chip" @click="onModeChip">
            <span class="dot" />{{
              state.mode === 'demo'
                ? 'Demo workspace'
                : state.account.mode === 'real'
                  ? 'Real account'
                  : state.brokerBackend === 'mock'
                    ? 'API · mock broker'
                    : 'MT5 demo account'
            }}<Icon name="down" />
          </button>
          <div class="separator" />
          <button class="icon-button" aria-label="Connection settings" @click="openModal({ type: 'settings' })"><Icon name="settings" /></button>
        </div>
      </header>

      <main id="main" class="content" tabindex="-1">
        <div v-if="state.networkError" class="status-banner red">
          <Icon name="info" />
          <div><strong>Connection needs attention</strong><p>{{ state.networkError }}. Data may be stale. Trading actions are paused.</p></div>
          <button class="button ghost" @click="refreshData()">Retry</button>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>
