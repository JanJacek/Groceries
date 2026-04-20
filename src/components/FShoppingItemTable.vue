<template>
  <FTable :headers="headers" :rows="rows" row-key="id" :default-td-class="compact ? 'px-3 py-2' : 'px-3 py-3'">
    <template #cell="{ row, header }">
      <template v-if="header.key === 'name'">
        <div>
          <p :class="['m-0 font-semibold', isCompleted(row) ? 'text-muted line-through' : 'text-text']">
            {{ getItem(row).name }}
          </p>
          <p v-if="getItem(row).note" class="mt-1 text-xs text-muted">{{ getItem(row).note }}</p>
        </div>
      </template>

      <template v-else-if="header.key === 'quantity'">
        {{ formatQuantity(getItem(row).quantity) }} {{ getItem(row).unit }}
      </template>

      <template v-else-if="header.key === 'category'">
        {{ getItem(row).category || 'Brak' }}
      </template>

      <template v-else-if="header.key === 'estimatedPrice'">
        {{ getItem(row).estimatedPrice == null ? '—' : formatCurrency(getItem(row).estimatedPrice ?? 0) }}
      </template>

      <template v-else-if="header.key === 'status'">
        <span
          :class="[
            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
            isCompleted(row) ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
          ]"
        >
          {{ isCompleted(row) ? 'Kupione' : 'Do kupienia' }}
        </span>
      </template>

      <template v-else-if="header.key === 'actions'">
        <div class="flex justify-end gap-2">
          <FButton type="button" size="sm" variant="ghost" bordered @click="$emit('toggle', getItem(row).id, !isCompleted(row))">
            {{ isCompleted(row) ? 'Cofnij' : 'Kupione' }}
          </FButton>
          <FButton type="button" size="sm" variant="ghost" bordered @click="$emit('edit', getItem(row).id)">
            Edytuj
          </FButton>
          <FButton type="button" size="sm" variant="ghost" bordered @click="$emit('delete', getItem(row).id)">
            Usuń
          </FButton>
        </div>
      </template>
    </template>
  </FTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FButton from '@/components/FButton.vue'
import FTable, { type FTableHeader } from '@/components/FTable.vue'
import type { ShoppingItem } from '@/stores/shopping'

const props = defineProps<{
  rows: ShoppingItem[]
  currency: string
  compact?: boolean
}>()

defineEmits<{
  (e: 'toggle', id: string, completed: boolean): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
}>()

const headers = computed<FTableHeader[]>(() => [
  { key: 'name', label: 'Produkt' },
  { key: 'quantity', label: 'Ilość' },
  { key: 'category', label: 'Kategoria' },
  { key: 'estimatedPrice', label: 'Cena', align: 'right', numeric: true },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right', width: '240px' },
])

const getItem = (row: unknown) => row as ShoppingItem

const isCompleted = (row: unknown) => getItem(row).isCompleted

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 2,
  }).format(value)
</script>

<style scoped></style>
