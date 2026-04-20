import { computed, ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'goceries.theme'
const theme = ref<ThemeMode>('dark')

const applyTheme = (value: ThemeMode) => {
  theme.value = value
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = value
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}

export const initializeTheme = () => {
  if (typeof window === 'undefined') return
  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  if (storedTheme === 'dark' || storedTheme === 'light') {
    applyTheme(storedTheme)
    return
  }

  applyTheme('dark')
}

export const useTheme = () => {
  const toggleTheme = () => {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: computed(() => theme.value),
    isDarkTheme: computed(() => theme.value === 'dark'),
    toggleTheme,
    setTheme: applyTheme,
  }
}
