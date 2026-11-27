<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWorkspace } from '~/composables/useWorkspace'
import { money, accountMoney, timefmt } from '~/utils/format'

const props = withDefaults(defineProps<{ rows: any[]; compact?: boolean }>(), { compact: false })
const { state, pnl, openModal, go } = useWorkspace()

// Only positions opened by this app (server `managed` flag) can be changed here.
const locked = (p: any) => !p.managed
const pl = (p: any) => pnl(p)
</script>

<template>
  <EmptyState
    v-if="!props.rows.length"
    title="No open positions"
    description="Your positions appear here after the broker confirms an entry."
  >
    <FormButton variant="ghost" icon="spark" @click="go('analysis')">Analyse market</FormButton>
  </EmptyState>

  <template v-else>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Symbol / side</th>
            <th>Lots</th>
            <th>Entry price</th>
            <template v-if="!props.compact"><th>Stop loss</th><th>Take profit</th></template>
            <th>Unrealised P/L</th>
            <th style="text-align: right">Manage</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in props.rows" :key="p.ticket">
            <td>
              <div class="table-symbol">
                <span class="gold-symbol">Au</span>
                <strong>{{ p.symbol }}</strong>
                <span class="side-indicator" :class="{ sell: p.side === 'SELL' }">{{ p.side }}</span>
                <span v-if="!p.managed" class="tag" title="Opened outside this app; read-only here">External</span>
              </div>
            </td>
            <td class="mono">{{ money(p.volume) }}</td>
            <td class="mono">{{ money(p.price_open) }}</td>
            <template v-if="!props.compact">
              <td class="mono">{{ money(p.sl) }}</td>
              <td class="mono">{{ money(p.tp) }}</td>
            </template>
            <td class="mono" :class="Number.isFinite(pl(p)) ? (pl(p) >= 0 ? 'positive' : 'negative') : 'muted'">
              {{ Number.isFinite(pl(p)) ? accountMoney(pl(p), state.account.currency) : 'Unavailable' }}
            </td>
            <td>
              <div class="table-actions" style="justify-content: flex-end">
                <FormIconButton
                  icon="settings"
                  :label="`Edit protection for position ${p.ticket}`"
                  :disabled="locked(p)"
                  :title="locked(p) ? 'Only app-created positions can be modified' : 'Edit SL / TP'"
                  @click="openModal({ type: 'protection', ticket: p.ticket })"
                />
                <FormButton
                  variant="ghost"
                  :disabled="locked(p)"
                  :title="locked(p) ? 'Only app-created positions can be closed' : undefined"
                  @click="openModal({ type: 'close-position', ticket: p.ticket })"
                >
                  Close
                </FormButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <span>{{ props.rows.length }} position{{ props.rows.length === 1 ? '' : 's' }} · Worker snapshot</span>
      <span class="row"><Icon name="refresh" />Updated {{ timefmt(state.updatedAt) }}</span>
    </div>
  </template>
</template>
