<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard px-4 py-4 md:px-6 md:py-6">
    <section class="mx-auto grid max-w-6xl gap-4 md:gap-6">
      <div class="grid gap-6">
        <template v-if="displayedList || isListFormMode || isItemFormMode || isListSettingsMode">
          <FCard padding-class="p-0" custom-class="overflow-hidden">
            <div class="relative grid gap-3 border-b border-border bg-surface p-4">
              <FButton
                v-if="isEditorMode"
                type="button"
                variant="ghost"
                bordered
                icon-only
                :icon="mdiArrowLeft"
                :aria-label="closeEditorLabel"
                custom-class="absolute right-4 top-4"
                @click="closeEditor"
              />
              <FButton
                v-else-if="displayedList"
                type="button"
                variant="ghost"
                bordered
                icon-only
                :icon="mdiPlus"
                aria-label="Dodaj produkt"
                custom-class="absolute right-4 top-4"
                @click="openCreateItem"
              />
              <div class="min-w-0 pr-12">
                <div class="flex min-w-0 items-center gap-3">
                  <button
                    v-if="displayedList && !isEditorMode"
                    type="button"
                    class="m-0 min-w-0 bg-transparent p-0 text-left text-3xl text-text transition hover:text-primary"
                    @click="openEditList"
                  >
                    {{ cardTitle }}
                  </button>
                  <h1 v-else class="m-0 text-3xl text-text">{{ cardTitle }}</h1>
                  <span
                    v-if="displayedList && !isEditorMode"
                    class="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                    :title="memberCountLabel"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path :d="memberCountIcon" />
                    </svg>
                    {{ shopping.members.length }}
                  </span>
                </div>
                <div v-if="displayedList && !isEditorMode" class="mt-2 flex items-center gap-2">
                  <FButton
                    v-if="displayedList.note"
                    type="button"
                    size="sm"
                    variant="ghost"
                    bordered
                    icon-only
                    :icon="mdiNoteOutline"
                    aria-label="Pokaż notatkę listy"
                    @click="showListNotePopup = true"
                  />
                </div>
              </div>
            </div>

            <div :class="isEditorMode ? 'grid gap-4 p-4' : 'grid gap-0 p-0'">
              <template v-if="isListSettingsMode">
                <FShoppingMembersPanel
                  :members="shopping.members"
                  :loading="shopping.loadingMembers"
                  :can-manage="canManageListMembers"
                  :can-remove-members="shopping.canManageSelectedListMembers"
                  :error="memberError"
                  :success="memberSuccess"
                  @add="openContactsPicker"
                  @delete-list="removeListFromSettings"
                  @remove-member="removeMember"
                />
              </template>

              <template v-else-if="isListFormMode">
                <FShoppingListForm
                  v-model="listForm"
                  :saving="savingList"
                  :error="listError"
                  @submit="submitList"
                >
                  <template v-if="editingListId" #after-fields>
                    <FShoppingMembersPanel
                      :members="shopping.members"
                      :loading="shopping.loadingMembers"
                      :can-manage="canManageListMembers"
                      :can-remove-members="shopping.canManageSelectedListMembers"
                      :error="memberError"
                      :success="memberSuccess"
                      @add="openContactsPicker"
                      @delete-list="removeListFromSettings"
                      @remove-member="removeMember"
                    />
                  </template>
                </FShoppingListForm>
              </template>

              <template v-else-if="isItemFormMode">
                <FShoppingItemForm
                  v-model="itemForm"
                  :condition-options="itemConditionOptions"
                  :saving="savingItem"
                  :error="itemError"
                  :editing="Boolean(editingItemId)"
                  @submit="submitItem"
                  @secondary-action="editingItemId ? removeItemFromPopup() : closeEditor()"
                />
              </template>

              <div v-else-if="shopping.loadingItems" class="text-sm text-muted">Ładowanie produktów...</div>
              <FEmptyState v-else-if="!shopping.items.length">
                <p class="m-0">Ta lista jest pusta. Dodaj pierwszy produkt, żeby zacząć.</p>
                <div>
                  <FButton
                    type="button"
                    variant="ghost"
                    bordered
                    icon-only
                    :icon="mdiPlus"
                    aria-label="Dodaj produkt"
                    @click="openCreateItem"
                  />
                </div>
              </FEmptyState>
              <FEmptyState v-else-if="!filteredItems.length" container-class="p-6">
                Brak pozycji dla wybranych filtrów.
              </FEmptyState>
              <FShoppingItemTable v-else :rows="filteredItems" :compact="settings.compactView" @toggle="toggleItem" @edit="openEditItem" />
            </div>
          </FCard>
        </template>

        <FCard v-else custom-class="grid gap-4 p-8 text-center">
          <h1 class="m-0 text-3xl text-text">Lista nie jest dostępna</h1>
          <p class="m-0 text-sm text-muted">
            Wybrana lista nie istnieje albo nie masz do niej dostępu.
          </p>
          <div>
            <FButton type="button" @click="goToLists">Przejdź do listy</FButton>
          </div>
        </FCard>
      </div>
    </section>

    <FPopup
      :open="showListNotePopup"
      title="Notatka listy"
      confirm-text="Zamknij"
      cancel-text="Wróć"
      @close="showListNotePopup = false"
      @confirm="showListNotePopup = false"
    >
      <p class="m-0 whitespace-pre-wrap text-sm text-text">
        {{ displayedList?.note || 'Lista nie ma notatki.' }}
      </p>
    </FPopup>

    <FPopup
      :open="showContactsPickerPopup"
      :loading="addingContactToList"
      title="Dodaj znajomego do listy"
      confirm-text="Zamknij"
      cancel-text="Wróć"
      @close="closeContactsPicker"
      @confirm="closeContactsPicker"
    >
      <div class="grid gap-4">
        <p class="m-0 text-sm text-muted">
          Wybierz kontakt, którego chcesz szybko dodać do tej listy jako współpracownika.
        </p>

        <div v-if="contacts.loading" class="text-sm text-muted">Ładowanie kontaktów...</div>
        <FEmptyState v-else-if="!contacts.contacts.length" container-class="p-4">
          Najpierw dodaj kontakty z menu avatara: `Kontakty`.
        </FEmptyState>
        <FEmptyState v-else-if="!availableContacts.length" container-class="p-4">
          Wszyscy Twoi znajomi z kontaktów są już na tej liście.
        </FEmptyState>
        <div v-else class="grid gap-3">
          <button
            v-for="contact in availableContacts"
            :key="contact.userId"
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-[14px] border border-border p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
            @click="addContactToList(contact.userId)"
          >
            <div class="flex items-center gap-3">
              <FAvatar :text="contact.avatarInitials || contact.email" />
              <div>
                <p class="m-0 font-semibold text-text">{{ contact.email }}</p>
                <p class="mt-1 text-sm text-muted">Dodaj jako współpracownika listy.</p>
              </div>
            </div>
            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              +
            </span>
          </button>
        </div>
      </div>
    </FPopup>

  </main>
