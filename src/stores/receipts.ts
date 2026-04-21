import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export type Receipt = {
  id: string
  listId: string | null
  listName: string
  createdBy: string | null
  settledItemsCount: number
  settledAt: string
  createdAt: string
}

export type ReceiptItem = {
  id: string
  receiptId: string
  listId: string | null
  productId: string | null
  name: string
  quantity: number
  conditionType: 'promotion' | null
  createdAt: string
}

type ReceiptRow = {
  id: string
  list_id: string | null
  list_name: string
  created_by: string | null
  settled_items_count: number
  settled_at: string
  created_at: string
}

type ReceiptItemRow = {
  id: string
  receipt_id: string
  list_id: string | null
  product_id: string | null
  name: string
  quantity: number | string
  condition_type: 'promotion' | null
  created_at: string
}

const mapReceipt = (row: ReceiptRow): Receipt => ({
  id: row.id,
  listId: row.list_id,
  listName: row.list_name,
  createdBy: row.created_by,
  settledItemsCount: row.settled_items_count,
  settledAt: row.settled_at,
  createdAt: row.created_at,
})

const mapReceiptItem = (row: ReceiptItemRow): ReceiptItem => ({
  id: row.id,
  receiptId: row.receipt_id,
  listId: row.list_id,
  productId: row.product_id,
  name: row.name,
  quantity: Number(row.quantity),
  conditionType: row.condition_type,
  createdAt: row.created_at,
})

export const useReceiptsStore = defineStore('receipts', () => {
  const receipts = ref<Receipt[]>([])
  const receiptItems = ref<Record<string, ReceiptItem[]>>({})
  const loading = ref(false)
  const loadingItems = ref(false)

  const latestReceiptId = computed(() => receipts.value[0]?.id ?? null)

  const loadReceipts = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, list_id, list_name, created_by, settled_items_count, settled_at, created_at')
        .order('settled_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      receipts.value = ((data ?? []) as ReceiptRow[]).map(mapReceipt)
    } finally {
      loading.value = false
    }
  }

  const loadReceiptItems = async (receiptId: string) => {
    if (!receiptId) return []
    if (receiptItems.value[receiptId]) return receiptItems.value[receiptId]

    loadingItems.value = true
    try {
      const { data, error } = await supabase
        .from('receipt_items')
        .select('id, receipt_id, list_id, product_id, name, quantity, condition_type, created_at')
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const items = ((data ?? []) as ReceiptItemRow[]).map(mapReceiptItem)
      receiptItems.value = {
        ...receiptItems.value,
        [receiptId]: items,
      }

      return items
    } finally {
      loadingItems.value = false
    }
  }

  const deleteReceipt = async (receiptId: string) => {
    const { error } = await supabase.from('receipts').delete().eq('id', receiptId)
    if (error) throw error

    receipts.value = receipts.value.filter((receipt) => receipt.id !== receiptId)
    const nextReceiptItems = { ...receiptItems.value }
    delete nextReceiptItems[receiptId]
    receiptItems.value = nextReceiptItems
  }

  const clear = () => {
    receipts.value = []
    receiptItems.value = {}
  }

  return {
    receipts,
    receiptItems,
    loading,
    loadingItems,
    latestReceiptId,
    loadReceipts,
    loadReceiptItems,
    deleteReceipt,
    clear,
  }
})
