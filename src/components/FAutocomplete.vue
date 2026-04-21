<template>
  <div ref="rootRef" class="relative">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="w-full rounded-[10px] border border-border px-3 py-2.5 text-base text-text outline-none"
      @focus="isFocused = true"
      @input="onInput"
    />

    <div
      v-if="showDropdown"
      class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] overflow-hidden rounded-[12px] border border-border bg-surface shadow-card"
    >
      <div v-if="loading" class="px-3 py-2 text-sm text-muted">
        Szukanie produktów...
      </div>
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text transition hover:bg-primary/5"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        <span class="truncate">{{ suggestion }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    suggestions?: string[]
    loading?: boolean
    placeholder?: string
  }>(),
  {
    suggestions: () => [],
    loading: false,
    placeholder: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const isFocused = ref(false)

const showDropdown = computed(
  () => isFocused.value && (props.loading || props.suggestions.length > 0),
)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const selectSuggestion = (value: string) => {
  emit('update:modelValue', value)
  emit('select', value)
  isFocused.value = false
}

const handlePointerDown = (event: MouseEvent) => {
  if (!rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  isFocused.value = false
}

onMounted(() => {
  window.addEventListener('mousedown', handlePointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handlePointerDown)
})
</script>

<style scoped></style>
