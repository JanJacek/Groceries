<template>
  <FTable :headers="headers" :rows="rows" row-key="id" :default-td-class="compact ? 'px-3 py-2' : 'px-3 py-3'">
    <template #header="{ header }">
      <template v-if="header.key === 'status'">
        <span class="inline-flex items-center justify-center text-primary" aria-label="Status zakupów">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiBasketOutline" />
          </svg>
        </span>
      </template>
      <template v-else-if="header.key === 'conditionType'">
        <span class="inline-flex items-center justify-center text-primary" aria-label="Warunek">
          Warunek
        </span>
      </template>
    </template>

    <template #cell="{ row, header }">
      <template v-if="header.key === 'name'">
        <p :class="['m-0 font-semibold', isCompleted(row) ? 'text-muted line-through' : 'text-text']">
          {{ getItem(row).name }}
        </p>
      </template>

      <template v-else-if="header.key === 'quantity'">
        {{ formatQuantity(getItem(row).quantity) }}
      </template>

      <template v-else-if="header.key === 'conditionType'">
        <span
          v-if="getItem(row).conditionType === 'promotion'"
          class="inline-flex items-center justify-center text-primary"
          title="Promotion"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiBrightnessPercent" />
          </svg>
        </span>
        <span v-else class="text-muted">—</span>
      </template>

      <template v-else-if="header.key === 'status'">
        <label class="inline-flex cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            class="h-4 w-4 appearance-none rounded border border-border bg-surface checked:border-primary checked:bg-primary"
            :checked="isCompleted(row)"
            @change="$emit('toggle', getItem(row).id, !isCompleted(row))"
          />
        </label>
      </template>

      <template v-else-if="header.key === 'actions'">
        <div class="flex justify-end">
          <FButton
            type="button"
            size="sm"
            variant="ghost"
            bordered
            icon-only
            :icon="mdiPencilOutline"
            aria-label="Edytuj produkt"
            @click="$emit('edit', getItem(row).id)"
          />
        </div>
      </template>
    </template>
  </FTable>
</template>

<script setup lang="ts">
import { mdiBasketOutline, mdiBrightnessPercent, mdiPencilOutline } from '@mdi/js'
import { computed } from 'vue'
import FButton from '@/components/FButton.vue'
import FTable, { type FTableHeader } from '@/components/FTable.vue'
import type { ShoppingItem } from '@/stores/shopping'

const props = defineProps<{
  rows: ShoppingItem[]
  compact?: boolean
}>()

defineEmits<{
  (e: 'toggle', id: string, completed: boolean): void
  (e: 'edit', id: string): void
}>()

const headers = computed<FTableHeader[]>(() => [
  { key: 'actions', label: '', align: 'left', width: '52px' },
  { key: 'name', label: 'Produkt' },
  { key: 'conditionType', label: 'Warunek', width: '84px', thClass: 'px-3 py-2 text-center', tdClass: 'px-3 py-2 text-center' },
  { key: 'quantity', label: 'Ilość' },
  { key: 'status', label: '', width: '52px', thClass: 'px-3 py-2', tdClass: 'px-3 py-2' },
])

const getItem = (row: unknown) => row as ShoppingItem

const isCompleted = (row: unknown) => getItem(row).isCompleted

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}
</script>

<style scoped></style>
