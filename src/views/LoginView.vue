<template>
  <main class="grid min-h-screen place-items-center bg-auth p-6">
    <FCard as="form" custom-class="grid max-w-[420px] gap-3" @submit.prevent="onSubmit">
      <h1 class="mb-[6px] mt-0 text-[2em] font-bold leading-tight text-text">Wróć do swoich list</h1>
      <p class="m-0 text-sm text-muted">Zaloguj się, żeby planować zakupy i odhaczać produkty.</p>

      <FField label="Email">
        <FInput v-model="email" type="email" autocomplete="email" required />
      </FField>

      <FField label="Hasło">
        <FInput v-model="password" type="password" autocomplete="current-password" required />
      </FField>

      <FMessage v-if="errorMsg" variant="error">{{ errorMsg }}</FMessage>

      <FButton :disabled="loading" type="submit">
        {{ loading ? 'Logowanie...' : 'Zaloguj się' }}
      </FButton>

      <router-link to="/register" class="text-muted hover:text-primary">
        Nie masz konta? Załóż je w minutę
      </router-link>
    </FCard>
  </main>
</template>

<script setup lang="ts">
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FField from '@/components/FField.vue'
import FInput from '@/components/FInput.vue'
import FMessage from '@/components/FMessage.vue'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const onSubmit = async () => {
  errorMsg.value = ''
  loading.value = true

  try {
    await auth.signIn(email.value, password.value)
    await router.push('/')
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Nie udało się zalogować.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped></style>
