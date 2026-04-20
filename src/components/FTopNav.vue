<template>
  <header class="border-b border-border bg-surface/90 backdrop-blur-sm">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
      <div class="flex min-w-0 items-center gap-3 md:gap-4">
        <router-link
          to="/lists"
          class="flex shrink-0 items-center gap-3 font-serif text-2xl font-bold tracking-tight text-text"
        >
          <svg class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiBasketOutline" />
          </svg>
          <span class="hidden sm:inline">groceries</span>
        </router-link>

        <div class="flex min-w-0 items-center gap-2">
          <select
            :value="activeListId"
            class="h-10 min-w-[112px] max-w-[160px] rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text outline-none sm:min-w-[160px] sm:max-w-[220px] md:min-w-[240px] md:max-w-[280px]"
            aria-label="Wybierz listę"
            @change="onSelectList"
          >
            <option value="" disabled>{{ shopping.lists.length ? 'Wybierz listę' : 'Brak list' }}</option>
            <option v-for="list in shopping.lists" :key="list.id" :value="list.id">
              {{ list.name }}
            </option>
          </select>

          <FButton
            type="button"
            variant="ghost"
            bordered
            icon-only
            :icon="mdiPlus"
            aria-label="Nowa lista"
            @click="openCreateList"
          />
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <FUserMenu />
      </div>
    </nav>
  </header>

  <FPopup
    :open="showListPopup"
    :loading="savingList"
    title="Nowa lista"
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
</template>

<script setup lang="ts">
import { mdiBasketOutline, mdiPlus } from '@mdi/js'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FButton from '@/components/FButton.vue'
import FMessage from '@/components/FMessage.vue'
import FPopup from '@/components/FPopup.vue'
import FSelect from '@/components/FSelect.vue'
import FUserMenu from '@/components/FUserMenu.vue'
import { useShoppingStore } from '@/stores/shopping'

const route = useRoute()
const router = useRouter()
const shopping = useShoppingStore()

const showListPopup = ref(false)
const savingList = ref(false)
const listError = ref('')
const listForm = ref({
  name: '',
  note: '',
  colorToken: 'sage',
  archived: false,
})

const listColorOptions = [
  { label: 'Sage', value: 'sage' },
  { label: 'Tomato', value: 'tomato' },
  { label: 'Berry', value: 'berry' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Charcoal', value: 'charcoal' },
]

const activeListId = computed(() => {
  if (typeof route.params.listId === 'string') return route.params.listId
  if (shopping.selectedListId) return shopping.selectedListId
  return shopping.lists[0]?.id ?? ''
})

const resetListForm = () => {
  listForm.value = {
    name: '',
    note: '',
    colorToken: 'sage',
    archived: false,
  }
}

const onSelectList = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  if (!target.value) return
  await router.push(`/lists/${target.value}`)
}

const openCreateList = () => {
  listError.value = ''
  resetListForm()
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
    await shopping.createList(listForm.value)
    showListPopup.value = false

    const newestListId = shopping.lists[0]?.id
    if (newestListId) {
      await router.push(`/lists/${newestListId}`)
    }
  } catch (error) {
    listError.value = error instanceof Error ? error.message : 'Nie udało się zapisać listy.'
  } finally {
    savingList.value = false
  }
}

onMounted(() => {
  if (!shopping.loadingLists && !shopping.lists.length) {
    void shopping.loadLists().catch(() => {})
  }
})
</script>

<style scoped></style>
