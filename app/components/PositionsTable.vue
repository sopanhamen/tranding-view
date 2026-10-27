<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWorkspace } from '~/composables/useWorkspace'
import { money, signed, accountMoney, timefmt } from '~/utils/format'

const props = withDefaults(defineProps<{ rows: any[]; compact?: boolean }>(), { compact: false })
const { state, pnl, openModal, go } = useWorkspace()

const locked = (p: any) => state.mode === 'api' && p.magic !== 261026
</script>

<template>
  <EmptyState
    v-if="!props.rows.length"
    title="No open positions"
    description="Your positions appear here after the broker confirms an entry."
  >
    <button class="button ghost" @click="go('analysis')"><Icon name="spark" />Analyse market</button>
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
              </div>
            </td>
            <td class="mono">{{ money(p.volume) }}</td>
            <td class="mono">{{ money(p.price_open) }}</td>
            <template v-if="!props.compact">
              <td class="mono">{{ money(p.sl) }}</td>
              <td class="mono">{{ money(p.tp) }}</td>
            </template>
            <td class="mono" :class="state.mode === 'demo' ? (pnl(p) >= 0 ? 'positive' : 'negative') : ''">
              {{
                state.mode === 'demo'
                  ? signed(pnl(p))
                  : Number.isFinite(p.profit)
                    ? accountMoney(p.profit, state.account.currency)
                    : 'Unavailable'
              }}
            </td>
            <td>
              <div class="table-actions" style="justify-content: flex-end">
                <button
                  class="icon-button"
                  :disabled="locked(p)"
                  :title="locked(p) ? 'Only app-created positions can be modified' : 'Edit SL / TP'"
                  :aria-label="`Edit protection for position ${p.ticket}`"
                  @click="openModal({ type: 'protection', ticket: p.ticket })"
                >
                  <Icon name="settings" />
                </button>
                <button
                  class="button ghost"
                  :disabled="locked(p)"
                  :title="locked(p) ? 'Only app-created positions can be closed' : undefined"
                  @click="openModal({ type: 'close-position', ticket: p.ticket })"
                >
                  Close
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <span>{{ props.rows.length }} position{{ props.rows.length === 1 ? '' : 's' }} · {{ state.mode === 'demo' ? 'Practice account' : 'Worker snapshot' }}</span>
      <span class="row"><Icon name="refresh" />{{ state.mode === 'demo' ? 'Simulated values' : 'Updated ' + timefmt(state.updatedAt) }}</span>
    </div>
  </template>
</template>
