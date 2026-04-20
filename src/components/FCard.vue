<template>
  <component :is="as" :class="['w-full rounded-[14px] bg-surface p-6 shadow-card', customClass]">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string
    customClass?: string
  }>(),
  {
    as: 'section',
    customClass: '',
  },
)
</script>

<style scoped></style>
