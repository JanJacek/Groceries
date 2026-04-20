<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard px-4 py-4 md:px-6 md:py-6">
    <section class="mx-auto grid max-w-6xl gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="m-0 text-3xl text-text">Wszystkie listy</h1>
          <p class="mt-2 text-sm text-muted">Wybierz listę, żeby przejść do szczegółów zakupów.</p>
        </div>
        <FButton type="button" @click="openCreateList">Nowa lista</FButton>
      </div>

      <div v-if="shopping.loadingLists" class="text-sm text-muted">Ładowanie list...</div>
      <div
        v-else-if="!shopping.lists.length"
        class="rounded-[14px] border border-dashed border-border bg-surface p-6 text-sm text-muted"
      >
        Nie masz jeszcze żadnej listy. Utwórz pierwszą, żeby zacząć.
      </div>
      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="list in shopping.lists"
          :key="list.id"
          type="button"
          class="rounded-[16px] border border-border bg-surface p-4 text-left shadow-card transition hover:border-primary/40 hover:bg-primary/5"
          @click="openList(list.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="m-0 text-lg font-semibold text-text">{{ list.name }}</p>
              <p class="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {{ list.currentUserRole === 'owner' ? 'Właściciel' : 'Współdzielona' }}
              </p>
            </div>
            <span
              v-if="list.archived"
              class="rounded-full border border-border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted"
            >
              Archiwalna
            </span>
          </div>
          <p v-if="list.note" class="mt-3 text-sm text-muted">{{ list.note }}</p>
        </button>
      </div>
    </section>

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
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FButton from '@/components/FButton.vue'
import FMessage from '@/components/FMessage.vue'
import FPopup from '@/components/FPopup.vue'
import FSelect from '@/components/FSelect.vue'
import { useShoppingStore } from '@/stores/shopping'

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

const resetListForm = () => {
  listForm.value = {
    name: '',
    note: '',
    colorToken: 'sage',
    archived: false,
  }
}

const openList = async (listId: string) => {
  await router.push(`/lists/${listId}`)
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
  } catch (error) {
    listError.value = error instanceof Error ? error.message : 'Nie udało się zapisać listy.'
  } finally {
    savingList.value = false
  }
}

onMounted(() => {
  void shopping.loadLists().catch((error) => {
    listError.value = error instanceof Error ? error.message : 'Nie udało się pobrać list.'
  })
})
</script>

<style scoped></style>
