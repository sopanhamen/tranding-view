<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'danger'
    icon?: string
    full?: boolean
    disabled?: boolean
    // Shows a spinner with `loadingText` and disables the button.
    loading?: boolean
    loadingText?: string
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { type: 'button', loadingText: 'Working…' },
)
</script>

<template>
  <button :type="type" class="button" :class="[variant, { full }]" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <template v-if="loading"><span class="spinner" /> {{ loadingText }}</template>
    <template v-else><Icon v-if="icon" :name="icon" /><slot /></template>
  </button>
</template>
