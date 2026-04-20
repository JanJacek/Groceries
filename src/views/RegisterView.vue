<template>
  <main class="grid min-h-screen place-items-center bg-auth p-6">
    <FCard as="form" custom-class="grid max-w-[420px] gap-3" @submit.prevent="onSubmit">
      <h1 class="mb-[6px] mt-0 text-[2em] font-bold leading-tight text-text">Nowe konto</h1>
      <p class="m-0 text-sm text-muted">Twórz osobne listy zakupów i trzymaj wszystko w jednym miejscu.</p>

      <FField label="Email">
        <FInput
          v-model="email"
          type="email"
          autocomplete="email"
          required
        />
      </FField>

      <FField label="Hasło">
        <FInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          :minlength="6"
          required
        />
      </FField>

      <FMessage v-if="errorMsg" variant="error">{{ errorMsg }}</FMessage>
      <FMessage v-if="successMsg" variant="success">{{ successMsg }}</FMessage>

      <FButton :disabled="loading" type="submit">
        {{ loading ? 'Tworzenie konta...' : 'Utwórz konto' }}
      </FButton>

      <router-link to="/login" class="text-muted hover:text-primary">
        Masz już konto? Zaloguj się
      </router-link>
    </FCard>

    <FPopup
      :open="showRiskPopup"
      :loading="loading"
      title="Założyć konto?"
      confirm-text="Utwórz konto"
      cancel-text="Wróć"
      @close="showRiskPopup = false"
      @confirm="confirmRegistration"
    >
      <p class="m-0">
        Konto posłuży do zapisywania list zakupów, ustawień widoku i historii pozycji.
      </p>
      <p class="mt-3">
        Kontynuując, akceptujesz
        <router-link to="/terms" class="text-primary hover:underline">regulaminem</router-link>.
        i
        <router-link to="/privacy" class="text-primary hover:underline">polityką prywatności</router-link>.
      </p>
    </FPopup>
  </main>
</template>

<script setup lang="ts">
import FButton from '@/components/FButton.vue'
import FCard from '@/components/FCard.vue'
import FField from '@/components/FField.vue'
import FInput from '@/components/FInput.vue'
import FMessage from '@/components/FMessage.vue'
import FPopup from '@/components/FPopup.vue'
import { useAuthStore } from '@/stores/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const showRiskPopup = ref(false)

const onSubmit = () => {
  errorMsg.value = ''
  successMsg.value = ''
  showRiskPopup.value = true
}

const confirmRegistration = async () => {
  showRiskPopup.value = false
  loading.value = true

  try {
    await auth.signUp(email.value, password.value)
    successMsg.value = 'Konto utworzone. Możesz się zalogować.'
    await router.push('/login')
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Nie udało się zarejestrować.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped></style>
