<template>
  <aside class="rounded-[20px] border border-border bg-surface p-4 shadow-card">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="m-0 text-lg text-text">Listy zakupów</h2>
        <p class="m-0 text-sm text-muted">Prywatne i współdzielone listy w jednym miejscu.</p>
      </div>
      <FButton type="button" size="sm" @click="$emit('create')">Nowa</FButton>
    </div>

    <div v-if="loading" class="text-sm text-muted">Ładowanie list...</div>
    <div v-else-if="!lists.length" class="rounded-[14px] border border-dashed border-border p-4 text-sm text-muted">
      Nie masz jeszcze żadnej listy.
    </div>
    <div v-else class="grid gap-2">
      <button
        v-for="list in lists"
        :key="list.id"
        type="button"
        class="rounded-[14px] border p-3 text-left transition"
        :class="list.id === selectedId ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-primary/5'"
        @click="$emit('select', list.id)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span
              class="h-3 w-3 rounded-full"
              :style="{ backgroundColor: colors[list.colorToken] ?? colors.sage }"
            />
            <span class="font-semibold text-text">{{ list.name }}</span>
          </div>
          <FButton
            type="button"
            size="sm"
            variant="ghost"
            bordered
            icon-only
            :icon="mdiCogOutline"
            aria-label="Ustawienia listy"
            @click.stop="$emit('settings', list.id)"
          />
        </div>
        <p class="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {{ list.currentUserRole === 'owner' ? 'Właściciel' : 'Współdzielona' }}
        </p>
        <p v-if="list.note" class="mt-2 text-sm text-muted">{{ list.note }}</p>
        <p v-if="list.archived" class="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Archiwalna
        </p>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { mdiCogOutline } from '@mdi/js'
import FButton from '@/components/FButton.vue'
import type { ShoppingList } from '@/stores/shopping'

defineProps<{
  lists: ShoppingList[]
  selectedId: string | null
  loading?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'create'): void
  (e: 'settings', id: string): void
}>()

const colors: Record<string, string> = {
  sage: '#84a98c',
  tomato: '#d97706',
  berry: '#be185d',
  ocean: '#0f766e',
  charcoal: '#44403c',
}
</script>

<style scoped></style>
