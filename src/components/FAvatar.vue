<template>
  <span
    :class="[
      'grid place-items-center rounded-full border border-border bg-primary/10 text-xs font-bold text-primary',
      sizeClass,
    ]"
  >
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    text: '',
    size: 'md',
  },
)

const initial = computed(() => {
  const source = props.text.trim().toUpperCase()
  if (!source) return 'U'
  const lettersOnly = source.replace(/[^A-Z]/g, '')
  if (lettersOnly.length >= 2) return lettersOnly.slice(0, 2)
  if (lettersOnly.length === 1) return lettersOnly
  if (source.includes('@')) return source.charAt(0)
  return 'U'
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'h-7 w-7'
  if (props.size === 'lg') return 'h-10 w-10'
  return 'h-8 w-8'
})
</script>

<style scoped></style>
