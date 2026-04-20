import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'goceries.preferences'
const AVAILABLE_CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const
const AVAILABLE_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack'] as const

type Currency = (typeof AVAILABLE_CURRENCIES)[number]
type Unit = (typeof AVAILABLE_UNITS)[number]

type ProfileRow = {
  preferred_currency: Currency
  default_unit: Unit
  compact_view: boolean
  avatar_initials: string | null
}

const DEFAULT_CURRENCY: Currency = 'PLN'
const DEFAULT_UNIT: Unit = 'pcs'

export const useSettingsStore = defineStore('settings', () => {
  const auth = useAuthStore()
  const preferredCurrency = ref<Currency>(DEFAULT_CURRENCY)
  const defaultUnit = ref<Unit>(DEFAULT_UNIT)
  const compactView = ref(false)
  const avatarInitials = ref('')

  const normalizeAvatarInitials = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2)

  const persistLocal = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        preferredCurrency: preferredCurrency.value,
        defaultUnit: defaultUnit.value,
        compactView: compactView.value,
      }),
    )
  }

  const loadLocal = () => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as {
        preferredCurrency?: string
        defaultUnit?: string
        compactView?: boolean
      }
      if (AVAILABLE_CURRENCIES.includes(parsed.preferredCurrency as Currency)) {
        preferredCurrency.value = parsed.preferredCurrency as Currency
      }
      if (AVAILABLE_UNITS.includes(parsed.defaultUnit as Unit)) {
        defaultUnit.value = parsed.defaultUnit as Unit
      }
      compactView.value = Boolean(parsed.compactView)
    } catch (error) {
      console.error('Failed to parse local preferences', error)
    }
  }

  const applyProfile = (profile: Partial<ProfileRow> | null) => {
    if (profile?.preferred_currency && AVAILABLE_CURRENCIES.includes(profile.preferred_currency)) {
      preferredCurrency.value = profile.preferred_currency
    }
    if (profile?.default_unit && AVAILABLE_UNITS.includes(profile.default_unit)) {
      defaultUnit.value = profile.default_unit
    }
    compactView.value = profile?.compact_view ?? compactView.value
    avatarInitials.value = normalizeAvatarInitials(profile?.avatar_initials ?? '')
    persistLocal()
  }

  const loadProfile = async () => {
    const ownerId = auth.user?.id
    if (!ownerId) return

    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferred_currency, default_unit, compact_view, avatar_initials')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (error) throw error
    applyProfile((data as ProfileRow | null) ?? null)
  }

  const savePreferences = async (payload: {
    preferredCurrency: string
    defaultUnit: string
    compactView: boolean
  }) => {
    const ownerId = auth.user?.id
    if (!ownerId) throw new Error('Brak zalogowanego użytkownika.')
    if (!AVAILABLE_CURRENCIES.includes(payload.preferredCurrency as Currency)) {
      throw new Error('Nieobsługiwana waluta.')
    }
    if (!AVAILABLE_UNITS.includes(payload.defaultUnit as Unit)) {
      throw new Error('Nieobsługiwana jednostka.')
    }

    const { error } = await supabase.from('user_profiles').upsert(
      {
        owner_id: ownerId,
        preferred_currency: payload.preferredCurrency,
        default_unit: payload.defaultUnit,
        compact_view: payload.compactView,
        avatar_initials: avatarInitials.value || null,
      },
      { onConflict: 'owner_id' },
    )

    if (error) throw error

    preferredCurrency.value = payload.preferredCurrency as Currency
    defaultUnit.value = payload.defaultUnit as Unit
    compactView.value = payload.compactView
    persistLocal()
  }

  const saveAvatarInitials = async (value: string) => {
    const ownerId = auth.user?.id
    if (!ownerId) throw new Error('Brak zalogowanego użytkownika.')

    const initials = normalizeAvatarInitials(value)
    const { error } = await supabase.from('user_profiles').upsert(
      {
        owner_id: ownerId,
        preferred_currency: preferredCurrency.value,
        default_unit: defaultUnit.value,
        compact_view: compactView.value,
        avatar_initials: initials || null,
      },
      { onConflict: 'owner_id' },
    )

    if (error) throw error
    avatarInitials.value = initials
  }

  loadLocal()

  return {
    preferredCurrency,
    defaultUnit,
    compactView,
    avatarInitials,
    availableCurrencies: AVAILABLE_CURRENCIES,
    availableUnits: AVAILABLE_UNITS,
    loadProfile,
    savePreferences,
    saveAvatarInitials,
  }
})
