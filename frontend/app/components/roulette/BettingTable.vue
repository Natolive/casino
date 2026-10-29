<script setup lang="ts">
import { BETS } from '@casino/shared'
import { CH, CW, LABELS, SPOTS, TABLE_H, TABLE_W, ZERO, cellOf, centerOf } from '~/utils/table-layout'

// Le tapis de jeu : clic pour poser le jeton choisi, clic droit pour retirer la mise d'une case, glisser une pile pour la
// déplacer (lâchée hors du tapis, elle est retirée ; dans un creux du tapis, elle reste où elle était). Survoler une zone éclaire les numéros qu'elle couvre (cheval, carré, sixain…).
// `ghost` : tapis en transparence (aperçu sur la roue), seuls les numéros et les jetons restent pleins.
const props = defineProps<{ bets: Record<string, number>; winner?: number | null; locked: boolean; wins?: (key: string) => boolean; ghost?: boolean }>()
const emit = defineEmits<{ place: [key: string]; remove: [key: string]; move: [from: string, to: string] }>()

const hovered = ref<string | null>(null)
const lit = computed(() => new Set(hovered.value && !props.locked ? BETS[hovered.value] : []))

// Pile en cours de glisser, suivie au pointeur (coordonnées du viewBox). Sans mouvement, c'est un clic sur la zone sous
// le pointeur, comme si le jeton n'était pas là (le bord d'un jeton déborde sur les filets et coins voisins).
const svg = useTemplateRef('svg')
const drag = ref<{ key: string; x: number; y: number; from: [number, number]; moved: boolean } | null>(null)
const toTable = (e: PointerEvent) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.value!.getScreenCTM()!.inverse())
// Zone sous un point : la dernière dans l'ordre d'empilement (les filets et coins passent devant les cases).
const spotAt = (x: number, y: number) => SPOTS.findLast((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h)?.key ?? null

function grab(e: PointerEvent, key: string) {
  if (props.locked || e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  const { x, y } = toTable(e)
  drag.value = { key, x, y, from: [e.clientX, e.clientY], moved: false }
}
function follow(e: PointerEvent) {
  const d = drag.value
  const p = toTable(e)
  // Survol d'un jeton : on éclaire la zone qu'un clic toucherait, pas forcément celle du jeton.
  if (!d) return void (hovered.value = spotAt(p.x, p.y))
  ;({ x: d.x, y: d.y } = p)
  d.moved ||= Math.hypot(e.clientX - d.from[0], e.clientY - d.from[1]) > 4
  if (d.moved) hovered.value = spotAt(d.x, d.y)
}
function drop() {
  const d = drag.value
  drag.value = null
  if (!d) return
  const to = spotAt(d.x, d.y)
  const outside = d.x < 0 || d.y < 0 || d.x > TABLE_W || d.y > TABLE_H
  // La zone sous le pointeur reste éclairée : la souris ne la quitte pas en lâchant.
  hovered.value = outside ? null : to
  if (!d.moved) return to && emit('place', to)
  if (outside) emit('remove', d.key)
  else if (to && to !== d.key) emit('move', d.key, to)
}
// Fin des mises en plein glisser : la pile retourne à sa place.
watch(() => props.locked, (locked) => locked && (drag.value = null))

const chips = computed(() =>
  Object.entries(props.bets).map(([key, amount]) => {
    const d = drag.value?.key === key && drag.value.moved ? drag.value : null
    return { key, amount, ...(d ? { x: d.x, y: d.y } : centerOf(key)), dragging: !!d }
  }),
)

const LABEL_FILL = { red: 'url(#cell-red)', black: 'url(#cell-black)', green: 'url(#cell-green)' }
// Losange rouge / noir des chances simples.
const diamond = (x: number, y: number, w: number, h: number) => {
  const cx = x + w / 2, cy = y + h / 2
  return `M${cx - 30},${cy} L${cx},${cy - 17} L${cx + 30},${cy} L${cx},${cy + 17} Z`
}
// Le zéro : pointe vers la gauche, comme sur le tapis.
const zeroPath = `M${ZERO.x + ZERO.w},${ZERO.y} L${ZERO.x + 22},${ZERO.y} L${ZERO.x},${ZERO.y + ZERO.h / 2} L${ZERO.x + 22},${ZERO.y + ZERO.h} L${ZERO.x + ZERO.w},${ZERO.y + ZERO.h} Z`
const winnerCell = computed(() => (props.winner == null ? null : props.winner === 0 ? ZERO : cellOf(props.winner)))
</script>

<template>
  <svg ref="svg" :viewBox="`0 0 ${TABLE_W} ${TABLE_H}`" class="block w-full select-none" role="group" aria-label="Tapis de mise" @contextmenu.prevent>
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
      <radialGradient id="mat" cx="50%" cy="40%" r="75%">
        <stop offset="0" stop-color="#1c1c21" />
        <stop offset="1" stop-color="#111114" />
      </radialGradient>
    </defs>

    <!-- Fond du tapis. -->
    <rect width="100%" height="100%" rx="18" fill="url(#mat)" :fill-opacity="ghost ? 0 : 1" />

    <!-- Cases peintes. -->
    <g stroke="#fff" stroke-opacity=".12" stroke-width="2" :opacity="ghost ? 0.45 : 1">
      <path :d="zeroPath" fill="url(#cell-green)" />
      <rect v-for="l in LABELS" :key="l.key" :x="l.x" :y="l.y" :width="l.w" :height="l.h" :fill="l.color && l.key.startsWith('straight') ? LABEL_FILL[l.color] : 'transparent'" />
    </g>
    <g class="pointer-events-none" fill="#fafafa" font-family="Space Grotesk, sans-serif" text-anchor="middle" dominant-baseline="central">
      <text :x="ZERO.x + ZERO.w / 2 + 6" :y="ZERO.y + ZERO.h / 2" font-size="34" font-weight="700">0</text>
      <template v-for="l in LABELS" :key="l.key">
        <path v-if="l.key === 'red' || l.key === 'black'" :d="diamond(l.x, l.y, l.w, l.h)" :fill="LABEL_FILL[l.color!]" stroke="#fff" stroke-opacity=".3" stroke-width="1.5" />
        <text
          v-else
          :x="l.x + l.w / 2"
          :y="l.y + l.h / 2"
          :font-size="l.key.startsWith('straight') ? 28 : 19"
          :font-weight="l.key.startsWith('straight') ? 700 : 500"
        >{{ l.text }}</text>
      </template>
    </g>

    <!-- Numéros couverts par la zone survolée. -->
    <g class="pointer-events-none" fill="#fff" fill-opacity=".2">
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
      stroke="#6ee7b7"
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

    <!-- Jetons posés, à glisser pendant les mises : les perdants s'effacent après le tour. -->
    <g :class="locked ? 'pointer-events-none' : 'cursor-grab'" filter="url(#chip-shadow)">
      <TransitionGroup name="chip">
        <g
          v-for="c in chips"
          :key="c.key"
          :class="{ lost: winner != null && !wins?.(c.key), dragging: c.dragging }"
          class="chip touch-none"
          @pointerdown="grab($event, c.key)"
          @pointermove="follow"
          @pointerup="drop"
          @lostpointercapture="drag = null"
          @mouseleave="drag || (hovered = null)"
          @contextmenu.prevent="emit('remove', c.key)"
        >
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
.chip.dragging {
  transition: none;
  cursor: grabbing;
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
  filter: drop-shadow(0 0 6px #6ee7b7);
}
@keyframes glow {
  from { stroke-opacity: .35; }
  to { stroke-opacity: 1; }
}
</style>
