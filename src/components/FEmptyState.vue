<template>
  <div :class="['rounded-[14px] border border-dashed border-border text-sm text-muted', containerClass]">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    containerClass?: string
  }>(),
  {
    containerClass: 'grid gap-4 p-6',
  },
)
</script>

<style scoped></style>
