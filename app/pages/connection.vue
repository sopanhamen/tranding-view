<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '~/composables/useWorkspace'
import { loginError } from '~/utils/api'
import { accountMoney, timefmt, humanize } from '~/utils/format'

const { state, openModal, refreshData, disconnect } = useWorkspace()

const connected = computed(() => !!state.api)
const statusBadge = computed(() => {
  if (!connected.value) return 'DISCONNECTED'
  if (state.historyOnly || !state.health?.fresh) return 'HISTORY_ONLY'
  return 'CONNECTED'
})
const terminalState = computed(() => {
  const failed = loginError(state.connectionList, state.connection?.id)
  if (failed) return `Login failed: ${failed}`
  return state.connection?.active ? 'Logged into this account' : 'Worker is logging in…'
})

function askDisconnect() {
  openModal({
    type: 'confirm',
    title: 'Disconnect this session',
    description: 'Your server and broker continue running.',
    bodyHtml:
      '<p class="muted small">Disconnecting forgets this connection in the page. The MT5 terminal stays logged in, and trade plans and positions on the server are unchanged.</p>',
    label: 'Disconnect session',
    danger: true,
    onConfirm: () => disconnect(),
  })
}
</script>

<template>
  <div>
    <PageHeading title="Connection" desc="One workspace. One MT5 account per connection.">
      <FormButton :variant="connected ? 'ghost' : 'primary'" icon="plug" @click="openModal({ type: 'settings' })">
        {{ connected ? 'Manage connection' : 'Connect your API' }}
      </FormButton>
    </PageHeading>

    <div class="page-grid">
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Trading terminal</h2><Badge :value="statusBadge" /></div>
          <div class="panel-body">
            <div class="instrument">
              <div class="gold-symbol">Au</div>
              <div>
                <h2>MetaTrader 5</h2>
                <p>{{ connected ? 'Account linked through your FastAPI server' : 'No account connected yet' }}</p>
              </div>
            </div>
            <dl class="connection-details">
              <div><dt>Account login</dt><dd>{{ state.account.login ?? '—' }}</dd></div>
              <div><dt>Account mode</dt><dd>{{ state.account.mode.toUpperCase() || '—' }}</dd></div>
              <div><dt>Broker server</dt><dd>{{ state.account.server || '—' }}</dd></div>
              <div><dt>Trading symbol</dt><dd>{{ state.symbol }}</dd></div>
              <div><dt>Equity / balance</dt><dd>{{ accountMoney(state.account.equity, state.account.currency) }} / {{ Number.isFinite(state.account.balance) ? accountMoney(state.account.balance, state.account.currency) : '—' }}</dd></div>
              <div><dt>Terminal permission</dt><dd :class="state.account.trade_allowed ? '' : 'negative'">{{ state.account.trade_allowed ? 'Trading allowed' : 'Trading disabled' }}</dd></div>
              <template v-if="connected">
                <div><dt>Leverage · margin</dt><dd>{{ state.account.leverage ? '1:' + state.account.leverage : '—' }} · {{ humanize(state.account.margin_mode) || '—' }}</dd></div>
                <div><dt>Terminal login</dt><dd :class="loginError(state.connectionList, state.connection?.id) ? 'negative' : ''">{{ terminalState }}</dd></div>
                <div><dt>Connection id</dt><dd class="mono small">{{ state.connection?.id || '—' }}</dd></div>
                <div><dt>Worker snapshot</dt><dd :class="state.health?.fresh ? '' : 'negative'">{{ state.health?.fresh ? `${Math.round(state.health.snapshot_age_seconds)}s old · ${timefmt(state.health.snapshot_updated_at)}` : 'Stale — worker offline' }}</dd></div>
                <div><dt>Broker · AI backend</dt><dd>{{ state.brokerBackend }} · {{ state.aiBackend }}</dd></div>
                <div><dt>API origin</dt><dd class="mono small">{{ state.base }}</dd></div>
              </template>
            </dl>
            <div class="notice" :class="{ amber: !connected }">
              <Icon name="info" />
              {{ connected ? 'Your API logs its Windows worker into this account. Reconnect with other credentials to switch accounts.' : 'Connect an MT5 account to load account details, market data and history from your API.' }}
            </div>
            <div class="row" style="margin-top: 18px">
              <FormButton icon="refresh" @click="refreshData()">Check connection</FormButton>
              <FormButton v-if="connected" variant="ghost" @click="askDisconnect">Disconnect session</FormButton>
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
            <p class="hint" style="margin-top: 16px">Neon and OpenAI credentials stay on the server. The MT5 password is sent once when you connect and stored encrypted there. Android MT5 connects separately to the same broker account.</p>
          </div>
        </section>
      </div>

      <aside class="panel">
        <div class="panel-head"><h2>Before you connect</h2></div>
        <div class="panel-body">
          <ul class="info-list">
            <li><Icon name="check" /><div><strong>Start your Windows worker</strong><small>It logs the MT5 terminal into the account you connect.</small></div></li>
              <li><Icon name="check" /><div><strong>Have your MT5 login ready</strong><small>Account number, trading password and the exact server name.</small></div></li>
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
