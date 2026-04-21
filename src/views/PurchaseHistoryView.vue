<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard p-6">
    <section class="mx-auto grid max-w-6xl gap-6">
      <section class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FCard custom-class="grid gap-3">
          <header class="grid gap-2">
            <h1 class="m-0 text-3xl text-text">Historia zakupów</h1>
            <p class="m-0 text-sm text-muted">
              Wybierz zakres dat, aby filtrować zapisane rachunki.
            </p>
          </header>

          <FMessage v-if="error" variant="error">{{ error }}</FMessage>

          <div class="grid gap-4 rounded-[14px] border border-border p-4">
            <FDatePicker
              v-model="dateFrom"
              leading-label="Od"
              placeholder="Od"
            />
            <FDatePicker
              v-model="dateTo"
              leading-label="Do"
              placeholder="Do"
            />
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
          <header class="grid gap-2 border-b border-border pb-4">
            <h2 class="m-0 text-2xl text-text">Paragony</h2>
          </header>

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
            <section
              v-for="receipt in filteredReceipts"
              :key="receipt.id"
              class="rounded-[14px] border transition"
              :class="selectedReceiptId === receipt.id ? 'border-primary/50 bg-primary/5' : 'border-border'"
            >
              <button
                type="button"
                class="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-primary/5"
                @click="toggleReceipt(receipt.id)"
              >
                <div class="min-w-0">
                  <p class="m-0 font-semibold text-text">{{ receipt.listName }}</p>
                  <p class="mt-1 text-sm text-muted">{{ formatDateTime(receipt.settledAt) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="rounded-full border border-border px-2 py-1 text-xs font-semibold text-muted">
                    {{ receipt.settledItemsCount }}
                  </span>
                  <span class="text-sm text-muted">
                    {{ selectedReceiptId === receipt.id ? '−' : '+' }}
                  </span>
                </div>
              </button>

              <div
                v-if="selectedReceiptId === receipt.id"
                class="grid gap-2 border-t border-border px-4 py-4"
              >
                <div v-if="canDeleteReceipt(receipt.id)" class="flex justify-end">
                  <FButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    bordered
                    @click="removeReceipt(receipt.id)"
                  >
                    Usuń paragon
                  </FButton>
                </div>
                <div v-if="receiptsStore.loadingItems" class="text-sm text-muted">Ładowanie pozycji rachunku...</div>
                <div
                  v-else-if="!selectedReceiptItems.length"
                  class="rounded-[14px] border border-dashed border-border p-4 text-sm text-muted"
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
              </div>
            </section>
          </div>
        </FCard>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FDatePicker from '@/components/FDatePicker.vue'
import FMessage from '@/components/FMessage.vue'
import { useAuthStore } from '@/stores/auth'
import { useReceiptsStore } from '@/stores/receipts'

const auth = useAuthStore()
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

const canDeleteReceipt = (receiptId: string) =>
  Boolean(receiptsStore.receipts.find((receipt) => receipt.id === receiptId)?.createdBy === auth.user?.id)

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

const toggleReceipt = async (receiptId: string) => {
  if (selectedReceiptId.value === receiptId) {
    selectedReceiptId.value = null
    return
  }

  await selectReceipt(receiptId)
}

const removeReceipt = async (receiptId: string) => {
  error.value = ''
  try {
    const storeWithActions = receiptsStore as typeof receiptsStore & {
      deleteReceipt?: (id: string) => Promise<void>
    }

    if (typeof storeWithActions.deleteReceipt !== 'function') {
      throw new Error('Store nie ma akcji usuwania paragonu. Odśwież aplikację.')
    }

    await storeWithActions.deleteReceipt(receiptId)
    if (selectedReceiptId.value === receiptId) {
      selectedReceiptId.value = null
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Nie udało się usunąć paragonu.'
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

    if (selectedReceiptId.value && !receipts.some((receipt) => receipt.id === selectedReceiptId.value)) {
      selectedReceiptId.value = null
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
