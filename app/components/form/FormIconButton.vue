<script setup lang="ts">
// `label` is the accessible name; pass `title` separately if a tooltip is wanted.
withDefaults(defineProps<{ icon: string; label: string; iconCls?: string; type?: 'button' | 'submit' | 'reset' }>(), { type: 'button' })
</script>

<template>
  <button :type="type" class="icon-button" :aria-label="label"><Icon :name="icon" :cls="iconCls" /></button>
</template>
