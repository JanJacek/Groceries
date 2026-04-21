<template>
  <div class="grid gap-4">
    <FField label="Nazwa">
      <FInput :model-value="modelValue.name" @update:model-value="updateField('name', $event)" />
    </FField>

    <FField label="Notatka">
      <textarea
        :value="modelValue.note"
        rows="3"
        class="rounded-[10px] border border-border px-3 py-2 text-text outline-none"
        @input="updateTextarea"
      ></textarea>
    </FField>

    <FMessage v-if="error" variant="error">{{ error }}</FMessage>
    <slot name="after-fields" />

    <div class="flex justify-end">
      <FButton type="button" :disabled="saving" @click="$emit('submit')">
        {{ saving ? 'Zapisywanie...' : 'Zapisz listę' }}
      </FButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import FButton from '@/components/FButton.vue'
import FField from '@/components/FField.vue'
import FInput from '@/components/FInput.vue'
import FMessage from '@/components/FMessage.vue'

type ShoppingListFormValue = {
  name: string
  note: string
  archived: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: ShoppingListFormValue
    saving?: boolean
    error?: string
  }>(),
  {
    saving: false,
    error: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ShoppingListFormValue): void
  (e: 'submit'): void
}>()

const updateField = (key: 'name' | 'note', value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const updateTextarea = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  updateField('note', target.value)
}

</script>

<style scoped></style>