</template>

<script setup lang="ts">
import {
  mdiAccountGroupOutline,
  mdiAccountMultipleOutline,
  mdiAccountOutline,
  mdiArrowLeft,
  mdiNoteOutline,
  mdiPlus,
} from '@mdi/js'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FAvatar from '@/components/FAvatar.vue'
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FEmptyState from '@/components/FEmptyState.vue'
import FPopup from '@/components/FPopup.vue'
import FShoppingItemForm from '@/components/FShoppingItemForm.vue'
import FShoppingItemTable from '@/components/FShoppingItemTable.vue'
import FShoppingListForm from '@/components/FShoppingListForm.vue'
import FShoppingMembersPanel from '@/components/FShoppingMembersPanel.vue'
import { useContactsStore } from '@/stores/contacts'
import { useSettingsStore } from '@/stores/settings'
import { type ShoppingList, useShoppingStore } from '@/stores/shopping'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const shopping = useShoppingStore()
const contacts = useContactsStore()

const showListNotePopup = ref(false)
const showContactsPickerPopup = ref(false)
const savingList = ref(false)
const savingItem = ref(false)
const addingContactToList = ref(false)
const editingListId = ref<string | null>(null)
const editingItemId = ref<string | null>(null)
const listError = ref('')
const itemError = ref('')
const memberError = ref('')
const memberSuccess = ref('')
const displayedList = ref<ShoppingList | null>(null)

const listForm = ref({
  name: '',
  note: '',
  archived: false,
})

const itemForm = ref<{
  name: string
  quantity: number
  conditionType: '' | 'promotion'
}>({
  name: '',
  quantity: 1,
  conditionType: '',
})

const itemConditionOptions = [
  { label: 'Brak', value: '' },
  { label: 'Promotion', value: 'promotion' },
]

type EditorMode = 'view' | 'settings' | 'new-list' | 'edit-list' | 'new-item' | 'edit-item'

