<script setup lang="ts">
import { ANNOUNCES, BETS, WHEEL, colorOf, neighborsOf, wheelIndex } from '@casino/shared'
import { TABLE_H, TABLE_W } from '~/utils/table-layout'

// Le cylindre à plat (racetrack), comme sur une vraie table : 15 numéros sur chaque longueur, 4 dans l'arrondi de
// gauche (8, 23, 10, 5) et 3 dans celui de droite (3, 26, 0), dans l'ordre de la roue. Clic sur un numéro : lui et ses
// deux voisins de chaque côté ; clic sur un secteur : l'annonce (série 5/8, orphelins, série 0/2/3, jeu zéro).
// `ghost` : piste en transparence (aperçu sur la roue), seuls les numéros et les jetons restent pleins.
const props = defineProps<{ bets: Record<string, number>; winner?: number | null; locked: boolean; ghost?: boolean }>()
const emit = defineEmits<{ announce: [keys: string[]] }>()

// Piste en stade, centrée dans un cadre de la taille du tapis (le panneau ne change pas de taille d'une vue à l'autre).
const H = TABLE_H, OUT = 150, W = 70, IN = OUT - W
const CX1 = 10 + OUT, CX2 = TABLE_W - CX1, CY = H / 2, CW = (CX2 - CX1) / 15

// Position d'un numéro sur la piste : 0 pour le 3 (début de l'arrondi de droite), puis sens horaire.
const pos = (n: number) => (wheelIndex(n) - wheelIndex(3) + 37) % 37
// Point de la piste à la position t (en cases), à la distance r du centre de l'arrondi.
function at(t: number, r: number): [number, number] {
  t = ((t % 37) + 37) % 37
  const arc = (cx: number, deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), CY + r * Math.sin((deg * Math.PI) / 180)]
  if (t < 3) return arc(CX2, -90 + 60 * t)
  if (t < 18) return [CX2 - (t - 3) * CW, CY + r]
  if (t < 22) return arc(CX1, 90 + 45 * (t - 18))
  return [CX1 + (t - 22) * CW, CY - r]
}
// Bord de la piste de la position `from` à `to`, 8 points par case pour que les arrondis restent ronds.
const edge = (from: number, to: number, r: number) => {
  const steps = Math.abs(to - from) * 8
  return Array.from({ length: steps + 1 }, (_, k) => at(from + ((to - from) * k) / steps, r))
}
const path = (points: [number, number][]) => `M${points.map((p) => p.join(',')).join(' L')} Z`

const cells = WHEEL.map((n) => {
  const t = pos(n)
  return { n, d: path([...edge(t, t + 1, OUT), ...edge(t + 1, t, IN)]), text: at(t + 0.5, (IN + OUT) / 2) }
})

