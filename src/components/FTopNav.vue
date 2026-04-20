<template>
  <header class="border-b border-border bg-surface/90 backdrop-blur-sm">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
      <div class="flex min-w-0 items-center gap-3 md:gap-4">
        <router-link
          to="/"
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

</template>

<script setup lang="ts">
import { mdiBasketOutline, mdiPlus } from '@mdi/js'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FButton from '@/components/FButton.vue'
import FUserMenu from '@/components/FUserMenu.vue'
import { useShoppingStore } from '@/stores/shopping'

const route = useRoute()
const router = useRouter()
const shopping = useShoppingStore()

const activeListId = computed(() => {
  if (typeof route.params.listId === 'string') return route.params.listId
  if (shopping.selectedListId) return shopping.selectedListId
  return shopping.lists[0]?.id ?? ''
})

const onSelectList = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  if (!target.value) return
  await router.push(`/lists/${target.value}`)
}

const openCreateList = () => {
  const currentListId =
    typeof route.params.listId === 'string'
      ? route.params.listId
      : shopping.lists[0]?.id

  if (!currentListId) {
    void router.push({ path: '/', query: { mode: 'new-list' } })
    return
  }

  void router.push({
    path: `/lists/${currentListId}`,
    query: { ...route.query, mode: 'new-list' },
  })
}

onMounted(() => {
  if (!shopping.loadingLists && !shopping.lists.length) {
    void shopping.loadLists().catch(() => {})
  }
})
</script>

<style scoped></style>
