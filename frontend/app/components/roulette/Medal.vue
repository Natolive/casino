<script setup lang="ts">
import type { Outcome } from '~/composables/useRoulette'

// Le numéro sorti, posé sous la roue le temps du résultat, avec ce que le joueur a gagné s'il a misé.
defineProps<{ outcome: Outcome }>()
</script>

<template>
  <div class="flex flex-col items-center" role="status">
    <div
      class="font-display grid size-24 place-items-center rounded-full border-4 border-emerald-300 text-5xl font-bold text-white shadow-[0_0_40px_rgba(52,211,153,.55)]"
      :class="pocketBg(outcome.result)"
    >
      {{ outcome.result }}
    </div>
    <p v-if="outcome.staked" class="mt-3 rounded-full bg-black/60 px-5 py-1.5 text-lg font-bold backdrop-blur">
      <span :class="outcome.won > outcome.staked ? 'text-emerald-300' : outcome.won ? 'text-highlighted' : 'text-muted'">
        {{ outcomeLabel(outcome) }}<template v-if="outcome.won > outcome.staked"> +{{ fmtChips(outcome.won - outcome.staked) }}</template>
      </span>
    </p>
  </div>
</template>
