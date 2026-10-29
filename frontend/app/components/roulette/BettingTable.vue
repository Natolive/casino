<script setup lang="ts">
import { BETS } from '@casino/shared'
import { CH, CW, LABELS, SPOTS, TABLE_H, TABLE_W, ZERO, cellOf, centerOf } from '~/utils/table-layout'

// Le tapis de jeu : clic pour poser le jeton choisi, clic droit pour retirer la mise d'une case.
// Survoler une zone éclaire les numéros qu'elle couvre (cheval, carré, sixain…).
const props = defineProps<{ bets: Record<string, number>; winner: number | null; locked: boolean; wins: (key: string) => boolean }>()
const emit = defineEmits<{ place: [key: string]; remove: [key: string] }>()

const hovered = ref<string | null>(null)
const lit = computed(() => new Set(hovered.value && !props.locked ? BETS[hovered.value] : []))
const chips = computed(() => Object.entries(props.bets).map(([key, amount]) => ({ key, amount, ...centerOf(key) })))

const LABEL_FILL = { red: 'url(#cell-red)', black: 'url(#cell-black)', green: 'url(#cell-green)' }
// Losange rouge / noir des chances simples.
const diamond = (x: number, y: number, w: number, h: number) => {
  const cx = x + w / 2, cy = y + h / 2
  return `M${cx - 30},${cy} L${cx},${cy - 17} L${cx + 30},${cy} L${cx},${cy + 17} Z`
}
// Le zéro : pointe vers la gauche, comme sur le tapis.
const zeroPath = `M${ZERO.x + ZERO.w},${ZERO.y} L${ZERO.x + 22},${ZERO.y} L${ZERO.x},${ZERO.y + ZERO.h / 2} L${ZERO.x + 22},${ZERO.y + ZERO.h} L${ZERO.x + ZERO.w},${ZERO.y + ZERO.h} Z`
const winnerCell = computed(() => (props.winner === null ? null : props.winner === 0 ? ZERO : cellOf(props.winner)))
</script>

<template>
  <svg :viewBox="`0 0 ${TABLE_W} ${TABLE_H}`" class="block w-full select-none" role="group" aria-label="Tapis de mise" @contextmenu.prevent>
    <RouletteChipDefs />
    <defs>
      <linearGradient id="cell-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c3182a" />
        <stop offset="1" stop-color="#8d0e18" />
      </linearGradient>
      <linearGradient id="cell-black" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a2a2a" />
        <stop offset="1" stop-color="#0d0d0d" />
      </linearGradient>
      <linearGradient id="cell-green" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14864f" />
        <stop offset="1" stop-color="#0a5a32" />
      </linearGradient>
      <radialGradient id="felt" cx="50%" cy="40%" r="75%">
        <stop offset="0" stop-color="#14703f" />
        <stop offset="1" stop-color="#073a21" />
      </radialGradient>
      <filter id="felt-grain">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </defs>

    <!-- Feutre et son grain. -->
    <rect width="100%" height="100%" rx="18" fill="url(#felt)" />
    <rect width="100%" height="100%" rx="18" fill="#000" filter="url(#felt-grain)" />

    <!-- Cases peintes. -->
    <g stroke="#efe3c2" stroke-opacity=".85" stroke-width="2">
      <path :d="zeroPath" fill="url(#cell-green)" />
      <rect v-for="l in LABELS" :key="l.key" :x="l.x" :y="l.y" :width="l.w" :height="l.h" :fill="l.color && l.key.startsWith('straight') ? LABEL_FILL[l.color] : 'transparent'" />
    </g>
    <g class="pointer-events-none" fill="#f7f1e1" font-family="Playfair Display, serif" text-anchor="middle" dominant-baseline="central">
      <text :x="ZERO.x + ZERO.w / 2 + 6" :y="ZERO.y + ZERO.h / 2" font-size="34" font-weight="700">0</text>
      <template v-for="l in LABELS" :key="l.key">
        <path v-if="l.key === 'red' || l.key === 'black'" :d="diamond(l.x, l.y, l.w, l.h)" :fill="LABEL_FILL[l.color!]" stroke="#efe3c2" stroke-width="1.5" />
        <text
          v-else
          :x="l.x + l.w / 2"
          :y="l.y + l.h / 2"
          :font-size="l.key.startsWith('straight') ? 28 : 19"
          :font-weight="l.key.startsWith('straight') ? 700 : 500"
          :font-style="l.key.startsWith('straight') ? 'normal' : 'italic'"
        >{{ l.text }}</text>
      </template>
    </g>

    <!-- Numéros couverts par la zone survolée. -->
    <g class="pointer-events-none" fill="#fff4cf" fill-opacity=".28">
      <path v-if="lit.has(0)" :d="zeroPath" />
      <template v-for="n in lit" :key="n">
        <rect v-if="n" v-bind="(({ x, y, w, h }) => ({ x, y, width: w, height: h }))(cellOf(n))" />
      </template>
    </g>

    <!-- Numéro sorti. -->
    <rect
      v-if="winnerCell"
      class="winner pointer-events-none"
      :x="winnerCell.x + 3"
      :y="winnerCell.y + 3"
      :width="(winner === 0 ? ZERO.w : CW) - 6"
      :height="(winner === 0 ? ZERO.h : CH) - 6"
      rx="4"
      fill="none"
      stroke="#f2dc95"
      stroke-width="5"
    />

    <!-- Zones de mise (invisibles). -->
    <g :class="locked ? 'pointer-events-none' : 'cursor-pointer'">
      <rect
        v-for="s in SPOTS"
        :key="s.key"
        :x="s.x"
        :y="s.y"
        :width="s.w"
        :height="s.h"
        fill="transparent"
        @mouseenter="hovered = s.key"
        @mouseleave="hovered = null"
        @click="emit('place', s.key)"
        @contextmenu.prevent="emit('remove', s.key)"
      />
    </g>

    <!-- Jetons posés : les perdants s'effacent après le tour. -->
    <g class="pointer-events-none" filter="url(#chip-shadow)">
      <TransitionGroup name="chip">
        <g v-for="c in chips" :key="c.key" :class="{ lost: winner !== null && !wins(c.key) }" class="chip">
          <RouletteChip :amount="c.amount" :x="c.x" :y="c.y" :r="19" />
        </g>
      </TransitionGroup>
    </g>
  </svg>
</template>

<style scoped>
.chip {
  transition: opacity .6s ease .4s, transform .6s ease .4s;
}
.chip.lost {
  opacity: 0;
  transform: translateY(-14px);
}
.chip-enter-active {
  transition: opacity .2s, transform .25s cubic-bezier(.3, 1.6, .5, 1);
}
.chip-enter-from {
  opacity: 0;
  transform: translateY(-18px);
}
.chip-leave-active {
  transition: opacity .25s;
}
.chip-leave-to {
  opacity: 0;
}
.winner {
  animation: glow 1.1s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 6px #f2dc95);
}
@keyframes glow {
  from { stroke-opacity: .35; }
  to { stroke-opacity: 1; }
}
</style>
