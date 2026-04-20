import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  let initPromise: Promise<void> | null = null
  let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null =
    null

  const isAuthenticated = computed(() => !!user.value)

  const applySession = (session: Session | null) => {
    user.value = session?.user ?? null
  }

  const initialize = async () => {
    if (initialized.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Failed to load session', error)
      applySession(data?.session ?? null)

      if (!subscription) {
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          applySession(session)
        })
        subscription = listener.subscription
      }

      initialized.value = true
    })()

    await initPromise
    initPromise = null
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const deleteAccount = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Brak aktywnej sesji użytkownika.')

    const { error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (error) throw error

    await signOut()
  }

  return {
    user,
    initialized,
    isAuthenticated,
    initialize,
    signIn,
    signUp,
    signOut,
    deleteAccount,
  }
})
