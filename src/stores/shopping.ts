import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type ShoppingListRole = 'owner' | 'editor'
export type ShoppingListAccessStatus = 'active' | 'pending'

export type ShoppingList = {
  id: string
  name: string
  note: string
  archived: boolean
  createdAt: string
  updatedAt: string
  currentUserRole: ShoppingListRole
  accessStatus: ShoppingListAccessStatus
  invitedAt: string | null
}

export type ShoppingItem = {
  id: string
  listId: string
  productId: string
  createdBy: string | null
  updatedBy: string | null
  name: string
  quantity: number
  conditionType: 'promotion' | null
  isCompleted: boolean
  sortOrder: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProductCatalogItem = {
  id: string
  name: string
}

export type ShoppingReceiptSettlement = {
  receiptId: string
  settledItemsCount: number
}

export type ShoppingListMember = {
  userId: string
  email: string
  role: ShoppingListRole
  avatarInitials: string
  joinedAt: string
  isCurrentUser: boolean
}

type ShoppingListRow = {
  id: string
  name: string
  note: string | null
  archived: boolean
  created_at: string
  updated_at: string
  current_user_role: ShoppingListRole
  access_status: ShoppingListAccessStatus
  invited_at: string | null
}

type ShoppingItemRow = {
  id: string
  list_id: string
  product_id: string
  created_by: string | null
  updated_by: string | null
  name: string
  quantity: number | string
  condition_type: 'promotion' | null
  is_completed: boolean
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

type ProductCatalogRow = {
  id: string
  name: string
  normalized_name?: string
}

type FrequentProductRow = {
  product_id: string
  name: string
}

type ShoppingListMemberRow = {
  user_id: string
  email: string
  role: ShoppingListRole
  avatar_initials: string | null
  joined_at: string
  is_current_user: boolean
}

type ShoppingReceiptSettlementRow = {
  receipt_id: string
  settled_items_count: number
}

type ShoppingListRealtimeRow = {
  id: string
  name: string
  note: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

const mapList = (row: ShoppingListRow): ShoppingList => ({
  id: row.id,
  name: row.name,
  note: row.note ?? '',
  archived: row.archived,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  currentUserRole: row.current_user_role ?? 'editor',
  accessStatus: row.access_status ?? 'active',
  invitedAt: row.invited_at ?? null,
})

const mapItem = (row: ShoppingItemRow): ShoppingItem => ({
  id: row.id,
  listId: row.list_id,
  productId: row.product_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  name: row.name,
  quantity: Number(row.quantity),
  conditionType: row.condition_type,
  isCompleted: row.is_completed,
  sortOrder: row.sort_order,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapProduct = (row: ProductCatalogRow): ProductCatalogItem => ({
  id: row.id,
  name: row.name,
})

const mapMember = (row: ShoppingListMemberRow): ShoppingListMember => ({
  userId: row.user_id,
  email: row.email,
  role: row.role,
  avatarInitials: row.avatar_initials ?? '',
  joinedAt: row.joined_at,
  isCurrentUser: row.is_current_user,
})

const isDuplicateListProductError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505'

export const useShoppingStore = defineStore('shopping', () => {
  const auth = useAuthStore()
  const lists = ref<ShoppingList[]>([])
  const items = ref<ShoppingItem[]>([])
  const products = ref<ProductCatalogItem[]>([])
  const members = ref<ShoppingListMember[]>([])
  const selectedListId = ref<string | null>(null)
  const loadingLists = ref(false)
  const loadingItems = ref(false)
  const loadingMembers = ref(false)
  const ready = ref(false)
  let realtimeChannel: RealtimeChannel | null = null

  const selectedList = computed(
    () => lists.value.find((list) => list.id === selectedListId.value) ?? null,
  )
  const activeLists = computed(() => lists.value.filter((list) => list.accessStatus === 'active'))
  const pendingLists = computed(() => lists.value.filter((list) => list.accessStatus === 'pending'))
  const hasPendingListInvitations = computed(() => pendingLists.value.length > 0)
  const canManageSelectedListMembers = computed(
    () => selectedList.value?.accessStatus === 'active' && selectedList.value?.currentUserRole === 'owner',
  )
  const canEditSelectedList = computed(() => selectedList.value?.accessStatus === 'active')
  const debugEnabled = import.meta.env.DEV

  const debugItems = (label: string) => {
    if (!debugEnabled) return
    console.debug(`[shopping] ${label}`, items.value.map((item) => ({
      id: item.id,
      name: item.name,
      completed: item.isCompleted,
      sortOrder: item.sortOrder,
    })))
  }

  const ensureUserId = () => {
    const userId = auth.user?.id
    if (!userId) throw new Error('Brak zalogowanego użytkownika.')
    return userId
  }

  const clearState = () => {
    lists.value = []
    items.value = []
    products.value = []
    members.value = []
    selectedListId.value = null
    ready.value = false
  }

  const cleanupRealtime = () => {
    if (!realtimeChannel) return
    void supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  const loadMembers = async (
    listId = selectedListId.value,
    options?: { silent?: boolean },
  ) => {
    const targetList = lists.value.find((list) => list.id === listId)
    if (!listId || targetList?.accessStatus !== 'active') {
      members.value = []
      return
    }

    if (!options?.silent) loadingMembers.value = true
    try {
      const { data, error } = await supabase.rpc('list_shopping_list_members', {
        p_list_id: listId,
      })

      if (error) throw error
      members.value = ((data ?? []) as ShoppingListMemberRow[]).map(mapMember)
    } finally {
      if (!options?.silent) loadingMembers.value = false
    }
  }

  const loadItems = async (
    listId = selectedListId.value,
    options?: { silent?: boolean },
  ) => {
    const targetList = lists.value.find((list) => list.id === listId)
    if (!listId || targetList?.accessStatus !== 'active') {
      items.value = []
      return
    }

    selectedListId.value = listId
    if (!options?.silent) loadingItems.value = true
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(
          'id, list_id, product_id, created_by, updated_by, name, quantity, condition_type, is_completed, sort_order, completed_at, created_at, updated_at',
        )
        .eq('list_id', listId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      items.value = ((data ?? []) as ShoppingItemRow[]).map(mapItem)
    } finally {
      if (!options?.silent) loadingItems.value = false
    }
  }

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) throw error
    products.value = ((data ?? []) as ProductCatalogRow[]).map(mapProduct)
  }

  const searchProducts = async (query: string) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL')
    if (normalizedQuery.length < 1) return []

    const { data, error } = await supabase
      .from('products')
      .select('id, name, normalized_name')
      .ilike('normalized_name', `%${normalizedQuery}%`)
      .limit(12)

    if (error) throw error

    return ((data ?? []) as ProductCatalogRow[])
      .sort((left, right) => {
        const leftName = (left.normalized_name ?? left.name).toLocaleLowerCase('pl-PL')
        const rightName = (right.normalized_name ?? right.name).toLocaleLowerCase('pl-PL')
        const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1
        const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1
        if (leftStarts !== rightStarts) return leftStarts - rightStarts

        const leftIndex = leftName.indexOf(normalizedQuery)
        const rightIndex = rightName.indexOf(normalizedQuery)
        if (leftIndex !== rightIndex) return leftIndex - rightIndex

        return leftName.localeCompare(rightName, 'pl', { sensitivity: 'base' })
      })
      .map((product) => product.name)
  }

  const listFrequentProducts = async (listId: string, limit = 6) => {
    if (!listId || limit < 1) return []

    const { data, error } = await supabase.rpc('list_frequent_products_for_user', {
      p_list_id: listId,
      p_limit: limit,
    })

    if (error) throw error

    return ((data ?? []) as FrequentProductRow[]).map((product) => product.name)
  }

  const ensureProduct = async (rawName: string) => {
    const trimmedName = rawName.trim()
    const normalizedName = trimmedName.toLocaleLowerCase('pl-PL')
    const userId = ensureUserId()

    const { data, error } = await supabase
      .from('products')
      .upsert(
        {
          name: trimmedName,
          normalized_name: normalizedName,
          created_by: userId,
        },
        { onConflict: 'normalized_name' },
      )
      .select('id, name')
      .single()

    if (error) throw error

    const product = mapProduct(data as ProductCatalogRow)
    const existingIndex = products.value.findIndex((entry) => entry.id === product.id)
    if (existingIndex === -1) {
      products.value = [product, ...products.value]
    } else {
      products.value = products.value.map((entry) => (entry.id === product.id ? product : entry))
    }

    return product
  }

  const loadLists = async (options?: { silent?: boolean; reloadSelected?: boolean }) => {
    ensureUserId()
    if (!options?.silent) loadingLists.value = true

    try {
      const { data, error } = await supabase.rpc('list_available_shopping_lists')

      if (error) throw error
      lists.value = ((data ?? []) as ShoppingListRow[]).map(mapList)

      if (!lists.value.length) {
        selectedListId.value = null
        items.value = []
        members.value = []
        ready.value = true
        return
      }

      if (!selectedListId.value || !lists.value.some((list) => list.id === selectedListId.value)) {
        selectedListId.value = activeLists.value[0]?.id ?? lists.value[0]?.id ?? null
      }

      if (options?.reloadSelected !== false && selectedList.value?.accessStatus === 'active') {
        await Promise.all([
          loadItems(selectedListId.value, options),
          loadMembers(selectedListId.value, options),
        ])
      } else if (selectedList.value?.accessStatus !== 'active') {
        items.value = []
        members.value = []
      }
      ready.value = true
    } finally {
      if (!options?.silent) loadingLists.value = false
    }
  }

  const createList = async (payload: {
    name: string
    note: string
    archived?: boolean
  }) => {
    const userId = ensureUserId()
    const { error } = await supabase
      .from('shopping_lists')
      .insert({
        created_by: userId,
        name: payload.name.trim(),
        note: payload.note.trim() || null,
        archived: payload.archived ?? false,
      })

    if (error) throw error
    await loadLists()
  }

  const updateList = async (
    listId: string,
    payload: { name: string; note: string; archived: boolean },
  ) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({
        name: payload.name.trim(),
        note: payload.note.trim() || null,
        archived: payload.archived,
      })
      .eq('id', listId)
      .select('id, name, note, archived, created_at, updated_at')
      .single()

    if (error) throw error

    const currentUserRole =
      lists.value.find((list) => list.id === listId)?.currentUserRole ?? selectedList.value?.currentUserRole ?? 'editor'

    const updated = mapList({
      ...(data as Omit<ShoppingListRow, 'current_user_role' | 'access_status' | 'invited_at'>),
      current_user_role: currentUserRole,
      access_status: 'active',
      invited_at: null,
    })

    lists.value = lists.value.map((list) => (list.id === listId ? updated : list))
  }

  const deleteList = async (listId: string) => {
    const { error } = await supabase.from('shopping_lists').delete().eq('id', listId)
    if (error) throw error

    lists.value = lists.value.filter((list) => list.id !== listId)
    if (selectedListId.value === listId) {
      selectedListId.value = lists.value[0]?.id ?? null
      await Promise.all([loadItems(selectedListId.value), loadMembers(selectedListId.value)])
    }
  }

  const createItem = async (payload: {
    listId: string
    name: string
    quantity: number
    conditionType: 'promotion' | null
  }) => {
    const userId = ensureUserId()
    const product = await ensureProduct(payload.name)

    const duplicateItem = items.value.find(
      (item) => item.listId === payload.listId && item.productId === product.id,
    )
    if (duplicateItem) {
      throw new Error('Ten produkt jest już na tej liście.')
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        product_id: product.id,
        created_by: userId,
        updated_by: userId,
        list_id: payload.listId,
        name: product.name,
        quantity: payload.quantity,
        condition_type: payload.conditionType,
        sort_order: items.value.length,
      })
      .select(
        'id, list_id, product_id, created_by, updated_by, name, quantity, condition_type, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) {
      if (isDuplicateListProductError(error)) {
        throw new Error('Ten produkt jest już na tej liście.')
      }
      throw error
    }
    items.value = [...items.value, mapItem(data as ShoppingItemRow)]
  }

  const updateItem = async (
    itemId: string,
    payload: {
      name: string
      quantity: number
      conditionType: 'promotion' | null
    },
  ) => {
    const userId = ensureUserId()
    const product = await ensureProduct(payload.name)

    const currentItem = items.value.find((item) => item.id === itemId)
    if (!currentItem) throw new Error('Nie znaleziono produktu do edycji.')

    const duplicateItem = items.value.find(
      (item) =>
        item.id !== itemId &&
        item.listId === currentItem.listId &&
        item.productId === product.id,
    )
    if (duplicateItem) {
      throw new Error('Ten produkt jest już na tej liście.')
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .update({
        product_id: product.id,
        updated_by: userId,
        name: product.name,
        quantity: payload.quantity,
        condition_type: payload.conditionType,
      })
      .eq('id', itemId)
      .select(
        'id, list_id, product_id, created_by, updated_by, name, quantity, condition_type, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) {
      if (isDuplicateListProductError(error)) {
        throw new Error('Ten produkt jest już na tej liście.')
      }
      throw error
    }
    const updated = mapItem(data as ShoppingItemRow)
    items.value = items.value.map((item) => (item.id === itemId ? updated : item))
  }

  const toggleItem = async (itemId: string, completed: boolean) => {
    debugItems(`before toggle ${itemId} -> ${completed ? 'completed' : 'active'}`)
    const userId = ensureUserId()
    const { data, error } = await supabase
      .from('shopping_items')
      .update({
        updated_by: userId,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', itemId)
      .select(
        'id, list_id, product_id, created_by, updated_by, name, quantity, condition_type, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) throw error
    const updated = mapItem(data as ShoppingItemRow)
    items.value = items.value.map((item) => (item.id === itemId ? updated : item))
    debugItems(`after toggle ${itemId}`)
  }

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', itemId)
    if (error) throw error
    items.value = items.value.filter((item) => item.id !== itemId)
  }

  const settleCompletedItems = async (listId = selectedListId.value) => {
    if (!listId) throw new Error('Najpierw wybierz listę.')

    const { data, error } = await supabase.rpc('settle_completed_shopping_items', {
      p_list_id: listId,
    })

    if (error) throw error

    const settlement = ((data ?? [])[0] ?? null) as ShoppingReceiptSettlementRow | null
    if (!settlement) {
      throw new Error('Nie udało się utworzyć paragonu.')
    }

    items.value = items.value.filter((item) => !(item.listId === listId && item.isCompleted))

    return {
      receiptId: settlement.receipt_id,
      settledItemsCount: settlement.settled_items_count,
    } satisfies ShoppingReceiptSettlement
  }

  const addMemberFromContacts = async (userId: string) => {
    const listId = selectedListId.value
    if (!listId) throw new Error('Najpierw wybierz listę.')

    const { error } = await supabase.rpc('add_shopping_list_member', {
      p_list_id: listId,
      p_user_id: userId,
    })

    if (error) throw error
    await loadLists({ silent: true, reloadSelected: false })
  }

  // Backward-compatible alias for hot-reload / stale component references.
  const inviteMember = async (userId: string) => {
    await addMemberFromContacts(userId)
  }

  const removeMember = async (userId: string) => {
    const listId = selectedListId.value
    if (!listId) throw new Error('Najpierw wybierz listę.')

    const { error } = await supabase.rpc('remove_shopping_list_member', {
      p_list_id: listId,
      p_user_id: userId,
    })

    if (error) throw error
    if (userId === auth.user?.id) {
      await loadLists({ reloadSelected: false })
      return
    }
    await loadMembers(listId)
  }

  const respondToInvitation = async (listId: string, accept: boolean) => {
    const { error } = await supabase.rpc(
      accept ? 'accept_shopping_list_invitation' : 'reject_shopping_list_invitation',
      { p_list_id: listId },
    )

    if (error) throw error
    await loadLists({ reloadSelected: false })
  }

  const handleItemChange = (
    payload: RealtimePostgresChangesPayload<ShoppingItemRow>,
  ) => {
    if (debugEnabled) {
      console.debug('[shopping] realtime item change', {
        eventType: payload.eventType,
        newId: (payload.new as ShoppingItemRow | null)?.id ?? null,
        oldId: (payload.old as Partial<ShoppingItemRow> | null)?.id ?? null,
        selectedListId: selectedListId.value,
      })
      debugItems('before realtime item apply')
    }

    const nextRow = (payload.new ?? null) as ShoppingItemRow | null
    const previousRow = (payload.old ?? null) as Partial<ShoppingItemRow> | null
    const changedListId =
      nextRow?.list_id ??
      previousRow?.list_id

    if (!changedListId || changedListId !== selectedListId.value) return

    if (payload.eventType === 'DELETE') {
      const removedId = previousRow?.id
      if (!removedId) return
      items.value = items.value.filter((item) => item.id !== removedId)
      debugItems(`after realtime delete ${removedId}`)
      return
    }

    if (!nextRow) return
    const nextItem = mapItem(nextRow)
    const existingIndex = items.value.findIndex((item) => item.id === nextItem.id)

    if (existingIndex === -1) {
      items.value = [...items.value, nextItem]
      debugItems(`after realtime insert ${nextItem.id}`)
      return
    }

    items.value = items.value.map((item) => (item.id === nextItem.id ? nextItem : item))
    debugItems(`after realtime update ${nextItem.id}`)
  }

  const handleMemberChange = (
    payload: RealtimePostgresChangesPayload<{
      list_id?: string
      user_id?: string
    }>,
  ) => {
    const changedListId =
      (payload.new as { list_id?: string } | null)?.list_id ??
      (payload.old as { list_id?: string } | null)?.list_id
    const changedUserId =
      (payload.new as { user_id?: string } | null)?.user_id ??
      (payload.old as { user_id?: string } | null)?.user_id

    if (changedUserId === auth.user?.id) {
      void loadLists({ silent: true, reloadSelected: false })
      return
    }

    if (changedListId && changedListId === selectedListId.value) {
      void loadMembers(changedListId, { silent: true })
    }
  }

  const handleListRealtimeChange = (
    payload: RealtimePostgresChangesPayload<ShoppingListRealtimeRow>,
  ) => {
    const nextListRow = (payload.new ?? null) as ShoppingListRealtimeRow | null
    const previousListRow = (payload.old ?? null) as Partial<ShoppingListRealtimeRow> | null
    if (debugEnabled) {
      console.debug('[shopping] realtime list change', {
        eventType: payload.eventType,
        newId: nextListRow?.id ?? null,
        oldId: previousListRow?.id ?? null,
        selectedListId: selectedListId.value,
        currentListIds: lists.value.map((list) => list.id),
      })
    }
    const currentListId = selectedListId.value

    if (payload.eventType === 'DELETE') {
      const removedId = previousListRow?.id
      if (!removedId) return
      lists.value = lists.value.filter((list) => list.id !== removedId)
      if (currentListId === removedId) {
        selectedListId.value = null
        items.value = []
        members.value = []
      }
      return
    }

    const changedId = nextListRow?.id
    if (!changedId) return

    const currentList = lists.value.find((list) => list.id === changedId)

    const nextList = mapList({
      ...(nextListRow as Omit<ShoppingListRow, 'current_user_role' | 'access_status' | 'invited_at'>),
      current_user_role: currentList?.currentUserRole ?? 'editor',
      access_status: currentList?.accessStatus ?? 'active',
      invited_at: currentList?.invitedAt ?? null,
    })

    const existingIndex = lists.value.findIndex((list) => list.id === nextList.id)
    if (existingIndex === -1) {
      void loadLists({ silent: true, reloadSelected: false })
      return
    }

    lists.value = lists.value.map((list) => (list.id === nextList.id ? nextList : list))
  }

  const handleInvitationChange = (
    payload: RealtimePostgresChangesPayload<{
      invitee_user_id?: string
    }>,
  ) => {
    const inviteeUserId =
      (payload.new as { invitee_user_id?: string } | null)?.invitee_user_id ??
      (payload.old as { invitee_user_id?: string } | null)?.invitee_user_id

    if (inviteeUserId === auth.user?.id) {
      void loadLists({ silent: true, reloadSelected: false })
    }
  }

  const initializeRealtime = (userId: string) => {
    cleanupRealtime()
    realtimeChannel = supabase
      .channel(`shopping-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists' },
        handleListRealtimeChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items' },
        handleItemChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list_members' },
        handleMemberChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list_invitations' },
        handleInvitationChange,
      )
      .subscribe()
  }

  watch(
    () => auth.user?.id ?? null,
    (userId) => {
      cleanupRealtime()
      clearState()
      if (userId) initializeRealtime(userId)
    },
    { immediate: true },
  )

  return {
    lists,
    items,
    products,
    members,
    selectedListId,
    selectedList,
    activeLists,
    pendingLists,
    hasPendingListInvitations,
    loadingLists,
    loadingItems,
    loadingMembers,
    ready,
    canManageSelectedListMembers,
    canEditSelectedList,
    loadLists,
    loadItems,
    loadMembers,
    loadProducts,
    searchProducts,
    listFrequentProducts,
    createList,
    updateList,
    deleteList,
    createItem,
    updateItem,
    toggleItem,
    deleteItem,
    settleCompletedItems,
    addMemberFromContacts,
    inviteMember,
    removeMember,
    respondToInvitation,
  }
})
