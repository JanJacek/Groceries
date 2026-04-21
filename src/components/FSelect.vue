<template>
  <div ref="root" class="relative" :class="wrapperClass">
    <button
      type="button"
      :aria-label="ariaLabel"
      :disabled="disabled"
      :class="[
        'flex w-full items-center justify-between gap-3 rounded-[10px] border border-border bg-surface text-left text-sm text-text outline-none transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70',
        resolvedTriggerClass,
      ]"
      @click="toggleOpen"
    >
      <span class="flex min-w-0 items-center gap-2">
        <svg
          v-if="leadingIcon"
          class="h-4 w-4 shrink-0 text-muted"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="leadingIcon" />
        </svg>
        <span class="min-w-0 truncate">{{ selectedLabel }}</span>
      </span>
      <svg class="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path :d="mdiChevronDown" />
      </svg>
    </button>

    <div
      v-if="open"
      :class="[
        'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] overflow-hidden rounded-[12px] border border-border bg-surface shadow-card',
        menuClass,
      ]"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text transition hover:bg-primary/5"
        @click="selectOption(option.value)"
      >
        <span class="min-w-0 truncate" :class="option.pending ? 'notification-pulse' : ''">{{ option.label }}</span>
        <svg
          v-if="option.value === modelValue"
          class="mr-1 h-4 w-4 shrink-0 text-primary"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="mdiCheck" />
        </svg>
        <span v-else class="mr-1 h-4 w-4 shrink-0"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiCheck, mdiChevronDown } from '@mdi/js'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type SelectOption = {
  label: string
  value: string
  pending?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
    ariaLabel?: string
    placeholder?: string
    disabled?: boolean
    leadingIcon?: string
    wrapperClass?: string
    triggerClass?: string
    menuClass?: string
  }>(),
  {
    ariaLabel: undefined,
    placeholder: 'Wybierz',
    disabled: false,
    leadingIcon: undefined,
    wrapperClass: '',
    triggerClass: '',
    menuClass: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const selectedLabel = computed(() => selectedOption.value?.label ?? props.placeholder)
const resolvedTriggerClass = computed(() => props.triggerClass || 'px-3 py-2')

const close = () => {
  open.value = false
}

const toggleOpen = () => {
  if (props.disabled) return
  open.value = !open.value
}

const selectOption = (value: string) => {
  emit('update:modelValue', value)
  close()
}

const handlePointerDown = (event: MouseEvent) => {
  if (!root.value) return
  if (root.value.contains(event.target as Node)) return
  close()
}

onMounted(() => {
  window.addEventListener('mousedown', handlePointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handlePointerDown)
})
</script>

<style scoped></style>
