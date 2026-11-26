<script setup lang="ts" generic="T extends string | number">
// Pass aria-label for the group; it falls through to the root.
defineProps<{ options: { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" role="group">
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      :class="{ selected: model === o.value }"
      :aria-pressed="model === o.value"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
