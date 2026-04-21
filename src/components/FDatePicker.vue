<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3 py-3 text-left text-text outline-none transition hover:border-primary/32"
      @click="toggleOpen"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span v-if="leadingLabel" class="shrink-0 text-sm font-semibold text-muted">{{ leadingLabel }}</span>
        <span class="min-w-0 truncate" :class="modelValue ? 'text-text' : 'text-muted'">{{ displayValue }}</span>
      </span>
      <svg class="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path :d="mdiCalendarMonthOutline" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] grid gap-3 rounded-[14px] border border-border bg-surface p-3 shadow-card"
    >
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text transition hover:border-primary/32 hover:bg-primary/5"
          @click="shiftMonth(-1)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiChevronLeft" />
          </svg>
        </button>
        <p class="m-0 text-sm font-semibold capitalize text-text">{{ monthLabel }}</p>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text transition hover:border-primary/32 hover:bg-primary/5"
          @click="shiftMonth(1)"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path :d="mdiChevronRight" />
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="flex h-9 items-center justify-center rounded-[10px] text-sm transition"
          :class="dayClass(day)"
          @click="selectDate(day.date)"
        >
          {{ day.label }}
        </button>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-border pt-3">
        <button type="button" class="text-sm text-muted transition hover:text-text" @click="clearValue">
          Wyczyść
        </button>
        <button type="button" class="text-sm font-semibold text-primary transition hover:opacity-80" @click="selectToday">
          Dziś
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiCalendarMonthOutline, mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type CalendarDay = {
  key: string
  label: number
  date: Date
  inCurrentMonth: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    leadingLabel?: string
  }>(),
  {
    placeholder: 'Wybierz datę',
    leadingLabel: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
const root = ref<HTMLElement | null>(null)
const open = ref(false)

const parseDate = (value: string) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

const formatDateValue = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthCursor = ref<Date>(parseDate(props.modelValue) ?? new Date())

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseDate(value)
    if (parsed) monthCursor.value = parsed
  },
)

const displayValue = computed(() => {
  const parsed = parseDate(props.modelValue)
  if (!parsed) return props.placeholder
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(parsed)
})

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric',
  }).format(monthCursor.value),
)

const calendarDays = computed<CalendarDay[]>(() => {
  const year = monthCursor.value.getFullYear()
  const month = monthCursor.value.getMonth()
  const firstDay = new Date(year, month, 1, 12)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - firstWeekday, 12)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      label: date.getDate(),
      date,
      inCurrentMonth: date.getMonth() === month,
    }
  })
})

const isSelected = (date: Date) => formatDateValue(date) === props.modelValue
const isToday = (date: Date) => formatDateValue(date) === formatDateValue(new Date())

const dayClass = (day: CalendarDay) => [
  isSelected(day.date) ? 'bg-primary text-surface' : 'text-text hover:bg-primary/8',
  !day.inCurrentMonth ? 'opacity-35' : '',
  !isSelected(day.date) && isToday(day.date) ? 'border border-primary/35' : 'border border-transparent',
].join(' ')

const selectDate = (date: Date) => {
  emit('update:modelValue', formatDateValue(date))
  monthCursor.value = new Date(date)
  open.value = false
}

const selectToday = () => {
  selectDate(new Date())
}

const clearValue = () => {
  emit('update:modelValue', '')
  open.value = false
}

const shiftMonth = (delta: number) => {
  const next = new Date(monthCursor.value)
  next.setMonth(next.getMonth() + delta, 1)
  monthCursor.value = next
}

const toggleOpen = () => {
  open.value = !open.value
}

const handlePointerDown = (event: MouseEvent) => {
  if (!root.value) return
  if (root.value.contains(event.target as Node)) return
  open.value = false
}

onMounted(() => {
  window.addEventListener('mousedown', handlePointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', handlePointerDown)
})
</script>

<style scoped></style>
