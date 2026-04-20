<template>
  <div class="overflow-x-auto">
    <table :class="tableClass">
      <thead>
        <tr v-if="$slots['head-top']">
          <slot name="head-top" />
        </tr>
        <tr :class="headRowClass">
          <th
            v-for="header in headers"
            :key="header.key"
            :class="getThClass(header)"
            :style="getColStyle(header)"
          >
            <slot name="header" :header="header">
              {{ header.label }}
            </slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, rowIndex) in rows"
          :key="resolveRowKey(row, rowIndex)"
          :class="bodyRowClass"
        >
          <td
            v-for="(header, colIndex) in headers"
            :key="`${resolveRowKey(row, rowIndex)}-${header.key}`"
            :class="getTdClass(header)"
            :style="getColStyle(header)"
          >
            <slot
              name="cell"
              :row="row"
              :header="header"
              :row-index="rowIndex"
              :col-index="colIndex"
            >
              {{ stringifyCellValue(row, header.key) }}
            </slot>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="$slots.footer">
        <slot name="footer" />
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
export type FTableHeader = {
  key: string
  label: string
  numeric?: boolean
  align?: 'left' | 'right'
  width?: string
  thClass?: string
  tdClass?: string
}

type TableRow = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    headers: FTableHeader[]
    rows: TableRow[]
    rowKey?: string
    tableClass?: string
    headRowClass?: string
    bodyRowClass?: string
    defaultThClass?: string
    defaultTdClass?: string
  }>(),
  {
    rowKey: 'id',
    tableClass: 'w-full border-collapse text-sm',
    headRowClass: 'border-b border-border text-left text-muted',
    bodyRowClass: 'border-b border-border/70',
    defaultThClass: 'px-3 py-2 font-semibold',
    defaultTdClass: 'px-3 py-2',
  },
)

const resolveRowKey = (row: TableRow, rowIndex: number) => {
  const keyField = props.rowKey || 'id'
  const value = row[keyField]
  if (typeof value === 'string' || typeof value === 'number') return value
  return rowIndex
}

const stringifyCellValue = (row: TableRow, key: string) => {
  const value = row[key]
  if (value === null || value === undefined) return ''
  return String(value)
}

const getThClass = (header: FTableHeader) => [
  getAlignClass(header),
  header.thClass || props.defaultThClass,
]

const getTdClass = (header: FTableHeader) => [
  getAlignClass(header),
  header.numeric ? 'tabular-nums' : '',
  header.tdClass || props.defaultTdClass,
]

const getAlignClass = (header: FTableHeader) => {
  if (header.align === 'right') return 'text-right'
  if (header.align === 'left') return 'text-left'
  if (header.key === 'actions') return 'text-right'
  if (header.numeric) return 'text-right'
  return ''
}

const getColStyle = (header: FTableHeader) => {
  if (!header.width) return undefined
  return { width: header.width }
}
</script>

<style scoped></style>
