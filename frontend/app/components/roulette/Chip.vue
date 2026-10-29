<script setup lang="ts">
import { CHIPS } from '@casino/shared'

// Jeton de casino en SVG (un <g> centré en x, y) : couleur du plus gros jeton que le montant contient.
const props = withDefaults(defineProps<{ amount: number; x?: number; y?: number; r?: number }>(), { x: 0, y: 0, r: 20 })

const STYLES: Record<number, { body: string; edge: string; text: string }> = {
  1: { body: '#ece6d6', edge: '#3b6fd1', text: '#2b2b2b' },
  5: { body: '#c0162c', edge: '#f4efe3', text: '#fff' },
  10: { body: '#1d4fa8', edge: '#f4efe3', text: '#fff' },
  25: { body: '#14804b', edge: '#f4efe3', text: '#fff' },
  100: { body: '#161616', edge: '#e0ad35', text: '#f2dc95' },
  500: { body: '#6b2a9e', edge: '#f2dc95', text: '#fff' },
}
const style = computed(() => STYLES[[...CHIPS].reverse().find((c) => c <= props.amount) ?? 1]!)
const label = computed(() => (props.amount >= 1000 ? `${+(props.amount / 1000).toFixed(1)}k`.replace('.', ',') : String(props.amount)))
// Six inserts sur la tranche : un pointillé épais sur le cercle de la tranche.
const dash = computed(() => {
  const c = 2 * Math.PI * props.r * 0.84
  return `${c / 12} ${c / 12}`
})
</script>

<template>
  <g :transform="`translate(${x} ${y})`">
    <circle :r="r" :fill="style.body" />
    <circle :r="r * 0.84" fill="none" :stroke="style.edge" :stroke-width="r * 0.3" :stroke-dasharray="dash" />
    <circle :r="r * 0.62" :fill="style.body" :stroke="style.edge" :stroke-width="r * 0.06" stroke-dasharray="2 2" />
    <circle :r="r" fill="url(#chip-shine)" />
    <text
      text-anchor="middle"
      dominant-baseline="central"
      :font-size="r * (label.length > 3 ? 0.46 : 0.6)"
      font-weight="800"
      font-family="Manrope, sans-serif"
      :fill="style.text"
    >{{ label }}</text>
  </g>
</template>
