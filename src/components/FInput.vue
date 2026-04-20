<template>
  <input
    :value="props.modelValue"
    :type="props.type"
    :autocomplete="props.autocomplete"
    :required="props.required"
    :minlength="props.minlength"
    :disabled="props.disabled"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :placeholder="props.placeholder"
    class="rounded-[10px] border border-border px-3 py-2.5 text-base text-text outline-none"
    @input="onInput"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string
    type?: string
    autocomplete?: string
    required?: boolean
    minlength?: number
    placeholder?: string
    disabled?: boolean
    min?: string | number
    max?: string | number
    step?: string | number
  }>(),
  {
    type: 'text',
    autocomplete: undefined,
    required: false,
    minlength: undefined,
    placeholder: undefined,
    disabled: false,
    min: undefined,
    max: undefined,
    step: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped></style>
