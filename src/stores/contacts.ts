import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export type Contact = {
  userId: string
  email: string
  avatarInitials: string
  createdAt: string
}

type ContactRow = {
  user_id: string
  email: string
  avatar_initials: string | null
  created_at: string
}

const mapContact = (row: ContactRow): Contact => ({
  userId: row.user_id,
  email: row.email,
  avatarInitials: row.avatar_initials ?? '',
  createdAt: row.created_at,
})

export const useContactsStore = defineStore('contacts', () => {
  const contacts = ref<Contact[]>([])
  const loading = ref(false)

  const loadContacts = async () => {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('list_user_contacts')
      if (error) throw error
      contacts.value = ((data ?? []) as ContactRow[]).map(mapContact)
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

  const removeContact = async (userId: string) => {
    const { error } = await supabase.rpc('remove_user_contact', {
      p_contact_user_id: userId,
    })

    if (error) throw error
    contacts.value = contacts.value.filter((contact) => contact.userId !== userId)
  }

  return {
    contacts,
    loading,
    loadContacts,
    addContact,
    removeContact,
  }
})
