<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-50 grid place-items-center bg-primary/60 p-6"
    role="dialog"
    aria-modal="true"
    @click.self="onClose"
  >
    <section class="w-full max-w-xl rounded-[14px] bg-surface p-6 shadow-card">
      <h2 class="m-0 text-2xl font-bold text-text">{{ props.title }}</h2>

      <div class="mt-4 text-sm leading-6 text-text">
        <slot />
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <FButton
          type="button"
          variant="ghost"
          :disabled="props.loading"
          bordered
          @click="onClose"
        >
          {{ props.cancelText }}
        </FButton>
        <FButton type="button" :disabled="props.loading" @click="onConfirm">
          {{ props.confirmText }}
        </FButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import FButton from '@/components/FButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
  }>(),
  {
    title: 'Uwaga',
    confirmText: 'Potwierdzam',
    cancelText: 'Anuluj',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const onClose = () => {
  if (props.loading) return
  emit('close')
}

const onConfirm = () => {
  emit('confirm')
}
</script>

<style scoped></style>
