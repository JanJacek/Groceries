import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type ShoppingListRole = 'owner' | 'editor'

export type ShoppingList = {
  id: string
  name: string
  note: string
  colorToken: string
  archived: boolean
  createdAt: string
  updatedAt: string
  currentUserRole: ShoppingListRole
}

export type ShoppingItem = {
  id: string
  listId: string
  createdBy: string | null
  updatedBy: string | null
  name: string
  quantity: number
  isCompleted: boolean
  sortOrder: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
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
  color_token: string
  archived: boolean
  created_at: string
  updated_at: string
  shopping_list_members: { role: ShoppingListRole }[] | { role: ShoppingListRole } | null
}

type ShoppingItemRow = {
  id: string
  list_id: string
  created_by: string | null
  updated_by: string | null
  name: string
  quantity: number | string
  is_completed: boolean
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

type ShoppingListMemberRow = {
  user_id: string
  email: string
  role: ShoppingListRole
  avatar_initials: string | null
  joined_at: string
  is_current_user: boolean
}

const mapListRole = (value: ShoppingListRow['shopping_list_members']): ShoppingListRole => {
  if (Array.isArray(value)) return value[0]?.role ?? 'editor'
  return value?.role ?? 'editor'
}

const mapList = (row: ShoppingListRow): ShoppingList => ({
  id: row.id,
  name: row.name,
  note: row.note ?? '',
  colorToken: row.color_token,
  archived: row.archived,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  currentUserRole: mapListRole(row.shopping_list_members),
})

const mapItem = (row: ShoppingItemRow): ShoppingItem => ({
  id: row.id,
  listId: row.list_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  name: row.name,
  quantity: Number(row.quantity),
  isCompleted: row.is_completed,
  sortOrder: row.sort_order,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapMember = (row: ShoppingListMemberRow): ShoppingListMember => ({
  userId: row.user_id,
  email: row.email,
  role: row.role,
  avatarInitials: row.avatar_initials ?? '',
  joinedAt: row.joined_at,
  isCurrentUser: row.is_current_user,
})

export const useShoppingStore = defineStore('shopping', () => {
  const auth = useAuthStore()
  const lists = ref<ShoppingList[]>([])
  const items = ref<ShoppingItem[]>([])
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
  const canManageSelectedListMembers = computed(() => selectedList.value?.currentUserRole === 'owner')
  const canEditSelectedList = computed(() => Boolean(selectedList.value))

  const ensureUserId = () => {
    const userId = auth.user?.id
    if (!userId) throw new Error('Brak zalogowanego użytkownika.')
    return userId
  }

  const clearState = () => {
    lists.value = []
    items.value = []
    members.value = []
    selectedListId.value = null
    ready.value = false
  }

  const cleanupRealtime = () => {
    if (!realtimeChannel) return
    void supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  const loadMembers = async (listId = selectedListId.value) => {
    if (!listId) {
      members.value = []
      return
    }

    loadingMembers.value = true
    try {
      const { data, error } = await supabase.rpc('list_shopping_list_members', {
        p_list_id: listId,
      })

      if (error) throw error
      members.value = ((data ?? []) as ShoppingListMemberRow[]).map(mapMember)
    } finally {
      loadingMembers.value = false
    }
  }

  const loadItems = async (listId = selectedListId.value) => {
    if (!listId) {
      items.value = []
      return
    }

    selectedListId.value = listId
    loadingItems.value = true
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(
          'id, list_id, created_by, updated_by, name, quantity, is_completed, sort_order, completed_at, created_at, updated_at',
        )
        .eq('list_id', listId)
        .order('is_completed', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      items.value = ((data ?? []) as ShoppingItemRow[]).map(mapItem)
    } finally {
      loadingItems.value = false
    }
  }

  const loadLists = async () => {
    const userId = ensureUserId()
    loadingLists.value = true

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(
          'id, name, note, color_token, archived, created_at, updated_at, shopping_list_members!inner(role)',
        )
        .eq('shopping_list_members.user_id', userId)
        .order('archived', { ascending: true })
        .order('updated_at', { ascending: false })

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
        selectedListId.value = lists.value[0]?.id ?? null
      }

      await Promise.all([loadItems(selectedListId.value), loadMembers(selectedListId.value)])
      ready.value = true
    } finally {
      loadingLists.value = false
    }
  }

  const createList = async (payload: {
    name: string
    note: string
    colorToken: string
    archived?: boolean
  }) => {
    const userId = ensureUserId()
    const { error } = await supabase
      .from('shopping_lists')
      .insert({
        created_by: userId,
        name: payload.name.trim(),
        note: payload.note.trim() || null,
        color_token: payload.colorToken,
        archived: payload.archived ?? false,
      })

    if (error) throw error
    await loadLists()
  }

  const updateList = async (
    listId: string,
    payload: { name: string; note: string; colorToken: string; archived: boolean },
  ) => {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({
        name: payload.name.trim(),
        note: payload.note.trim() || null,
        color_token: payload.colorToken,
        archived: payload.archived,
      })
      .eq('id', listId)
      .select('id, name, note, color_token, archived, created_at, updated_at')
      .single()

    if (error) throw error

    const currentUserRole =
      lists.value.find((list) => list.id === listId)?.currentUserRole ?? selectedList.value?.currentUserRole ?? 'editor'

    const updated = mapList({
      ...(data as Omit<ShoppingListRow, 'shopping_list_members'>),
      shopping_list_members: [{ role: currentUserRole }],
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
  }) => {
    const userId = ensureUserId()
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        created_by: userId,
        updated_by: userId,
        list_id: payload.listId,
        name: payload.name.trim(),
        quantity: payload.quantity,
        sort_order: items.value.length,
      })
      .select(
        'id, list_id, created_by, updated_by, name, quantity, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) throw error
    items.value = [...items.value, mapItem(data as ShoppingItemRow)]
  }

  const updateItem = async (
    itemId: string,
    payload: {
      name: string
      quantity: number
    },
  ) => {
    const userId = ensureUserId()
    const { data, error } = await supabase
      .from('shopping_items')
      .update({
        updated_by: userId,
        name: payload.name.trim(),
        quantity: payload.quantity,
      })
      .eq('id', itemId)
      .select(
        'id, list_id, created_by, updated_by, name, quantity, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) throw error
    const updated = mapItem(data as ShoppingItemRow)
    items.value = items.value.map((item) => (item.id === itemId ? updated : item))
  }

  const toggleItem = async (itemId: string, completed: boolean) => {
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
        'id, list_id, created_by, updated_by, name, quantity, is_completed, sort_order, completed_at, created_at, updated_at',
      )
      .single()

    if (error) throw error
    const updated = mapItem(data as ShoppingItemRow)
    items.value = items.value.map((item) => (item.id === itemId ? updated : item))
  }

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', itemId)
    if (error) throw error
    items.value = items.value.filter((item) => item.id !== itemId)
  }

  const addMemberFromContacts = async (userId: string) => {
    const listId = selectedListId.value
    if (!listId) throw new Error('Najpierw wybierz listę.')

    const { error } = await supabase.rpc('add_shopping_list_member', {
      p_list_id: listId,
      p_user_id: userId,
    })

    if (error) throw error
    await loadMembers(listId)
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
    await loadMembers(listId)
  }

  const handleListChange = () => {
    if (!auth.user?.id) return
    void loadLists()
  }

  const handleItemChange = (
    payload: RealtimePostgresChangesPayload<{
      list_id?: string
    }>,
  ) => {
    const changedListId =
      (payload.new as { list_id?: string } | null)?.list_id ??
      (payload.old as { list_id?: string } | null)?.list_id

    if (!changedListId || changedListId !== selectedListId.value) return
    void loadItems(changedListId)
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
      void loadLists()
      return
    }

    if (changedListId && changedListId === selectedListId.value) {
      void loadMembers(changedListId)
    }
  }

  const initializeRealtime = (userId: string) => {
    cleanupRealtime()
    realtimeChannel = supabase
      .channel(`shopping-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists' },
        handleListChange,
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
    members,
    selectedListId,
    selectedList,
    loadingLists,
    loadingItems,
    loadingMembers,
    ready,
    canManageSelectedListMembers,
    canEditSelectedList,
    loadLists,
    loadItems,
    loadMembers,
    createList,
    updateList,
    deleteList,
    createItem,
    updateItem,
    toggleItem,
    deleteItem,
    addMemberFromContacts,
    inviteMember,
    removeMember,
  }
})
