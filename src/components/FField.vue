<template>
  <label class="grid gap-[6px] font-semibold text-text">
    {{ label }}
    <slot />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<style scoped></style>
