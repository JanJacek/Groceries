<template>
  <FTable
    :headers="headers"
    :rows="sortedRows"
    row-key="id"
    :default-td-class="compact ? 'px-3 py-2 text-text' : 'px-3 py-3 text-text'"
    head-row-class="border-b border-border text-left text-muted"
    body-row-class="border-b border-border"
  >
    <template #head-top>
      <th
        v-for="header in headers"
        :key="`top-${header.key}`"
        :class="header.thClass || 'px-3 py-2 font-semibold'"
        :style="header.width ? { width: header.width } : undefined"
      >
        <div v-if="header.key === 'status'" class="flex justify-center">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-text transition hover:bg-primary/10 hover:text-primary"
            aria-label="Dodaj produkt"
            @click="$emit('create')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="mdiPlus" />
            </svg>
          </button>
        </div>
      </th>
    </template>

    <template #header="{ header }">
      <button
        type="button"
        class="inline-flex w-full items-center gap-1 bg-transparent p-0 text-sm font-semibold text-muted transition hover:text-text"
        :class="header.key === 'status' || header.key === 'conditionType' ? 'justify-center' : 'justify-start'"
        @click="toggleSort(header.key)"
      >
        <template v-if="header.key === 'status'">
          <span class="inline-flex items-center justify-center" aria-label="Status zakupów">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="mdiBasketOutline" />
            </svg>
          </span>
        </template>
        <template v-else-if="header.key === 'conditionType'">
          <span class="inline-flex items-center justify-center" aria-label="Warunek">
            Warunek
          </span>
        </template>
        <template v-else>
          <span>{{ header.label }}</span>
        </template>
      </button>
    </template>

    <template #cell="{ row, header }">
      <template v-if="header.key === 'name'">
        <button
          type="button"
          class="m-0 bg-transparent p-0 text-left font-semibold transition hover:text-primary"
          :class="isCompleted(row) ? 'text-muted line-through' : 'text-text'"
          @click="$emit('edit', getItem(row).id)"
        >
          {{ getItem(row).name }}
        </button>
      </template>

      <template v-else-if="header.key === 'quantity'">
        {{ formatQuantity(getItem(row).quantity) }}
      </template>

      <template v-else-if="header.key === 'conditionType'">
        <span
          v-if="getItem(row).conditionType === 'promotion'"
          class="inline-flex items-center justify-center text-text"
          title="Promotion"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiBrightnessPercent" />
          </svg>
        </span>
        <span v-else class="text-muted">—</span>
      </template>

      <template v-else-if="header.key === 'status'">
        <div class="flex justify-center">
          <label class="inline-flex cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              class="h-4 w-4 appearance-none rounded border border-border bg-surface checked:border-primary checked:bg-primary"
              :checked="isCompleted(row)"
              @change="$emit('toggle', getItem(row).id, !isCompleted(row))"
            />
          </label>
        </div>
      </template>

    </template>
  </FTable>
</template>

<script setup lang="ts">
import {
  mdiBasketOutline,
  mdiBrightnessPercent,
  mdiPlus,
} from '@mdi/js'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FTable, { type FTableHeader } from '@/components/FTable.vue'
import type { ShoppingItem } from '@/stores/shopping'

const props = defineProps<{
  rows: ShoppingItem[]
  compact?: boolean
}>()

defineEmits<{
  (e: 'toggle', id: string, completed: boolean): void
  (e: 'edit', id: string): void
  (e: 'create'): void
}>()

type SortKey = 'name' | 'conditionType' | 'quantity' | 'status'
type SortDirection = 'asc' | 'desc'

const sortKey = ref<SortKey | null>(null)
const sortDirection = ref<SortDirection>('asc')
const rowOrder = ref<string[]>([])
const debugEnabled = import.meta.env.DEV

const headers = computed<FTableHeader[]>(() => [
  { key: 'name', label: 'Produkt' },
  { key: 'conditionType', label: 'Warunek', width: '84px', thClass: 'px-3 py-2 text-center', tdClass: 'px-3 py-2 text-center' },
  { key: 'quantity', label: 'Ilość' },
  { key: 'status', label: '', width: '52px', thClass: 'px-3 py-2 text-center', tdClass: 'px-3 py-2 text-center align-middle' },
])

const sortedRows = computed(() => {
  const orderMap = new Map(rowOrder.value.map((id, index) => [id, index]))
  return [...props.rows].sort((left, right) => {
    const leftIndex = orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })
})

const getItem = (row: unknown) => row as ShoppingItem

const isCompleted = (row: unknown) => getItem(row).isCompleted

const toggleSort = (key: string) => {
  const nextKey = key as SortKey

  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = nextKey
    sortDirection.value = 'asc'
  }

  const indexedRows = props.rows.map((row, index) => ({ row, index }))

  indexedRows.sort((left, right) => {
    const factor = sortDirection.value === 'asc' ? 1 : -1
    const leftItem = left.row
    const rightItem = right.row

    let result = 0

    if (nextKey === 'name') {
      result = leftItem.name.localeCompare(rightItem.name, 'pl', { sensitivity: 'base' })
    } else if (nextKey === 'conditionType') {
      const leftValue = leftItem.conditionType ?? ''
      const rightValue = rightItem.conditionType ?? ''
      result = leftValue.localeCompare(rightValue, 'pl', { sensitivity: 'base' })
    } else if (nextKey === 'quantity') {
      result = leftItem.quantity - rightItem.quantity
    } else if (nextKey === 'status') {
      result = Number(leftItem.isCompleted) - Number(rightItem.isCompleted)
    }

    if (result !== 0) return result * factor
    return left.index - right.index
  })

  rowOrder.value = indexedRows.map(({ row }) => row.id)
}

watch(
  () => props.rows,
  (rows) => {
    const nextIds = rows.map((row) => row.id)
    const existingIds = rowOrder.value.filter((id) => nextIds.includes(id))
    const appendedIds = nextIds.filter((id) => !existingIds.includes(id))
    rowOrder.value = [...existingIds, ...appendedIds]

    if (debugEnabled) {
      console.debug('[shopping-table] rows changed', {
        nextIds,
        rowOrder: rowOrder.value,
        sortKey: sortKey.value,
        sortDirection: sortDirection.value,
      })
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (!debugEnabled) return
  console.debug('[shopping-table] mounted')
})

onBeforeUnmount(() => {
  if (!debugEnabled) return
  console.debug('[shopping-table] unmounted')
})

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}
</script>

<style scoped></style>
