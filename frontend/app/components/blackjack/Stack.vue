<script setup lang="ts">
import { CHIPS } from '@casino/shared'

// Une pile de jetons vue de biais : le montant rendu avec les plus gros jetons possibles, le plus gros en bas, et le total
// en étiquette. Sa taille suit celle de son conteneur.
const props = defineProps<{ amount: number }>()

// ponytail: 12 jetons au plus dessinés ; au-delà, la pile garde sa hauteur et l'étiquette dit le compte.
const chips = computed(() => {
  const out: number[] = []
  let left = props.amount
  for (const value of [...CHIPS].reverse())
    while (left >= value && out.length < 12) {
      out.push(value)
      left -= value
    }
  return out
})
const H = computed(() => 48 + (chips.value.length - 1) * 5)
</script>

<template>
  <div class="relative" :style="{ aspectRatio: `48 / ${H}` }">
    <svg :viewBox="`-24 ${-H + 24} 48 ${H}`" class="block size-full overflow-visible" aria-hidden="true">
      <g v-for="(value, i) in chips" :key="i" :transform="`translate(0 ${-i * 5})`">
        <!-- Tranche du jeton sous le dessus. -->
        <ellipse cy="3" rx="22" ry="21" fill="#000" fill-opacity=".45" />
        <TableChip :amount="value" :r="22" />
      </g>
    </svg>
    <span class="font-display absolute top-full left-1/2 mt-[.15em] -translate-x-1/2 rounded-full bg-black/70 px-[.5em] text-[.42em] leading-[1.5] font-bold whitespace-nowrap text-white tabular-nums">
      {{ fmtChips(amount) }}
    </span>
  </div>
</template>
