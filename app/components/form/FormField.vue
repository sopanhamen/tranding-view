<script setup lang="ts">
const props = defineProps<{
  label?: string
  for?: string
  help?: string
  helpId?: string
  optional?: boolean
  hideLabel?: boolean
}>()
</script>

<template>
  <div class="field">
    <label v-if="label || $slots.label" :for="props.for" :class="{ hidden: hideLabel }">
      <slot name="label">{{ label }}</slot>
      <template v-if="optional"> <span class="muted">(optional)</span></template>
    </label>
    <slot />
    <small v-if="help || $slots.help" :id="helpId"><slot name="help">{{ help }}</slot></small>
  </div>
</template>
