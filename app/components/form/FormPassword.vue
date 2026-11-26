<script setup lang="ts">
import { ref } from 'vue'

// Label, help, id and native attrs fall through to FormInput.
const model = defineModel<string>({ required: true })
const show = ref(false)
</script>

<template>
  <FormInput v-model="model" :type="show ? 'text' : 'password'" spellcheck="false">
    <template #append>
      <FormIconButton icon="eye" :label="show ? 'Hide password' : 'Show password'" @click="show = !show" />
    </template>
  </FormInput>
</template>
