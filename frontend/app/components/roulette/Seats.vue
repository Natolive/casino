<script setup lang="ts">
import { MAX_SEATS, type SeatDto } from '@casino/shared'

// Les joueurs autour de la table, en direct : leur couleur de jetons, leur prénom, ce qu'ils ont misé sur le tour et,
// une fois la bille tombée, ce qu'ils ont gagné (le plus gros gain a sa couronne). Table pleine : les autres regardent.
const props = defineProps<{ seats: SeatDto[]; spectators: number; seat: number | null; result: boolean }>()

const staked = (s: SeatDto) => s.bets.reduce((sum, b) => sum + b.amount, 0)
const gain = (s: SeatDto) => (props.result ? (s.won ?? 0) - staked(s) : 0)
const best = computed(() => {
  const top = props.seats.reduce<SeatDto | null>((a, s) => (gain(s) > (a ? gain(a) : 0) ? s : a), null)
  return top?.seat ?? null
})
</script>

<template>
  <div class="flex flex-col items-start gap-1.5" aria-label="Joueurs à la table" aria-live="polite">
    <p class="rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold tracking-[.2em] text-white/60 uppercase backdrop-blur">
      {{ seats.length }}/{{ MAX_SEATS }} à la table<template v-if="spectators"> · {{ spectators }} {{ spectators > 1 ? 'spectateurs' : 'spectateur' }}</template>
    </p>
    <p v-if="seat === null && seats.length" class="rounded-full bg-black/55 px-3 py-1 text-xs text-white/70 backdrop-blur">
      <template v-if="seats.length < MAX_SEATS">Place libérée après quelques tours sans miser : misez pour la reprendre.</template>
      <template v-else>Table pleine : vous misez en spectateur, une place se libère bientôt.</template>
    </p>
    <TransitionGroup tag="ul" name="seat" class="flex flex-col items-start gap-1">
      <li
        v-for="s in seats"
        :key="s.player"
        class="flex items-center gap-2 rounded-full bg-black/55 py-1 ps-1.5 pe-3 text-sm backdrop-blur"
        :class="s.seat === seat && 'ring-1 ring-white/30'"
      >
        <span class="size-4 shrink-0 rounded-full border-2 border-dashed border-white/70" :style="{ background: seatColor(s.seat) }" />
        <span class="max-w-32 truncate font-semibold">{{ s.name }}<span v-if="s.seat === seat" class="text-white/50"> (vous)</span></span>
        <UIcon v-if="best === s.seat" name="i-lucide-crown" class="size-4 text-amber-300" />
        <span v-if="gain(s) > 0" :key="`won-${s.seat}`" class="win font-display font-bold text-emerald-300 tabular-nums">+{{ fmtChips(gain(s)) }}</span>
        <span v-else-if="staked(s)" class="font-display text-white/70 tabular-nums">{{ fmtChips(staked(s)) }}</span>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.seat-enter-active,
.seat-leave-active {
  transition: opacity .3s, transform .3s;
}
.seat-enter-from,
.seat-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
.seat-move {
  transition: transform .3s;
}
.win {
  animation: pop .5s cubic-bezier(.3, 1.6, .5, 1);
}
@keyframes pop {
  from { transform: scale(.4); opacity: 0; }
}
</style>
