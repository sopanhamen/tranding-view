<script setup lang="ts" generic="T extends string | number">
import { computed, useId, useSlots } from 'vue'
import { useFieldAttrs } from '~/composables/useFieldAttrs'

defineOptions({ inheritAttrs: false })

type Option = T | { value: T; label: string }

const props = defineProps<{
  label?: string
  help?: string
  optional?: boolean
  hideLabel?: boolean
  id?: string
  // Plain values use the value as the label. Use the default slot for custom <option>s.
  options?: Option[]
}>()
const model = defineModel<T>({ required: true })
const slots = useSlots()
const { rootAttrs, controlAttrs } = useFieldAttrs()

const autoId = useId()
const selectId = computed(() => props.id ?? autoId)
const helpId = computed(() => `${selectId.value}-help`)
const describedBy = computed(() => (props.help || slots.help ? helpId.value : undefined))
const items = computed(() => (props.options ?? []).map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) })))
</script>

<template>
  <FormField v-bind="rootAttrs()" :label="label" :for="selectId" :help="help" :help-id="helpId" :optional="optional" :hide-label="hideLabel">
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <select :id="selectId" v-model="model" :aria-describedby="describedBy" v-bind="controlAttrs()">
      <option v-for="o in items" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
      <slot />
    </select>
    <template v-if="$slots.help" #help><slot name="help" /></template>
  </FormField>
</template>
