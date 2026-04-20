<template>
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <FCard v-for="card in cards" :key="card.label" custom-class="p-5">
      <p class="m-0 text-sm text-muted">{{ card.label }}</p>
      <p class="mt-2 text-3xl font-bold text-text">{{ card.value }}</p>
    </FCard>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FCard from '@/components/FCard.vue'

const props = defineProps<{
  total: number
  completed: number
  remaining: number
  estimatedCost: string
}>()

const cards = computed(() => [
  { label: 'Wszystkie pozycje', value: props.total },
  { label: 'Kupione', value: props.completed },
  { label: 'Do kupienia', value: props.remaining },
  { label: 'Estymowany koszt', value: props.estimatedCost },
])
</script>

<style scoped></style>
