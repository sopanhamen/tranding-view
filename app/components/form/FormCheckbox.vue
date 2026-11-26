<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="check-line">
    <input v-model="model" type="checkbox" > <slot />
  </label>
</template>
