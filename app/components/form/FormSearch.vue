<script setup lang="ts">
import { useFieldAttrs } from '~/composables/useFieldAttrs'

defineOptions({ inheritAttrs: false })

// `label` is the input's accessible name; the clear button empties the model.
defineProps<{ label: string; clearLabel?: string }>()
const model = defineModel<string>({ required: true })
const { rootAttrs, controlAttrs } = useFieldAttrs()
</script>

<template>
  <div class="search" v-bind="rootAttrs()">
    <Icon name="search" />
    <input v-model="model" :aria-label="label" v-bind="controlAttrs()" >
    <FormIconButton v-if="model" icon="close" :label="clearLabel ?? 'Clear search'" @click="model = ''" />
  </div>
</template>
