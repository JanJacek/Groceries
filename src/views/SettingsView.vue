<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard p-6">
    <section class="mx-auto grid max-w-5xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="rounded-[16px] border border-border bg-surface p-3 shadow-card">
        <nav class="space-y-1">
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="flex w-full items-center rounded-[10px] px-3 py-2 text-left text-sm transition"
            :class="activeSection === section.id ? 'bg-primary text-surface' : 'text-text hover:bg-primary/10'"
            @click="activeSection = section.id"
          >
            {{ section.label }}
          </button>
        </nav>
      </aside>

      <section class="rounded-[20px] border border-border bg-surface p-6 shadow-card">
        <header class="mb-6">
          <h1 class="m-0 text-3xl text-text">Ustawienia</h1>
          <p class="mt-2 text-sm text-muted">Dostosuj sposób pracy z listami zakupów.</p>
        </header>

        <FMessage v-if="saveError" variant="error">{{ saveError }}</FMessage>
        <FMessage v-if="saveSuccess" variant="success">{{ saveSuccess }}</FMessage>

        <div v-if="activeSection === 'presentation'" class="grid gap-4">
          <div class="grid gap-2">
            <label class="text-sm font-semibold text-text">Waluta</label>
            <FSelect v-model="preferencesForm.preferredCurrency" :options="currencyOptions" />
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-semibold text-text">Domyślna jednostka</label>
            <FSelect v-model="preferencesForm.defaultUnit" :options="unitOptions" />
          </div>
          <label class="flex items-center gap-3 text-sm text-text">
            <input v-model="preferencesForm.compactView" type="checkbox" class="h-4 w-4 rounded border-border" />
            Zwarty widok tabeli produktów
          </label>
          <div>
            <FButton type="button" :disabled="saving" @click="savePreferences">
              {{ saving ? 'Zapisywanie...' : 'Zapisz preferencje' }}
            </FButton>
          </div>
        </div>

        <div v-else-if="activeSection === 'avatar'" class="grid gap-4">
          <p class="m-0 text-sm text-muted">Używane w menu użytkownika. Maksymalnie 2 litery.</p>
          <div class="flex flex-wrap items-end gap-3">
            <label class="grid gap-2 text-sm font-semibold text-text">
              Inicjały
              <input
                v-model="avatarForm"
                type="text"
                maxlength="2"
                class="w-24 rounded-[10px] border border-border bg-surface px-3 py-2 uppercase text-text outline-none"
              />
            </label>
            <FButton type="button" :disabled="avatarSaving" @click="saveAvatar">
              {{ avatarSaving ? 'Zapisywanie...' : 'Zapisz inicjały' }}
            </FButton>
          </div>
        </div>

        <div v-else class="grid gap-4">
          <p class="m-0 text-sm text-muted">
            Ta operacja usuwa konto. Twoje prywatne listy znikną, a współdzielone listy zostaną przekazane innemu członkowi albo usunięte, jeśli nie mają już uczestników.
          </p>
          <label class="grid gap-2 text-sm font-semibold text-text">
            Wpisz <span class="font-bold">USUN</span>, aby potwierdzić
            <input
              v-model="deleteConfirmText"
              type="text"
              maxlength="4"
              class="w-28 rounded-[10px] border border-border bg-surface px-3 py-2 uppercase text-text outline-none"
            />
          </label>
          <div>
            <FButton
              type="button"
              :disabled="deletingAccount || deleteConfirmText !== 'USUN'"
              @click="removeAccount"
            >
              {{ deletingAccount ? 'Usuwanie...' : 'Usuń konto' }}
            </FButton>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FButton from '@/components/FButton.vue'
import FMessage from '@/components/FMessage.vue'
import FSelect from '@/components/FSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const activeSection = ref<'presentation' | 'avatar' | 'account'>('presentation')
const saveError = ref('')
const saveSuccess = ref('')
const saving = ref(false)
const avatarSaving = ref(false)
const deletingAccount = ref(false)
const deleteConfirmText = ref('')
const avatarForm = ref('')
const preferencesForm = ref({
  preferredCurrency: settings.preferredCurrency,
  defaultUnit: settings.defaultUnit,
  compactView: settings.compactView,
})

const sections = [
  { id: 'presentation', label: 'Wygląd i format' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'account', label: 'Konto' },
] as const

const currencyOptions = computed(() =>
  settings.availableCurrencies.map((value) => ({ label: value, value })),
)
const unitOptions = computed(() =>
  settings.availableUnits.map((value) => ({ label: value, value })),
)

const syncForm = () => {
  preferencesForm.value = {
    preferredCurrency: settings.preferredCurrency,
    defaultUnit: settings.defaultUnit,
    compactView: settings.compactView,
  }
  avatarForm.value = settings.avatarInitials
}

const savePreferences = async () => {
  saveError.value = ''
  saveSuccess.value = ''
  saving.value = true
  try {
    await settings.savePreferences(preferencesForm.value)
    saveSuccess.value = 'Preferencje zapisane.'
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Nie udało się zapisać preferencji.'
  } finally {
    saving.value = false
  }
}

const saveAvatar = async () => {
  saveError.value = ''
  saveSuccess.value = ''
  avatarSaving.value = true
  try {
    await settings.saveAvatarInitials(avatarForm.value)
    avatarForm.value = settings.avatarInitials
    saveSuccess.value = 'Inicjały zapisane.'
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Nie udało się zapisać inicjałów.'
  } finally {
    avatarSaving.value = false
  }
}

const removeAccount = async () => {
  if (deleteConfirmText.value !== 'USUN') return
  saveError.value = ''
  saveSuccess.value = ''
  deletingAccount.value = true
  try {
    await auth.deleteAccount()
    await router.replace('/login')
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'Nie udało się usunąć konta.'
  } finally {
    deletingAccount.value = false
  }
}

onMounted(() => {
  void settings.loadProfile().then(syncForm).catch((error) => {
    saveError.value = error instanceof Error ? error.message : 'Nie udało się pobrać ustawień.'
  })
})
</script>

<style scoped></style>
