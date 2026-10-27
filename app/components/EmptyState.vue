<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="empty">
    <Icon name="layers" />
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
