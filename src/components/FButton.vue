<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-70',
      sizeClass,
      shapeClass,
      borderClass,
      variantClass,
      props.customClass,
    ]"
  >
    <svg
      v-if="props.icon"
      :class="iconSizeClass"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path :d="props.icon" />
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    variant?: 'primary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    iconOnly?: boolean
    bordered?: boolean
    ariaLabel?: string
    customClass?: string
  }>(),
  {
    type: 'button',
    disabled: false,
    variant: 'primary',
    size: 'md',
    icon: undefined,
    iconOnly: false,
    bordered: false,
    ariaLabel: undefined,
    customClass: '',
  },
)

const variantClass = computed(() => {
  if (props.variant === 'ghost') return 'bg-transparent text-primary hover:bg-primary/5'
  return 'bg-primary text-surface'
})

const sizeClass = computed(() => {
  if (props.iconOnly) {
    if (props.size === 'sm') return 'h-8 w-8'
    if (props.size === 'lg') return 'h-12 w-12'
    return 'h-10 w-10'
  }

  if (props.size === 'sm') return 'px-3 py-2 text-sm'
  if (props.size === 'lg') return 'px-4 py-3 text-base'
  return 'px-[14px] py-[10px]'
})

const iconSizeClass = computed(() => {
  if (props.size === 'sm') return 'h-4 w-4'
  if (props.size === 'lg') return 'h-6 w-6'
  return 'h-5 w-5'
})

const shapeClass = computed(() => {
  if (props.iconOnly) return 'rounded-full'
  return 'rounded-[10px]'
})

const borderClass = computed(() => {
  if (props.bordered) return 'border border-border'
  return 'border border-transparent'
})
</script>

<style scoped></style>
