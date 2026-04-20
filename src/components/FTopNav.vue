<template>
  <header class="border-b border-border bg-surface/90 backdrop-blur-sm">
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
      <div class="flex items-center gap-6">
        <router-link to="/" class="font-serif text-2xl font-bold tracking-tight text-text">
          goceries
        </router-link>
        <div class="hidden items-center gap-2 md:flex">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            v-slot="{ isActive }"
            :to="link.to"
          >
            <span
              :class="[
                'rounded-full px-3 py-1.5 text-sm transition',
                isActive ? 'bg-primary text-surface' : 'text-muted hover:bg-primary/10 hover:text-text',
              ]"
            >
              {{ link.label }}
            </span>
          </RouterLink>
        </div>
      </div>
      <FUserMenu />
    </nav>
  </header>
</template>

<script setup lang="ts">
import FUserMenu from '@/components/FUserMenu.vue'

const links = [
  { to: '/', label: 'Listy' },
  { to: '/settings', label: 'Ustawienia' },
]
</script>

<style scoped></style>
