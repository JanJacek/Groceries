<template>
  <p :class="['m-0', variantClass]">
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'error' | 'success' | 'muted'
  }>(),
  {
    variant: 'muted',
  },
)

const variantClass = computed(() => {
  if (props.variant === 'error') return 'text-error'
  if (props.variant === 'success') return 'text-success'
  return 'text-muted'
})
</script>

<style scoped></style>
