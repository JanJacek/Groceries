<template>
  <div class="grid gap-4">
    <div v-if="canManage" class="grid gap-2">
      <FButton
        type="button"
        variant="ghost"
        bordered
        custom-class="justify-start"
        :icon="mdiAccountPlusOutline"
        @click="$emit('add')"
      >
        Dodaj znajomego
      </FButton>
      <FButton
        v-if="showDeleteList"
        type="button"
        variant="ghost"
        bordered
        custom-class="justify-start"
        :icon="mdiTrashCanOutline"
        @click="$emit('delete-list')"
      >
        Usuń listę
      </FButton>
    </div>

    <FMessage v-if="error" variant="error">{{ error }}</FMessage>
    <FMessage v-if="success" variant="success">{{ success }}</FMessage>

    <div v-if="loading" class="text-sm text-muted">Ładowanie współpracowników...</div>
    <div v-else class="grid gap-3">
      <div
        v-for="member in members"
        :key="member.userId"
        class="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border p-4"
      >
        <div class="flex items-center gap-3">
          <FAvatar :text="member.avatarInitials || member.email" />
          <div>
            <p class="m-0 font-semibold text-text">
              {{ member.email }}
              <span v-if="member.isCurrentUser" class="text-sm font-normal text-muted">(Ty)</span>
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ member.role === 'owner' ? 'Właściciel listy' : 'Może edytować listę i produkty' }}
            </p>
          </div>
        </div>
        <FButton
          v-if="canRemoveMember(member)"
          type="button"
          size="sm"
          variant="ghost"
          bordered
          @click="$emit('remove-member', member.userId)"
        >
          {{ member.isCurrentUser ? 'Opuść listę' : 'Usuń' }}
        </FButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiAccountPlusOutline, mdiTrashCanOutline } from '@mdi/js'
import { computed } from 'vue'
import FAvatar from '@/components/FAvatar.vue'
import FButton from '@/components/FButton.vue'
import FMessage from '@/components/FMessage.vue'
import type { ShoppingListMember } from '@/stores/shopping'

const props = withDefaults(
  defineProps<{
    members: ShoppingListMember[]
    loading?: boolean
    canManage?: boolean
    canDeleteList?: boolean
    canRemoveMembers?: boolean
    error?: string
    success?: string
  }>(),
  {
    loading: false,
    canManage: false,
    canDeleteList: true,
    canRemoveMembers: false,
    error: '',
    success: '',
  },
)

defineEmits<{
  (e: 'add'): void
  (e: 'delete-list'): void
  (e: 'remove-member', userId: string): void
}>()

const showDeleteList = computed(() => props.canManage && props.canDeleteList)

const canRemoveMember = (member: ShoppingListMember) =>
  (props.canRemoveMembers && !member.isCurrentUser && member.role !== 'owner')
  || (member.isCurrentUser && member.role !== 'owner')
</script>

<style scoped></style>
