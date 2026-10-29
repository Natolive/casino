<script setup lang="ts">
import type { Outcome } from '~/composables/useRoulette'

// Résultat en plein écran quelques secondes (seulement si l'on a misé), sans bloquer la page ; la médaille sur la roue
// prend le relais.
defineProps<{ outcome: Outcome }>()
</script>

<template>
  <Teleport to="body">
    <div class="takeover pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" aria-hidden="true">
      <div class="flex flex-col items-center text-center">
        <div
          class="font-display grid size-40 place-items-center rounded-full border-[6px] border-emerald-300 text-7xl font-bold text-white shadow-[0_0_80px_rgba(52,211,153,.55)] sm:size-52 sm:text-8xl"
          :class="pocketBg(outcome.result)"
        >
          {{ outcome.result }}
        </div>
        <template v-if="outcome.won > outcome.staked">
          <p class="font-display brand-text mt-8 text-6xl font-bold tracking-tight tabular-nums sm:text-8xl">+{{ fmtChips(outcome.won - outcome.staked) }}</p>
          <p class="mt-2 text-xl font-semibold text-emerald-200">{{ outcomeLabel(outcome) }}</p>
        </template>
        <p v-else class="font-display mt-8 text-4xl font-bold" :class="!outcome.won && 'text-muted'">{{ outcomeLabel(outcome) }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.takeover {
  animation: takeover 4s ease both;
}
.takeover > div {
  animation: pop .6s cubic-bezier(.3, 1.5, .5, 1) both;
}
@keyframes takeover {
  0% { opacity: 0; }
  10%, 80% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}
@keyframes pop {
  from { transform: scale(.6); }
}
@media (prefers-reduced-motion: reduce) {
  .takeover > div { animation: none; }
}
</style>
