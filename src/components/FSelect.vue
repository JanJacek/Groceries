<template>
  <select
    :value="props.modelValue"
    class="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
    @change="onChange"
  >
    <option
      v-for="option in props.options"
      :key="option.value"
      :value="option.value"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
type SelectOption = {
  label: string
  value: string
}

const props = defineProps<{
  modelValue: string
  options: SelectOption[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped></style>
