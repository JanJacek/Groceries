<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard px-6 py-6">
    <section class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <FShoppingSidebar
        :lists="shopping.lists"
        :selected-id="shopping.selectedListId"
        :loading="shopping.loadingLists"
        @create="openCreateList"
        @select="selectList"
        @settings="openListSettings"
      />

      <div class="grid gap-6">
        <template v-if="shopping.selectedList">
          <FCard custom-class="overflow-hidden p-0">
            <div class="grid gap-5 bg-surface p-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div class="mb-2 flex items-center gap-3">
                    <span
                      class="h-3 w-3 rounded-full"
                      :style="{ backgroundColor: listColor }"
                    />
                    <h1 class="m-0 text-3xl text-text">{{ shopping.selectedList.name }}</h1>
                    <span
                      class="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                      :title="memberCountLabel"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path :d="memberCountIcon" />
                      </svg>
                      {{ shopping.members.length }}
                    </span>
                  </div>
                  <p class="m-0 max-w-2xl text-sm text-muted">
                    {{ shopping.selectedList.note || 'Lista bez notatki. Dodaj opis, aby szybciej rozpoznać cel zakupów.' }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <FButton
                    type="button"
                    variant="ghost"
                    bordered
                    icon-only
                    :icon="mdiCogOutline"
                    aria-label="Ustawienia listy"
                    @click="openListSettings(shopping.selectedList.id)"
                  />
                  <FButton type="button" @click="openCreateItem">Dodaj produkt</FButton>
                </div>
              </div>
            </div>
          </FCard>

          <FCard custom-class="grid gap-4">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="grid gap-1 text-sm text-text">
                  Status
                  <FSelect v-model="statusFilter" :options="statusOptions" />
                </label>
                <label class="grid gap-1 text-sm text-text">
                  Kategoria
                  <FSelect v-model="categoryFilter" :options="categoryOptions" />
                </label>
              </div>
              <p class="m-0 text-sm text-muted">
                {{ filteredItems.length }} z {{ shopping.items.length }} pozycji
              </p>
            </div>

            <div v-if="shopping.loadingItems" class="text-sm text-muted">Ładowanie produktów...</div>
            <div
              v-else-if="!shopping.items.length"
              class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
            >
              Ta lista jest pusta. Dodaj pierwszy produkt, żeby zacząć.
            </div>
            <div
              v-else-if="!filteredItems.length"
              class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
            >
              Brak pozycji dla wybranych filtrów.
            </div>
            <FShoppingItemTable
              v-else
              :rows="filteredItems"
              :currency="settings.preferredCurrency"
              :compact="settings.compactView"
              @toggle="toggleItem"
              @edit="openEditItem"
              @delete="removeItem"
            />
          </FCard>
        </template>

        <FCard v-else custom-class="grid gap-4 p-8 text-center">
          <h1 class="m-0 text-3xl text-text">Stwórz pierwszą listę zakupów</h1>
          <p class="m-0 text-sm text-muted">
            Oddziel listy na codzienne zakupy, większe uzupełnienia i specjalne okazje.
          </p>
          <div>
            <FButton type="button" @click="openCreateList">Utwórz listę</FButton>
          </div>
        </FCard>
      </div>
    </section>

    <FPopup
      :open="showListPopup"
      :loading="savingList"
      :title="editingListId ? 'Edytuj listę' : 'Nowa lista'"
      confirm-text="Zapisz"
      cancel-text="Anuluj"
      @close="closeListPopup"
      @confirm="submitList"
    >
      <div class="grid gap-4">
        <label class="grid gap-1 text-sm text-text">
          Nazwa
          <input v-model="listForm.name" type="text" class="rounded-[10px] border border-border px-3 py-2 text-text outline-none" />
        </label>
        <label class="grid gap-1 text-sm text-text">
          Notatka
          <textarea
            v-model="listForm.note"
            rows="3"
            class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
          ></textarea>
        </label>
        <label class="grid gap-1 text-sm text-text">
          Kolor
          <FSelect v-model="listForm.colorToken" :options="listColorOptions" />
        </label>
        <label class="flex items-center gap-2 text-sm text-text">
          <input v-model="listForm.archived" type="checkbox" class="h-4 w-4 rounded border-border" />
          Oznacz listę jako archiwalną
        </label>
        <FMessage v-if="listError" variant="error">{{ listError }}</FMessage>
      </div>
    </FPopup>

    <FPopup
      :open="showListSettingsPopup"
      title="Opcje listy"
      confirm-text="Zamknij"
      cancel-text="Wróć"
      @close="closeListSettingsPopup"
      @confirm="closeListSettingsPopup"
    >
      <div class="grid gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="m-0 text-lg font-semibold text-text">{{ settingsList?.name }}</p>
            <p class="mt-1 text-sm text-muted">
              {{ settingsList?.currentUserRole === 'owner' ? 'Właściciel listy' : 'Współpracownik listy' }}
            </p>
          </div>
          <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {{ settingsList?.currentUserRole === 'owner' ? 'Właściciel' : 'Edytor' }}
          </span>
        </div>

        <div class="grid gap-2">
          <FButton
            v-if="settingsList?.currentUserRole === 'owner'"
            type="button"
            variant="ghost"
            bordered
            custom-class="justify-start"
            :icon="mdiAccountPlusOutline"
            @click="openContactsPicker"
          >
            Dodaj znajomego
          </FButton>
          <FButton
            type="button"
            variant="ghost"
            bordered
            custom-class="justify-start"
            :icon="mdiPencilOutline"
            @click="openEditListFromSettings"
          >
            Edytuj listę
          </FButton>
          <FButton
            v-if="settingsList?.currentUserRole === 'owner'"
            type="button"
            variant="ghost"
            bordered
            custom-class="justify-start"
            :icon="mdiTrashCanOutline"
            @click="removeListFromSettings"
          >
            Usuń listę
          </FButton>
        </div>

        <FMessage v-if="memberError" variant="error">{{ memberError }}</FMessage>
        <FMessage v-if="memberSuccess" variant="success">{{ memberSuccess }}</FMessage>

        <div v-if="shopping.loadingMembers" class="text-sm text-muted">Ładowanie współpracowników...</div>
        <div v-else class="grid gap-3">
          <div
            v-for="member in shopping.members"
            :key="member.userId"
            class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border p-4"
          >
            <div class="flex items-center gap-3">
              <FAvatar :text="member.avatarInitials || member.email" />
              <div>
                <p class="m-0 font-semibold text-text">
                  {{ member.email }}
                  <span v-if="member.isCurrentUser" class="text-sm font-normal text-muted">(Ty)</span>
                </p>
                <p class="mt-1 text-sm text-muted">
                  {{ member.role === 'owner' ? 'Właściciel listy' : 'Może edytować listę i produkty' }}
                </p>
              </div>
            </div>
            <FButton
              v-if="shopping.canManageSelectedListMembers && !member.isCurrentUser && member.role !== 'owner'"
              type="button"
              size="sm"
              variant="ghost"
              bordered
              @click="removeMember(member.userId)"
            >
              Usuń
            </FButton>
          </div>
        </div>
      </div>
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
        <div
          v-else-if="!contacts.contacts.length"
          class="rounded-[14px] border border-dashed border-border p-4 text-sm text-muted"
        >
          Najpierw dodaj kontakty z menu avatara: `Kontakty`.
        </div>
        <div v-else-if="!availableContacts.length" class="rounded-[14px] border border-dashed border-border p-4 text-sm text-muted">
          Wszyscy Twoi znajomi z kontaktów są już na tej liście.
        </div>
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

    <FPopup
      :open="showItemPopup"
      :loading="savingItem"
      :title="editingItemId ? 'Edytuj produkt' : 'Nowy produkt'"
      confirm-text="Zapisz"
      cancel-text="Anuluj"
      @close="closeItemPopup"
      @confirm="submitItem"
    >
      <div class="grid gap-4">
        <label class="grid gap-1 text-sm text-text">
          Nazwa
          <input v-model="itemForm.name" type="text" class="rounded-[10px] border border-border px-3 py-2 text-text outline-none" />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1 text-sm text-text">
            Ilość
            <input
              v-model.number="itemForm.quantity"
              type="number"
              min="0.01"
              step="0.01"
              class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
            />
          </label>
          <label class="grid gap-1 text-sm text-text">
            Jednostka
            <FSelect v-model="itemForm.unit" :options="unitOptions" />
          </label>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-1 text-sm text-text">
            Kategoria
            <input v-model="itemForm.category" type="text" class="rounded-[10px] border border-border px-3 py-2 text-text outline-none" />
          </label>
          <label class="grid gap-1 text-sm text-text">
            Cena szacunkowa
            <input
              v-model.number="itemForm.estimatedPrice"
              type="number"
              min="0"
              step="0.01"
              class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
            />
          </label>
        </div>
        <label class="grid gap-1 text-sm text-text">
          Notatka
          <textarea
            v-model="itemForm.note"
            rows="3"
            class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
          ></textarea>
        </label>
        <FMessage v-if="itemError" variant="error">{{ itemError }}</FMessage>
      </div>
    </FPopup>
  </main>
</template>

<script setup lang="ts">
import {
  mdiAccountGroupOutline,
  mdiAccountMultipleOutline,
  mdiAccountOutline,
  mdiAccountPlusOutline,
  mdiCogOutline,
  mdiPencilOutline,
  mdiTrashCanOutline,
} from '@mdi/js'
import { computed, onMounted, ref } from 'vue'
import FAvatar from '@/components/FAvatar.vue'
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FMessage from '@/components/FMessage.vue'
import FPopup from '@/components/FPopup.vue'
import FSelect from '@/components/FSelect.vue'
import FShoppingItemTable from '@/components/FShoppingItemTable.vue'
import FShoppingSidebar from '@/components/FShoppingSidebar.vue'
import { useContactsStore } from '@/stores/contacts'
import { useSettingsStore } from '@/stores/settings'
import { useShoppingStore } from '@/stores/shopping'

const settings = useSettingsStore()
const shopping = useShoppingStore()
const contacts = useContactsStore()

const showListPopup = ref(false)
const showListSettingsPopup = ref(false)
const showContactsPickerPopup = ref(false)
const showItemPopup = ref(false)
const savingList = ref(false)
const savingItem = ref(false)
const addingContactToList = ref(false)
const editingListId = ref<string | null>(null)
const editingItemId = ref<string | null>(null)
const settingsListId = ref<string | null>(null)
const listError = ref('')
const itemError = ref('')
const memberError = ref('')
const memberSuccess = ref('')
const statusFilter = ref<'all' | 'open' | 'done'>('all')
const categoryFilter = ref('all')

const listForm = ref({
  name: '',
  note: '',
  colorToken: 'sage',
  archived: false,
})

const itemForm = ref<{
  name: string
  quantity: number
  unit: string
  category: string
  note: string
  estimatedPrice: number | null
}>({
  name: '',
  quantity: 1,
  unit: settings.defaultUnit,
  category: '',
  note: '',
  estimatedPrice: null as number | null,
})

const listColorMap: Record<string, string> = {
  sage: '#84a98c',
  tomato: '#d97706',
  berry: '#be185d',
  ocean: '#0f766e',
  charcoal: '#44403c',
}

const listColorOptions = [
  { label: 'Sage', value: 'sage' },
  { label: 'Tomato', value: 'tomato' },
  { label: 'Berry', value: 'berry' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Charcoal', value: 'charcoal' },
]

const statusOptions = [
  { label: 'Wszystkie', value: 'all' },
  { label: 'Do kupienia', value: 'open' },
  { label: 'Kupione', value: 'done' },
]

const unitOptions = computed(() => settings.availableUnits.map((value) => ({ label: value, value })))

const categoryOptions = computed(() => {
  const categories = Array.from(
    new Set(shopping.items.map((item) => item.category.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))

  return [{ label: 'Wszystkie', value: 'all' }, ...categories.map((value) => ({ label: value, value }))]
})

const filteredItems = computed(() =>
  shopping.items.filter((item) => {
    if (statusFilter.value === 'open' && item.isCompleted) return false
    if (statusFilter.value === 'done' && !item.isCompleted) return false
    if (categoryFilter.value !== 'all' && item.category !== categoryFilter.value) return false
    return true
  }),
)

const listColor = computed(() =>
  listColorMap[shopping.selectedList?.colorToken ?? 'sage'] ?? listColorMap.sage,
)
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
const settingsList = computed(
  () => shopping.lists.find((list) => list.id === settingsListId.value) ?? null,
)
const availableContacts = computed(() => {
  const memberIds = new Set(shopping.members.map((member) => member.userId))
  return contacts.contacts.filter((contact) => !memberIds.has(contact.userId))
})

const resetListForm = () => {
  listForm.value = {
    name: '',
    note: '',
    colorToken: 'sage',
    archived: false,
  }
}

const resetItemForm = () => {
  itemForm.value = {
    name: '',
    quantity: 1,
    unit: settings.defaultUnit,
    category: '',
    note: '',
    estimatedPrice: null,
  }
}

const selectList = async (id: string) => {
  await Promise.all([shopping.loadItems(id), shopping.loadMembers(id)])
}

const openListSettings = async (listId: string) => {
  settingsListId.value = listId
  memberError.value = ''
  memberSuccess.value = ''
  await selectList(listId)
  showListSettingsPopup.value = true
}

const closeListSettingsPopup = () => {
  showListSettingsPopup.value = false
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
  showListPopup.value = true
}

const openEditList = () => {
  if (!shopping.selectedList) return
  editingListId.value = shopping.selectedList.id
  listError.value = ''
  listForm.value = {
    name: shopping.selectedList.name,
    note: shopping.selectedList.note,
    colorToken: shopping.selectedList.colorToken,
    archived: shopping.selectedList.archived,
  }
  showListPopup.value = true
}

const closeListPopup = () => {
  if (savingList.value) return
  showListPopup.value = false
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
    }
    showListPopup.value = false
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
    await shopping.deleteList(shopping.selectedList.id)
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

const openEditListFromSettings = () => {
  closeListSettingsPopup()
  openEditList()
}

const removeListFromSettings = async () => {
  closeListSettingsPopup()
  await removeList()
}

const openCreateItem = () => {
  editingItemId.value = null
  itemError.value = ''
  resetItemForm()
  showItemPopup.value = true
}

const openEditItem = (itemId: string) => {
  const item = shopping.items.find((entry) => entry.id === itemId)
  if (!item) return
  editingItemId.value = itemId
  itemError.value = ''
  itemForm.value = {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    note: item.note,
    estimatedPrice: item.estimatedPrice,
  }
  showItemPopup.value = true
}

const closeItemPopup = () => {
  if (savingItem.value) return
  showItemPopup.value = false
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
      await shopping.updateItem(editingItemId.value, itemForm.value)
    } else {
      await shopping.createItem({
        listId: shopping.selectedList.id,
        ...itemForm.value,
      })
    }
    showItemPopup.value = false
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

onMounted(() => {
  void Promise.allSettled([settings.loadProfile(), shopping.loadLists()]).then(() => {
    resetItemForm()
  })
})
</script>

<style scoped></style>