const editorMode = ref<EditorMode>('view')
const filteredItems = computed(() => shopping.items)
const isListSettingsMode = computed(() => editorMode.value === 'settings')
const isListFormMode = computed(() => editorMode.value === 'new-list' || editorMode.value === 'edit-list')
const isItemFormMode = computed(() => editorMode.value === 'new-item' || editorMode.value === 'edit-item')
const isEditorMode = computed(() => isListSettingsMode.value || isListFormMode.value || isItemFormMode.value)
const cardTitle = computed(() => {
  if (editorMode.value === 'settings') return 'Opcje listy'
  if (editorMode.value === 'new-list') return 'Nowa lista'
  if (editorMode.value === 'edit-list') return 'Edytuj listę'
  if (editorMode.value === 'new-item') return 'Nowy produkt'
  if (editorMode.value === 'edit-item') return 'Edytuj produkt'
  return displayedList.value?.name ?? 'Lista'
})
const closeEditorLabel = computed(() => {
  if (isListSettingsMode.value) return 'Zamknij opcje listy'
  if (isListFormMode.value) return 'Zamknij formularz listy'
  if (isItemFormMode.value) return 'Zamknij formularz produktu'
  return 'Zamknij'
})

const memberCountIcon = computed(() => {
  const count = shopping.members.length
  if (count <= 1) return mdiAccountOutline
  if (count === 2) return mdiAccountMultipleOutline
  return mdiAccountGroupOutline
})
const memberCountLabel = computed(() => {
  const count = shopping.members.length
  if (count <= 1) return '1 użytkownik'
  if (count === 2) return '2 użytkowników'
  return `${count} użytkowników`
})
const canManageListMembers = computed(
  () =>
    displayedList.value?.currentUserRole === 'owner' ||
    shopping.selectedList?.currentUserRole === 'owner',
)
const availableContacts = computed(() => {
  const memberIds = new Set(shopping.members.map((member) => member.userId))
  return contacts.contacts.filter((contact) => !memberIds.has(contact.userId))
})

const resetListForm = () => {
  listForm.value = {
    name: '',
    note: '',
    archived: false,
  }
}

const resetItemForm = () => {
  itemForm.value = {
    name: '',
    quantity: 1,
    conditionType: '',
  }
}

const syncSelectedList = async () => {
  const routeListId = typeof route.params.listId === 'string' ? route.params.listId : null

  shopping.selectedListId = routeListId
  await shopping.loadLists()

  if (!routeListId) {
    shopping.selectedListId = null
    displayedList.value = null
    await Promise.all([shopping.loadItems(null), shopping.loadMembers(null)])
    return
  }

  if (!shopping.lists.some((list) => list.id === routeListId)) {
    shopping.selectedListId = null
    displayedList.value = null
    await Promise.all([shopping.loadItems(null), shopping.loadMembers(null)])
    return
  }

  shopping.selectedListId = routeListId
  await Promise.all([shopping.loadItems(routeListId), shopping.loadMembers(routeListId)])
  displayedList.value = shopping.selectedList
}

const goToLists = async () => {
  const targetListId = shopping.selectedListId || shopping.lists[0]?.id
  if (targetListId) {
    await router.push(`/lists/${targetListId}`)
    return
  }
  await router.push({ path: '/', query: { mode: 'new-list' } })
}

const openContactsPicker = async () => {
  memberError.value = ''
  memberSuccess.value = ''
  await contacts.loadContacts()
  showContactsPickerPopup.value = true
}

const closeContactsPicker = () => {
  if (addingContactToList.value) return
  showContactsPickerPopup.value = false
}

const openCreateList = () => {
  editingListId.value = null
  listError.value = ''
  resetListForm()
  editorMode.value = 'new-list'
}

const openEditList = () => {
  if (!shopping.selectedList) return
  editingListId.value = shopping.selectedList.id
  listError.value = ''
  listForm.value = {
    name: shopping.selectedList.name,
    note: shopping.selectedList.note,
    archived: shopping.selectedList.archived,
  }
  editorMode.value = 'edit-list'
}

const closeEditor = async (options?: { force?: boolean }) => {
  if (!options?.force && (savingList.value || savingItem.value)) return
  editorMode.value = 'view'
  editingListId.value = null
  editingItemId.value = null
  listError.value = ''
  itemError.value = ''
  resetListForm()
  resetItemForm()
  if (route.query.mode) {
    await router.replace({ path: route.path, query: {} })
  }
}

const submitList = async () => {
  if (!listForm.value.name.trim()) {
    listError.value = 'Podaj nazwę listy.'
    return
  }

  listError.value = ''
  savingList.value = true
  try {
    if (editingListId.value) {
      await shopping.updateList(editingListId.value, listForm.value)
    } else {
      await shopping.createList(listForm.value)
      const newestListId = shopping.lists[0]?.id
      if (newestListId) {
        await router.push(`/lists/${newestListId}`)
      }
    }
    await closeEditor({ force: true })
  } catch (error) {
    listError.value = error instanceof Error ? error.message : 'Nie udało się zapisać listy.'
  } finally {
    savingList.value = false
  }
}

