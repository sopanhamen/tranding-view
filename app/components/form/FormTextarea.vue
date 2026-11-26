<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import { useFieldAttrs } from '~/composables/useFieldAttrs'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ label?: string; help?: string; optional?: boolean; hideLabel?: boolean; id?: string }>()
const model = defineModel<string>({ required: true })
const slots = useSlots()
const { rootAttrs, controlAttrs } = useFieldAttrs()

const autoId = useId()
const textareaId = computed(() => props.id ?? autoId)
const helpId = computed(() => `${textareaId.value}-help`)
const describedBy = computed(() => (props.help || slots.help ? helpId.value : undefined))
</script>

<template>
  <FormField v-bind="rootAttrs()" :label="label" :for="textareaId" :help="help" :help-id="helpId" :optional="optional" :hide-label="hideLabel">
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <textarea :id="textareaId" v-model="model" :aria-describedby="describedBy" v-bind="controlAttrs()" />
    <template v-if="$slots.help" #help><slot name="help" /></template>
  </FormField>
</template>
