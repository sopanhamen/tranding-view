<script setup lang="ts">
withDefaults(defineProps<{ message?: string | null; role?: 'alert' | 'status' }>(), { role: 'alert' })
</script>

<template>
  <div v-if="message" class="field-error" :role="role">{{ message }}</div>
</template>
