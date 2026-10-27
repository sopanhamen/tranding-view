<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { ENDPOINTS } from '~/utils/api'

const { state } = useWorkspace()

const groups = computed(() => [...new Set(ENDPOINTS.map((e) => e[0]))])
const endpointsFor = (g: string) => ENDPOINTS.filter((e) => e[0] === g)
</script>

<template>
  <div>
    <PageHeading title="API reference" desc="Every screen follows your FastAPI contract.">
      <a v-if="state.mode === 'api'" class="button ghost" :href="`${state.base}/docs`" target="_blank" rel="noopener"><Icon name="external" />Open Swagger</a>
    </PageHeading>

    <div class="notice" style="margin-bottom: 20px">
      <Icon name="code" /> All application routes use <code>/api/v1</code> and <code>X-API-Key</code>. Order, close and protection requests also require an <code>Idempotency-Key</code>. Credentials are held in memory for this session only.
    </div>

    <section v-for="g in groups" :key="g" class="panel api-group">
      <div class="panel-head"><h2>{{ g }}</h2><span class="tag">{{ endpointsFor(g).length }} endpoints</span></div>
      <div v-for="e in endpointsFor(g)" :key="e[1] + e[2]" class="api-row">
        <span class="method" :class="e[1].toLowerCase()">{{ e[1] }}</span>
        <code>/api/v1{{ e[2] }}</code>
        <span>{{ e[3] }}</span>
      </div>
    </section>

    <section class="panel api-group">
      <div class="panel-head"><h2>Service health &amp; documentation</h2></div>
      <div class="api-row"><span class="method">GET</span><code>/health</code><span>Database-backed service health</span></div>
      <div class="api-row"><span class="method">GET</span><code>/docs · /redoc · /openapi.json</code><span>Swagger, ReDoc and OpenAPI schema</span></div>
    </section>

    <div class="notice amber"><Icon name="info" /> Server history, plan pause/resume and queued cancellation are supported in API v0.2. Provider credentials and risk limits remain server-managed; UNKNOWN orders are never retried automatically.</div>
    <AppFooter />
  </div>
</template>