// Secteurs à l'intérieur de la piste, du premier au dernier de leurs numéros (en passant le 3 au besoin), fermés par un
// filet droit. Le jeu zéro est une pastille posée sur la série 0/2/3.
const inner = (...arcs: [number, number][]) => arcs.flatMap(([a, b]) => edge(pos(a), pos(b) + 1 + (pos(b) < pos(a) ? 37 : 0), IN))
const centerX = (pts: [number, number][]) => (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2
const ZR = IN - 14, ZX = CX2 - CW
const ZERO_PILL = `M${ZX},${CY - ZR} H${CX2} A${ZR},${ZR} 0 0 1 ${CX2},${CY + ZR} H${ZX} A${ZR},${ZR} 0 0 1 ${ZX},${CY - ZR} Z`
const tiers = inner([27, 33]), orphelins = inner([17, 6], [1, 9]), voisins = inner([22, 25])
// Filet entre orphelins et série 0/2/3, à mi-hauteur.
const split = (at(pos(22), IN)[0] + at(pos(17) + 1, IN)[0]) / 2
const SECTORS = [
  { key: 'tiers', label: 'SÉRIE 5/8', d: path(tiers), x: centerX(tiers) },
  { key: 'orphelins', label: 'ORPH.', d: path(orphelins), x: centerX(orphelins) },
  { key: 'voisins', label: 'SÉRIE 0/2/3', d: path(voisins), x: (split + ZX - ZR) / 2 },
  { key: 'zero', label: 'ZÉRO', d: ZERO_PILL, x: (ZX - ZR + CX2 + ZR) / 2 },
] as const

// Jetons à montrer, déduits des mises du tapis : une annonce compte autant de fois que toutes ses mises la contiennent
// (au jeton près) et son jeton porte le total misé ; ce qui reste en plein s'affiche sur le numéro. Les autres mises du
// tapis n'ont pas de place ici.
// ponytail: déduit, pas mémorisé : les mêmes mises posées une à une sur le tapis s'affichent comme l'annonce. Garder les
// annonces jouées dans useRoulette si ça gêne (à suivre aussi dans annuler, effacer, doubler, rejouer et la relecture API).
const placed = computed(() => {
  const left = { ...props.bets }
  const sectors = SECTORS.map((s) => {
    const keys = ANNOUNCES[s.key].bets
    const count = (k: string) => keys.filter((x) => x === k).length
    const unit = Math.min(...keys.map((k) => Math.floor((left[k] ?? 0) / count(k))))
    if (unit) for (const k of keys) left[k]! -= unit
    return { key: s.key, amount: unit * keys.length, x: s.x, y: CY + 40 }
  })
  const straights = cells.map((c) => ({ key: c.n, amount: left[`straight:${c.n}`] ?? 0, x: c.text[0], y: c.text[1] }))
  return [...sectors, ...straights].filter((c) => c.amount > 0)
})

const hovered = ref<string[] | null>(null)
const lit = computed(() => new Set(hovered.value && !props.locked ? hovered.value.flatMap((k) => BETS[k]!) : []))
</script>

<template>
  <svg :viewBox="`0 0 ${TABLE_W} ${H}`" class="block w-full select-none" role="group" aria-label="Annonces du cylindre">
    <RouletteChipDefs />
    <g :class="locked ? 'pointer-events-none' : 'cursor-pointer'" stroke="#fff" stroke-opacity=".12" stroke-width="2" :opacity="ghost ? 0.45 : 1">
      <path
        v-for="s in SECTORS"
        :key="s.key"
        :d="s.d"
        fill="#1a1a1f"
        class="transition-colors hover:fill-[#24242b]"
        @mouseenter="hovered = ANNOUNCES[s.key].bets"
        @mouseleave="hovered = null"
        @click="emit('announce', ANNOUNCES[s.key].bets)"
      >
        <title>{{ ANNOUNCES[s.key].name }}</title>
      </path>
      <path
        v-for="c in cells"
        :key="c.n"
        :d="c.d"
        :style="{ fill: `var(--color-pocket-${colorOf(c.n)})` }"
        @mouseenter="hovered = neighborsOf(c.n)"
        @mouseleave="hovered = null"
        @click="emit('announce', neighborsOf(c.n))"
      />
    </g>

    <g class="pointer-events-none" fill="#fafafa" font-family="Space Grotesk, sans-serif" text-anchor="middle" dominant-baseline="central">
      <text v-for="c in cells" :key="c.n" :x="c.text[0]" :y="c.text[1]" font-size="21" font-weight="700">{{ c.n }}</text>
      <text v-for="s in SECTORS" :key="s.key" :x="s.x" :y="CY" font-size="20" font-weight="700" letter-spacing="1" fill-opacity=".85">{{ s.label }}</text>
    </g>

    <!-- Numéros couverts par l'annonce survolée, et numéro sorti. -->
    <g class="pointer-events-none">
      <path v-for="c in cells.filter((c) => lit.has(c.n))" :key="c.n" :d="c.d" fill="#fff" fill-opacity=".2" />
      <path v-for="c in cells.filter((c) => c.n === winner)" :key="c.n" :d="c.d" fill="none" stroke="#6ee7b7" stroke-width="4" class="winner" />
    </g>

    <g class="pointer-events-none" filter="url(#chip-shadow)">
      <RouletteChip v-for="c in placed" :key="c.key" :amount="c.amount" :x="c.x" :y="c.y" :r="19" />
    </g>
  </svg>
</template>

<style scoped>
.winner {
  filter: drop-shadow(0 0 6px #6ee7b7);
}
</style>
