<template>
  <div ref="menuRef" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-sm text-muted hover:bg-primary/5 hover:text-text"
      @click="toggleMenu"
    >
      <span class="hidden sm:inline">{{ auth.user?.email }}</span>
      <FAvatar :text="avatarText" />
    </button>

    <div
      v-if="isMenuOpen"
      class="absolute right-0 top-11 z-50 w-64 rounded-[12px] border border-border bg-surface p-1 shadow-card"
    >
      <div class="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2">
        <div class="flex items-center gap-2 text-sm text-text">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="isDarkTheme ? mdiMoonWaningCrescent : mdiWhiteBalanceSunny" />
          </svg>
          Motyw
        </div>
        <button
          type="button"
          class="relative inline-flex h-7 w-12 items-center rounded-full border border-border transition"
          :class="isDarkTheme ? 'bg-primary/20' : 'bg-primary/10'"
          :aria-label="isDarkTheme ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'"
          @click="toggleTheme"
        >
          <span
            class="absolute h-5 w-5 rounded-full bg-primary transition"
            :class="isDarkTheme ? 'left-6' : 'left-1'"
          ></span>
        </button>
      </div>

      <div class="mx-2 my-1 h-px bg-border"></div>

      <router-link
        to="/contacts"
        class="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-text hover:bg-primary/5"
        @click="closeMenu"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path :d="mdiAccountMultipleOutline" />
        </svg>
        Kontakty
      </router-link>

      <router-link
        to="/settings"
        class="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm text-text hover:bg-primary/5"
        @click="closeMenu"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path :d="mdiCogOutline" />
        </svg>
        Ustawienia
      </router-link>

      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-text hover:bg-primary/5"
        @click="logout"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path :d="mdiLogoutVariant" />
        </svg>
        Wyloguj
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  mdiAccountMultipleOutline,
  mdiCogOutline,
  mdiLogoutVariant,
  mdiMoonWaningCrescent,
  mdiWhiteBalanceSunny,
} from '@mdi/js'
import FAvatar from '@/components/FAvatar.vue'
import { useTheme } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const { isDarkTheme, toggleTheme } = useTheme()
const isMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const avatarText = computed(() => settings.avatarInitials || auth.user?.email || '')

const closeMenu = () => {
  isMenuOpen.value = false
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const onWindowClick = (event: MouseEvent) => {
  if (!menuRef.value) return
  if (menuRef.value.contains(event.target as Node)) return
  closeMenu()
}

const logout = async () => {
  closeMenu()
  await auth.signOut()
  await router.push('/login')
}

onMounted(() => {
  window.addEventListener('click', onWindowClick)
  void settings.loadProfile()
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onWindowClick)
})
</script>

<style scoped></style>
