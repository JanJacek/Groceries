<template>
  <header class="border-b border-border bg-surface/90 backdrop-blur-sm">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
      <div class="flex items-center">
        <router-link to="/" class="flex items-center gap-3 font-serif text-2xl font-bold tracking-tight text-text">
          <svg class="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiBasketOutline" />
          </svg>
          groceries
        </router-link>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition hover:bg-primary/10 hover:text-text"
          :aria-label="isDarkTheme ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'"
          @click="toggleTheme"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="isDarkTheme ? mdiWhiteBalanceSunny : mdiMoonWaningCrescent" />
          </svg>
        </button>
        <FUserMenu />
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { mdiBasketOutline, mdiMoonWaningCrescent, mdiWhiteBalanceSunny } from '@mdi/js'
import { useTheme } from '@/composables/useTheme'
import FUserMenu from '@/components/FUserMenu.vue'

const { isDarkTheme, toggleTheme } = useTheme()
</script>

<style scoped></style>
