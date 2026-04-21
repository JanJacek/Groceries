<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard p-6">
    <section class="mx-auto grid max-w-6xl gap-6">
      <section class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FCard custom-class="grid gap-4">
          <header class="grid gap-2">
            <h1 class="m-0 text-3xl text-text">Historia zakupów</h1>
            <p class="m-0 text-sm text-muted">
              Wybierz zakres dat, aby filtrować zapisane rachunki.
            </p>
          </header>

          <FMessage v-if="error" variant="error">{{ error }}</FMessage>

          <div class="grid gap-4 rounded-[14px] border border-border p-4">
            <label class="grid gap-2 text-sm text-text">
              Od
              <input
                v-model="dateFrom"
                type="date"
                class="rounded-[10px] border border-border bg-surface px-3 py-2 text-text outline-none"
              />
            </label>
            <label class="grid gap-2 text-sm text-text">
              Do
              <input
                v-model="dateTo"
                type="date"
                class="rounded-[10px] border border-border bg-surface px-3 py-2 text-text outline-none"
              />
            </label>
            <FButton
              type="button"
              variant="ghost"
              bordered
              custom-class="justify-center"
              @click="resetDateRange"
            >
              Wyczyść zakres
            </FButton>
          </div>

          <div class="grid gap-2 text-sm text-muted">
            <span>{{ filteredReceipts.length }} rachunków w wybranym zakresie</span>
            <span v-if="hasInvalidRange" class="text-error">Data końcowa nie może być wcześniejsza niż początkowa.</span>
          </div>
        </FCard>

        <FCard custom-class="grid gap-4">
          <div v-if="receiptsStore.loading" class="text-sm text-muted">Ładowanie rachunków...</div>
          <div
            v-else-if="!receiptsStore.receipts.length"
            class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
          >
            Nie masz jeszcze żadnych zapisanych rachunków.
          </div>
          <div
            v-else-if="!filteredReceipts.length"
            class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
          >
            Brak rachunków w wybranym zakresie dat.
          </div>
          <div v-else class="grid gap-3">
            <button
              v-for="receipt in filteredReceipts"
              :key="receipt.id"
              type="button"
              class="grid gap-2 rounded-[14px] border p-4 text-left transition"
              :class="selectedReceiptId === receipt.id ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'"
              @click="selectReceipt(receipt.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="m-0 font-semibold text-text">{{ receipt.listName }}</p>
                  <p class="mt-1 text-sm text-muted">{{ formatDateTime(receipt.settledAt) }}</p>
                </div>
                <span class="rounded-full border border-border px-2 py-1 text-xs font-semibold text-muted">
                  {{ receipt.settledItemsCount }}
                </span>
              </div>
            </button>
          </div>
        </FCard>
      </section>

      <FCard custom-class="grid gap-4">
        <template v-if="selectedReceipt">
          <header class="grid gap-2 border-b border-border pb-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="m-0 text-2xl text-text">{{ selectedReceipt.listName }}</h2>
                <p class="mt-1 text-sm text-muted">{{ formatDateTime(selectedReceipt.settledAt) }}</p>
              </div>
              <span class="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {{ selectedReceipt.settledItemsCount }} pozycji
              </span>
            </div>
          </header>

          <div v-if="receiptsStore.loadingItems" class="text-sm text-muted">Ładowanie pozycji rachunku...</div>
          <div
            v-else-if="!selectedReceiptItems.length"
            class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
          >
            Ten rachunek nie ma zapisanych pozycji.
          </div>
          <div v-else class="grid gap-2">
            <div
              v-for="item in selectedReceiptItems"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-[14px] border border-border px-4 py-3"
            >
              <div class="min-w-0">
                <p class="m-0 font-semibold text-text">{{ item.name }}</p>
                <p class="mt-1 text-sm text-muted">
                  {{ formatQuantity(item.quantity) }}
                  <span v-if="item.conditionType === 'promotion'"> • promotion</span>
                </p>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else
          class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
        >
          Wybierz rachunek z wyników filtrowania.
        </div>
      </FCard>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FMessage from '@/components/FMessage.vue'
import { useReceiptsStore } from '@/stores/receipts'

const receiptsStore = useReceiptsStore()
const error = ref('')
const selectedReceiptId = ref<string | null>(null)

const today = new Date()
const defaultDateTo = today.toISOString().slice(0, 10)
const defaultDateFrom = defaultDateTo

const dateFrom = ref(defaultDateFrom)
const dateTo = ref(defaultDateTo)

const hasInvalidRange = computed(() =>
  Boolean(dateFrom.value && dateTo.value && dateFrom.value > dateTo.value),
)

const filteredReceipts = computed(() => {
  if (hasInvalidRange.value) return []

  return receiptsStore.receipts.filter((receipt) => {
    const receiptDate = receipt.settledAt.slice(0, 10)
    if (dateFrom.value && receiptDate < dateFrom.value) return false
    if (dateTo.value && receiptDate > dateTo.value) return false
    return true
  })
})

const selectedReceipt = computed(
  () => filteredReceipts.value.find((receipt) => receipt.id === selectedReceiptId.value) ?? null,
)
const selectedReceiptItems = computed(() =>
  selectedReceiptId.value ? (receiptsStore.receiptItems[selectedReceiptId.value] ?? []) : [],
)

const selectReceipt = async (receiptId: string) => {
  selectedReceiptId.value = receiptId
  try {
    await receiptsStore.loadReceiptItems(receiptId)
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać pozycji rachunku.'
  }
}

const resetDateRange = () => {
  dateFrom.value = ''
  dateTo.value = ''
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const formatQuantity = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

watch(
  filteredReceipts,
  (receipts) => {
    if (!receipts.length) {
      selectedReceiptId.value = null
      return
    }

    const firstReceipt = receipts[0]
    if (!firstReceipt) return

    if (!selectedReceiptId.value || !receipts.some((receipt) => receipt.id === selectedReceiptId.value)) {
      void selectReceipt(firstReceipt.id)
    }
  },
  { immediate: true },
)

onMounted(() => {
  void receiptsStore.loadReceipts().catch((loadError) => {
    error.value = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać historii zakupów.'
  })
})
</script>

<style scoped></style>
