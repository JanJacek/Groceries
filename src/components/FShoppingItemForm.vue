<template>
  <div class="grid gap-4">
    <FField label="Nazwa">
      <FAutocomplete
        :model-value="modelValue.name"
        :suggestions="productSuggestions"
        :loading="loadingSuggestions"
        placeholder="Wpisz nazwę produktu"
        @update:model-value="updateName"
      />
    </FField>

    <FField label="Warunek">
      <FSelect :model-value="modelValue.conditionType" :options="conditionOptions" @update:model-value="updateConditionType" />
    </FField>

    <FField label="Ilość">
      <input
        :value="String(modelValue.quantity)"
        type="number"
        min="0.01"
        step="0.01"
        class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
        @input="updateQuantity"
      />
    </FField>

    <FMessage v-if="error" variant="error">{{ error }}</FMessage>

    <div class="flex justify-end gap-3">
      <FButton
        type="button"
        variant="ghost"
        bordered
        :disabled="saving"
        @click="$emit('secondary-action')"
      >
        {{ secondaryActionLabel }}
      </FButton>
      <FButton type="button" :disabled="saving" @click="$emit('submit')">
        {{ saving ? 'Zapisywanie...' : 'Zapisz' }}
      </FButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FAutocomplete from '@/components/FAutocomplete.vue'
import FButton from '@/components/FButton.vue'
import FField from '@/components/FField.vue'
import FMessage from '@/components/FMessage.vue'
import FSelect from '@/components/FSelect.vue'

type ShoppingItemFormValue = {
  name: string
  quantity: number
  conditionType: '' | 'promotion'
}

type SelectOption = {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue: ShoppingItemFormValue
    conditionOptions: SelectOption[]
    saving?: boolean
    error?: string
    editing?: boolean
    productSuggestions?: string[]
    loadingSuggestions?: boolean
  }>(),
  {
    saving: false,
    error: '',
    editing: false,
    productSuggestions: () => [],
    loadingSuggestions: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ShoppingItemFormValue): void
  (e: 'submit'): void
  (e: 'secondary-action'): void
}>()

const secondaryActionLabel = computed(() => (props.editing ? 'Usuń' : 'Anuluj'))

const updateName = (value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    name: value,
  })
}

const updateConditionType = (value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    conditionType: value as ShoppingItemFormValue['conditionType'],
  })
}

const updateQuantity = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', {
    ...props.modelValue,
    quantity: Number(target.value),
  })
}
</script>

<style scoped></style>
