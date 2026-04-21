<template>
  <main class="min-h-[calc(100vh-4rem)] bg-dashboard p-6">
    <section class="mx-auto grid max-w-5xl gap-6">
      <section class="rounded-[20px] border border-border bg-surface p-6 shadow-card">
        <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="m-0 text-3xl text-text">Lista kontaktów</h1>
            <p class="mt-2 text-sm text-muted">
              Zarządzaj osobami, które możesz szybko dodawać do współdzielonych list zakupów.
            </p>
          </div>
        </header>

        <div class="grid gap-4">
          <div class="flex flex-wrap items-end gap-3 rounded-[14px] border border-border p-4">
            <label class="grid min-w-[240px] flex-1 gap-1 text-sm text-text">
              Dodaj kontakt po e-mailu
              <input
                v-model="contactEmail"
                type="email"
                placeholder="np. anna@example.com"
                class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
              />
            </label>
            <FButton type="button" :disabled="saving" @click="submitContact">
              {{ saving ? 'Dodawanie...' : 'Dodaj kontakt' }}
            </FButton>
          </div>

          <FMessage v-if="messageError" variant="error">{{ messageError }}</FMessage>
          <FMessage v-if="messageSuccess" variant="success">{{ messageSuccess }}</FMessage>

          <div v-if="contacts.loading" class="text-sm text-muted">Ładowanie kontaktów...</div>
          <div v-if="!contacts.loading && contacts.receivedInvitations.length" class="grid gap-3">
            <h2 class="m-0 text-xl text-text">Zaproszenia do kontaktów</h2>
            <div
              v-for="invitation in contacts.receivedInvitations"
              :key="invitation.invitationId"
              class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-primary/40 bg-primary/5 p-4"
            >
              <div class="flex items-center gap-3">
                <FAvatar :text="invitation.avatarInitials || invitation.email" />
                <div>
                  <p class="m-0 font-semibold text-text">{{ invitation.email }}</p>
                  <p class="mt-1 text-sm text-muted">Ten użytkownik chce dodać Cię do kontaktów.</p>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <FButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  bordered
                  :disabled="respondingInvitationId === invitation.invitationId"
                  @click="rejectInvitation(invitation.invitationId)"
                >
                  Odrzuć
                </FButton>
                <FButton
                  type="button"
                  size="sm"
                  :disabled="respondingInvitationId === invitation.invitationId"
                  @click="acceptInvitation(invitation.invitationId)"
                >
                  Akceptuj
                </FButton>
              </div>
            </div>
          </div>
          <div v-if="!contacts.loading && contacts.sentInvitations.length" class="grid gap-3">
            <h2 class="m-0 text-xl text-text">Wysłane zaproszenia</h2>
            <div
              v-for="invitation in contacts.sentInvitations"
              :key="invitation.invitationId"
              class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border p-4"
            >
              <div class="flex items-center gap-3">
                <FAvatar :text="invitation.avatarInitials || invitation.email" />
                <div>
                  <p class="m-0 font-semibold text-text">{{ invitation.email }}</p>
                  <p class="mt-1 text-sm text-muted">Zaproszenie oczekuje na akceptację.</p>
                </div>
              </div>
              <span class="text-sm text-muted">Oczekuje</span>
            </div>
          </div>
          <div
            v-if="!contacts.loading && !contacts.contacts.length"
            class="rounded-[14px] border border-dashed border-border p-6 text-sm text-muted"
          >
            Nie masz jeszcze żadnych kontaktów.
          </div>
          <div v-if="contacts.contacts.length" class="grid gap-3">
            <h2 class="m-0 text-xl text-text">Aktywne kontakty</h2>
            <div
              v-for="contact in contacts.contacts"
              :key="contact.userId"
              class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border p-4"
            >
              <div class="flex items-center gap-3">
                <FAvatar :text="contact.avatarInitials || contact.email" />
                <div>
                  <p class="m-0 font-semibold text-text">{{ contact.email }}</p>
                  <p class="mt-1 text-sm text-muted">Kontakt gotowy do szybkiego udostępniania list.</p>
                </div>
              </div>
              <FButton
                type="button"
                size="sm"
                variant="ghost"
                bordered
                :disabled="removingContactId === contact.userId"
                @click="removeContact(contact.userId)"
              >
                {{ removingContactId === contact.userId ? 'Usuwanie...' : 'Usuń' }}
              </FButton>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import FAvatar from '@/components/FAvatar.vue'
import FButton from '@/components/FButton.vue'
import FMessage from '@/components/FMessage.vue'
import { useContactsStore } from '@/stores/contacts'

const contacts = useContactsStore()
const contactEmail = ref('')
const saving = ref(false)
const removingContactId = ref<string | null>(null)
const respondingInvitationId = ref<string | null>(null)
const messageError = ref('')
const messageSuccess = ref('')

const clearMessages = () => {
  messageError.value = ''
  messageSuccess.value = ''
}

const submitContact = async () => {
  clearMessages()
  if (!contactEmail.value.trim()) {
    messageError.value = 'Podaj adres e-mail kontaktu.'
    return
  }

  saving.value = true
  try {
    await contacts.addContact(contactEmail.value)
    contactEmail.value = ''
    messageSuccess.value = 'Zaproszenie do kontaktów zostało wysłane.'
  } catch (error) {
    messageError.value = error instanceof Error ? error.message : 'Nie udało się dodać kontaktu.'
  } finally {
    saving.value = false
  }
}

const acceptInvitation = async (invitationId: string) => {
  clearMessages()
  respondingInvitationId.value = invitationId
  try {
    await contacts.acceptInvitation(invitationId)
    messageSuccess.value = 'Zaproszenie do kontaktów zostało zaakceptowane.'
  } catch (error) {
    messageError.value = error instanceof Error ? error.message : 'Nie udało się zaakceptować zaproszenia.'
  } finally {
    respondingInvitationId.value = null
  }
}

const rejectInvitation = async (invitationId: string) => {
  clearMessages()
  respondingInvitationId.value = invitationId
  try {
    await contacts.rejectInvitation(invitationId)
    messageSuccess.value = 'Zaproszenie do kontaktów zostało odrzucone.'
  } catch (error) {
    messageError.value = error instanceof Error ? error.message : 'Nie udało się odrzucić zaproszenia.'
  } finally {
    respondingInvitationId.value = null
  }
}

const removeContact = async (userId: string) => {
  clearMessages()
  removingContactId.value = userId
  try {
    await contacts.removeContact(userId)
    messageSuccess.value = 'Kontakt został usunięty.'
  } catch (error) {
    messageError.value = error instanceof Error ? error.message : 'Nie udało się usunąć kontaktu.'
  } finally {
    removingContactId.value = null
  }
}

onMounted(() => {
  void contacts.loadContacts().catch((error) => {
    messageError.value = error instanceof Error ? error.message : 'Nie udało się pobrać kontaktów.'
  })
})
</script>

<style scoped></style>
