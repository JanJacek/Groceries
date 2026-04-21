import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type Contact = {
  userId: string
  email: string
  avatarInitials: string
  createdAt: string
}

export type ContactInvitationDirection = 'received' | 'sent'

export type ContactInvitation = {
  invitationId: string
  userId: string
  email: string
  avatarInitials: string
  createdAt: string
  direction: ContactInvitationDirection
}

type ContactRow = {
  user_id: string
  email: string
  avatar_initials: string | null
  created_at: string
}

type ContactInvitationRow = {
  invitation_id: string
  user_id: string
  email: string
  avatar_initials: string | null
  created_at: string
  direction: ContactInvitationDirection
}

const mapContact = (row: ContactRow): Contact => ({
  userId: row.user_id,
  email: row.email,
  avatarInitials: row.avatar_initials ?? '',
  createdAt: row.created_at,
})

const mapInvitation = (row: ContactInvitationRow): ContactInvitation => ({
  invitationId: row.invitation_id,
  userId: row.user_id,
  email: row.email,
  avatarInitials: row.avatar_initials ?? '',
  createdAt: row.created_at,
  direction: row.direction,
})

export const useContactsStore = defineStore('contacts', () => {
  const auth = useAuthStore()
  const contacts = ref<Contact[]>([])
  const invitations = ref<ContactInvitation[]>([])
  const loading = ref(false)
  let realtimeChannel: RealtimeChannel | null = null

  const receivedInvitations = computed(() =>
    invitations.value.filter((invitation) => invitation.direction === 'received'),
  )
  const sentInvitations = computed(() =>
    invitations.value.filter((invitation) => invitation.direction === 'sent'),
  )
  const hasPendingInvitations = computed(() => receivedInvitations.value.length > 0)

  const cleanupRealtime = () => {
    if (!realtimeChannel) return
    void supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  const loadContacts = async () => {
    loading.value = true
    try {
      const [{ data: contactData, error: contactError }, { data: invitationData, error: invitationError }] =
        await Promise.all([
          supabase.rpc('list_user_contacts'),
          supabase.rpc('list_user_contact_invitations'),
        ])

      if (contactError) throw contactError
      if (invitationError) throw invitationError

      contacts.value = ((contactData ?? []) as ContactRow[]).map(mapContact)
      invitations.value = ((invitationData ?? []) as ContactInvitationRow[]).map(mapInvitation)
    } finally {
      loading.value = false
    }
  }

  const addContact = async (email: string) => {
    const { error } = await supabase.rpc('add_user_contact', {
      p_email: email.trim(),
    })

    if (error) throw error
    await loadContacts()
  }

  const acceptInvitation = async (invitationId: string) => {
    const { error } = await supabase.rpc('accept_user_contact_invitation', {
      p_invitation_id: invitationId,
    })

    if (error) throw error
    await loadContacts()
  }

  const rejectInvitation = async (invitationId: string) => {
    const { error } = await supabase.rpc('reject_user_contact_invitation', {
      p_invitation_id: invitationId,
    })

    if (error) throw error
    await loadContacts()
  }

  const removeContact = async (userId: string) => {
    const { error } = await supabase.rpc('remove_user_contact', {
      p_contact_user_id: userId,
    })

    if (error) throw error
    await loadContacts()
  }

  const initializeRealtime = (userId: string) => {
    cleanupRealtime()
    realtimeChannel = supabase
      .channel(`contacts-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_contact_invitations' },
        (payload: RealtimePostgresChangesPayload<{ recipient_user_id?: string; sender_user_id?: string }>) => {
          const recipientUserId =
            (payload.new as { recipient_user_id?: string } | null)?.recipient_user_id ??
            (payload.old as { recipient_user_id?: string } | null)?.recipient_user_id
          const senderUserId =
            (payload.new as { sender_user_id?: string } | null)?.sender_user_id ??
            (payload.old as { sender_user_id?: string } | null)?.sender_user_id

          if (recipientUserId === auth.user?.id || senderUserId === auth.user?.id) {
            void loadContacts()
          }
        },
      )
      .subscribe()
  }

  watch(
    () => auth.user?.id ?? null,
    (userId) => {
      cleanupRealtime()
      contacts.value = []
      invitations.value = []
      if (userId) initializeRealtime(userId)
    },
    { immediate: true },
  )

  return {
    contacts,
    invitations,
    receivedInvitations,
    sentInvitations,
    hasPendingInvitations,
    loading,
    loadContacts,
    addContact,
    acceptInvitation,
    rejectInvitation,
    removeContact,
  }
})