const removeList = async () => {
  if (!shopping.selectedList) return
  if (!window.confirm(`Usunąć listę "${shopping.selectedList.name}"?`)) return
  try {
    const removedListId = shopping.selectedList.id
    await shopping.deleteList(removedListId)
    if (route.params.listId === removedListId) {
      await goToLists()
    }
  } catch (error) {
    listError.value = error instanceof Error ? error.message : 'Nie udało się usunąć listy.'
  }
}

const addContactToList = async (userId: string) => {
  memberError.value = ''
  memberSuccess.value = ''
  addingContactToList.value = true
  try {
    const storeWithActions = shopping as typeof shopping & {
      addMemberFromContacts?: (id: string) => Promise<void>
      inviteMember?: (id: string) => Promise<void>
    }

    if (typeof storeWithActions.addMemberFromContacts === 'function') {
      await storeWithActions.addMemberFromContacts(userId)
    } else if (typeof storeWithActions.inviteMember === 'function') {
      await storeWithActions.inviteMember(userId)
    } else {
      throw new Error('Store nie ma akcji dodawania współpracownika. Odśwież aplikację.')
    }

    memberSuccess.value = 'Użytkownik został dodany do listy.'
    showContactsPickerPopup.value = false
  } catch (error) {
    memberError.value = error instanceof Error ? error.message : 'Nie udało się dodać użytkownika do listy.'
  } finally {
    addingContactToList.value = false
  }
}

const removeMember = async (userId: string) => {
  memberError.value = ''
  memberSuccess.value = ''
  try {
    await shopping.removeMember(userId)
    memberSuccess.value = 'Użytkownik został usunięty z listy.'
  } catch (error) {
    memberError.value = error instanceof Error ? error.message : 'Nie udało się usunąć użytkownika z listy.'
  }
}

const removeListFromSettings = async () => {
  await removeList()
}

const openCreateItem = () => {
  editingItemId.value = null
  itemError.value = ''
  resetItemForm()
  editorMode.value = 'new-item'
}

const openEditItem = (itemId: string) => {
  const item = shopping.items.find((entry) => entry.id === itemId)
  if (!item) return
  editingItemId.value = itemId
  itemError.value = ''
  itemForm.value = {
    name: item.name,
    quantity: item.quantity,
    conditionType: item.conditionType ?? '',
  }
  editorMode.value = 'edit-item'
}

const submitItem = async () => {
  if (!shopping.selectedList) return
  if (!itemForm.value.name.trim()) {
    itemError.value = 'Podaj nazwę produktu.'
    return
  }
  if (itemForm.value.quantity <= 0) {
    itemError.value = 'Ilość musi być większa od zera.'
    return
  }

  itemError.value = ''
  savingItem.value = true
  try {
    if (editingItemId.value) {
      await shopping.updateItem(editingItemId.value, {
        ...itemForm.value,
        conditionType: itemForm.value.conditionType || null,
      })
    } else {
      await shopping.createItem({
        listId: shopping.selectedList.id,
        ...itemForm.value,
        conditionType: itemForm.value.conditionType || null,
      })
    }
    await closeEditor({ force: true })
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : 'Nie udało się zapisać produktu.'
  } finally {
    savingItem.value = false
  }
}

const toggleItem = async (itemId: string, completed: boolean) => {
  try {
    await shopping.toggleItem(itemId, completed)
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : 'Nie udało się zmienić statusu.'
  }
}

const removeItem = async (itemId: string) => {
  if (!window.confirm('Usunąć tę pozycję z listy?')) return
  try {
    await shopping.deleteItem(itemId)
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : 'Nie udało się usunąć pozycji.'
  }
}

const removeItemFromPopup = async () => {
  if (!editingItemId.value) return
  itemError.value = ''
  try {
    await shopping.deleteItem(editingItemId.value)
    await closeEditor({ force: true })
  } catch (error) {
    itemError.value = error instanceof Error ? error.message : 'Nie udało się usunąć pozycji.'
  }
}

onMounted(() => {
  void Promise.allSettled([settings.loadProfile(), syncSelectedList()]).then(() => {
    resetItemForm()
  })
})

watch(
  () => shopping.selectedList,
  (nextList) => {
    if (nextList) {
      displayedList.value = nextList
    }
  },
)

watch(
  () => route.params.listId,
  () => {
    displayedList.value = null
    editorMode.value = route.query.mode === 'new-list' ? 'new-list' : 'view'
    void syncSelectedList()
  },
)

watch(
  () => route.query.mode,
  (mode) => {
    if (mode === 'new-list') {
      editingListId.value = null
      listError.value = ''
      resetListForm()
      editorMode.value = 'new-list'
      return
    }

    if (editorMode.value === 'new-list') {
      editorMode.value = 'view'
    }
  },
  { immediate: true },
)
</script>

<style scoped></style>
