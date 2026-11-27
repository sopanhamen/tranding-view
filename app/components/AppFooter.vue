<script setup lang="ts">
import { useWorkspace } from '~/composables/useWorkspace'

const { state } = useWorkspace()
</script>

<template>
  <footer class="page-footer">
    <span>
      <Icon name="shield" />{{
        !state.api
          ? 'Not connected · Connect an MT5 account to load broker data.'
          : 'Broker data snapshot · Verify command outcomes before taking another action.'
      }}
    </span>
    <span>AURUM TERMINAL <span class="subtle">v2.0</span></span>
  </footer>
</template>
