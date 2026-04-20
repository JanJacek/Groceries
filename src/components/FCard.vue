<template>
  <component
    :is="as"
    :class="[
      'w-full',
      roundedClass,
      surfaceClass,
      shadowClass,
      resolvedPaddingClass,
      customClass,
    ]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    as?: string
    customClass?: string
    paddingClass?: string
    surfaceClass?: string
    shadowClass?: string
    roundedClass?: string
  }>(),
  {
    as: 'section',
    customClass: '',
    paddingClass: '',
    surfaceClass: 'bg-surface',
    shadowClass: 'shadow-card',
    roundedClass: 'rounded-[14px]',
  },
)

const resolvedPaddingClass = computed(() => props.paddingClass || 'p-4 md:p-6')
</script>

<style scoped></style>
