<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { accountMoney, timefmt, humanize } from '~/utils/format'

const { state, openModal, refreshData, disconnect } = useWorkspace()

const connected = computed(() => state.mode === 'api')
const statusBadge = computed(() =>
  !connected.value ? 'DEMO' : state.authFailed ? 'UNAUTHORIZED' : state.historyOnly || !state.health?.fresh ? 'HISTORY_ONLY' : 'CONNECTED',
)

function askDisconnect() {
  openModal({
    type: 'confirm',
    title: 'Disconnect this session',
    description: 'Your server and broker continue running.',
    bodyHtml:
      '<p class="muted small">Disconnecting clears the API key from this page’s memory. It does not cancel trade plans or close positions on the server.</p>',
    label: 'Disconnect session',
    danger: true,
    onConfirm: () => disconnect(),
  })
}
</script>

<template>
  <div>
    <PageHeading title="Connection" desc="One workspace. One configured MT5 account.">
      <button class="button" :class="connected ? 'ghost' : 'primary'" @click="openModal({ type: 'settings' })">
        <Icon name="plug" />{{ connected ? 'Manage connection' : 'Connect your API' }}
      </button>
    </PageHeading>

    <div class="page-grid">
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Trading terminal</h2><Badge :value="statusBadge" /></div>
          <div class="panel-body">
            <div class="instrument">
              <div class="gold-symbol">Au</div>
              <div>
                <h2>{{ connected ? 'MetaTrader 5' : 'Aurum practice terminal' }}</h2>
                <p>{{ connected ? 'Account linked through your FastAPI server' : 'Explore the entire workflow without a broker connection' }}</p>
              </div>
            </div>
            <dl class="connection-details">
              <div><dt>Account login</dt><dd>{{ state.account.login }}</dd></div>
              <div><dt>Account mode</dt><dd>{{ state.account.mode.toUpperCase() }}</dd></div>
              <div><dt>Broker server</dt><dd>{{ state.account.server }}</dd></div>
              <div><dt>Trading symbol</dt><dd>{{ state.symbol }}</dd></div>
              <div><dt>Equity / balance</dt><dd>{{ accountMoney(state.account.equity, state.account.currency) }} / {{ Number.isFinite(state.account.balance) ? accountMoney(state.account.balance, state.account.currency) : '—' }}</dd></div>
              <div><dt>Terminal permission</dt><dd :class="state.account.trade_allowed ? '' : 'negative'">{{ state.account.trade_allowed ? 'Trading allowed' : 'Trading disabled' }}</dd></div>
              <template v-if="connected">
                <div><dt>Leverage · margin</dt><dd>{{ state.account.leverage ? '1:' + state.account.leverage : '—' }} · {{ humanize(state.account.margin_mode) || '—' }}</dd></div>
                <div><dt>Worker snapshot</dt><dd :class="state.health?.fresh ? '' : 'negative'">{{ state.health?.fresh ? `${Math.round(state.health.snapshot_age_seconds)}s old · ${timefmt(state.health.snapshot_updated_at)}` : 'Stale — worker offline' }}</dd></div>
                <div><dt>Broker · AI backend</dt><dd>{{ state.brokerBackend }} · {{ state.aiBackend }}</dd></div>
                <div><dt>API origin</dt><dd class="mono small">{{ state.base }}</dd></div>
              </template>
            </dl>
            <div class="notice" :class="{ amber: !connected }">
              <Icon name="info" />
              {{ connected ? 'The backend selects the MT5 account configured on its Windows worker. This UI cannot change broker credentials.' : 'This is a simulated environment. Account balances, market data and executions are examples.' }}
            </div>
            <div class="row" style="margin-top: 18px">
              <button class="button" @click="refreshData()"><Icon name="refresh" />Check connection</button>
              <button v-if="connected" class="button ghost" @click="askDisconnect">Disconnect session</button>
              <button v-else class="button ghost" @click="openModal({ type: 'scenarios' })">Explore demo scenarios</button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Connection architecture</h2><span class="tag">Server-managed credentials</span></div>
          <div class="connection-diagram">
            <div><Icon name="monitor" />Your workspace</div>
            <Icon name="arrow" />
            <div><Icon name="server" />FastAPI</div>
            <Icon name="arrow" />
            <div><Icon name="monitor" />Windows MT5</div>
          </div>
          <div class="panel-body" style="padding-top: 0">
            <div class="evidence-grid">
              <div class="evidence-item row"><Icon name="database" cls="gold" /><div>Neon PostgreSQL<small>Analyses, plans and commands</small></div></div>
              <div class="evidence-item row"><Icon name="spark" cls="gold" /><div>AI model provider<small>Configured on the backend</small></div></div>
            </div>
            <p class="hint" style="margin-top: 16px">Neon, OpenAI and MT5 credentials stay on the server. Android MT5 connects separately to the same broker account.</p>
          </div>
        </section>
      </div>

      <aside class="panel">
        <div class="panel-head"><h2>Before you connect</h2></div>
        <div class="panel-body">
          <ul class="info-list">
            <li><Icon name="check" /><div><strong>Start your Windows worker</strong><small>MT5 must be logged into the intended account.</small></div></li>
            <li><Icon name="check" /><div><strong>Check your API origin</strong><small>Use HTTPS for a hosted backend.</small></div></li>
            <li><Icon name="check" /><div><strong>Allow this frontend origin</strong><small>The API’s CORS allows http://localhost:3000 by default. Run this app there, or add your origin on the server.</small></div></li>
            <li><Icon name="shield" /><div><strong>Begin on a demo account</strong><small>Real trading also requires the server’s explicit setting.</small></div></li>
          </ul>
        </div>
      </aside>
    </div>

    <AppFooter />
  </div>
</template>
