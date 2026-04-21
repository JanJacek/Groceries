<template>
  <header class="relative z-40 border-b border-border bg-surface/90 backdrop-blur-sm">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
      <div class="flex min-w-0 items-center gap-3 md:gap-4">
        <router-link
          to="/"
          class="flex shrink-0 items-center gap-3 font-serif text-2xl font-semibold tracking-tight text-text"
        >
          <svg
            class="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path :d="mdiBasketOutline" />
          </svg>
          <span class="hidden sm:inline">Groceries</span>
        </router-link>

        <div class="flex min-w-0 items-center gap-2">
          <FSelect
            :model-value="activeListId"
            :options="listOptions"
            aria-label="Wybierz listę"
            placeholder="Brak list"
            wrapper-class="min-w-[112px] max-w-[160px] sm:min-w-[160px] sm:max-w-[220px] md:min-w-[240px] md:max-w-[280px]"
            :trigger-class="selectTriggerClass"
            menu-class="max-h-80 overflow-y-auto"
            @update:model-value="onSelectList"
          />

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
    :open="Boolean(pendingListForReview)"
    title="Zaproszenie do listy"
    confirm-text="Akceptuj"
    cancel-text="Odrzuć"
    :loading="respondingToInvitation"
    :cancel-is-close="false"
    @close="closePendingInvitationPopup"
    @cancel="rejectPendingInvitation"
    @confirm="acceptPendingInvitation"
  >
    <p class="m-0 text-sm text-text">
      Otrzymano zaproszenie do listy
      <strong>{{ pendingListForReview?.name }}</strong>.
      Zanim wejdziesz do tej listy, zaakceptuj lub odrzuć zaproszenie.
    </p>
  </FPopup>
</template>

<script setup lang="ts">
import { mdiBasketOutline, mdiPlus } from '@mdi/js'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FButton from '@/components/FButton.vue'
import FPopup from '@/components/FPopup.vue'
import FSelect from '@/components/FSelect.vue'
import FUserMenu from '@/components/FUserMenu.vue'
import { type ShoppingList, useShoppingStore } from '@/stores/shopping'

const route = useRoute()
const router = useRouter()
const shopping = useShoppingStore()
const respondingToInvitation = ref(false)
const pendingListForReview = ref<ShoppingList | null>(null)

const activeListId = computed(() => {
  if (typeof route.params.listId === 'string') return route.params.listId
  if (shopping.selectedListId && shopping.activeLists.some((list) => list.id === shopping.selectedListId)) {
    return shopping.selectedListId
  }
  return shopping.activeLists[0]?.id ?? shopping.lists[0]?.id ?? ''
})

const listOptions = computed(() =>
  shopping.lists.map((list) => ({
    label: list.name,
    value: list.id,
    pending: list.accessStatus === 'pending',
  })),
)

const selectTriggerClass = computed(() =>
  [
    'h-10 px-3 py-2',
    shopping.hasPendingListInvitations ? 'notification-pulse border-primary/50' : '',
  ].join(' ').trim(),
)

const onSelectList = async (value: string) => {
  if (!value) return
  const targetList = shopping.lists.find((list) => list.id === value)
  if (!targetList) return

  if (targetList.accessStatus === 'pending') {
    pendingListForReview.value = targetList
    return
  }

  await router.push(`/lists/${value}`)
}

const closePendingInvitationPopup = () => {
  if (respondingToInvitation.value) return
  pendingListForReview.value = null
}

const acceptPendingInvitation = async () => {
  if (!pendingListForReview.value) return
  respondingToInvitation.value = true
  try {
    const acceptedListId = pendingListForReview.value.id
    await shopping.respondToInvitation(acceptedListId, true)
    pendingListForReview.value = null
    await router.push(`/lists/${acceptedListId}`)
  } finally {
    respondingToInvitation.value = false
  }
}

const rejectPendingInvitation = async () => {
  if (!pendingListForReview.value) return
  respondingToInvitation.value = true
  try {
    await shopping.respondToInvitation(pendingListForReview.value.id, false)
    pendingListForReview.value = null
  } finally {
    respondingToInvitation.value = false
  }
}

const openCreateList = () => {
  const currentListId =
    typeof route.params.listId === 'string' ? route.params.listId : shopping.lists[0]?.id

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
