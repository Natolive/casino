<script setup lang="ts">
import { CHIPS } from '@casino/shared'
import type { BetsView } from './Bets.vue'

// Le panneau des mises, affiché tant qu'elles sont ouvertes : compte à rebours, derniers numéros, tapis ou cylindre,
// jetons et actions sur les mises.
const props = defineProps<{ game: ReturnType<typeof useRoulette> }>()
const view = defineModel<BetsView>('view', { required: true })

// Les refs du jeu, lues telles quelles dans le gabarit.
const { open, history, historyKey, chip, remaining, timer, staked, available, shown, lastBets, undoStack, others } = props.game
const game = props.game

const VIEWS = [
  { label: 'Tapis', value: 'table', icon: 'i-lucide-grid-3x3' },
  { label: 'Cylindre', value: 'racetrack', icon: 'i-lucide-circle-dashed' },
]
const broke = computed(() => available.value < CHIPS[0] && !staked.value)
</script>

<template>
  <section class="flex min-w-0 flex-col gap-4">
    <div class="flex items-center gap-4" role="timer">
      <RouletteCountdown :timer="timer" :remaining="remaining" />
      <div class="min-w-0">
        <p class="text-[11px] font-bold tracking-[.25em] text-emerald-300/80 uppercase">Mises ouvertes</p>
        <p class="font-display text-3xl font-semibold tracking-tight text-[#f4efe3]">Faites vos jeux</p>
      </div>
    </div>

    <RouletteHistory :history="history" :history-key="historyKey" />

    <UTabs v-model="view" :items="VIEWS" :content="false" size="sm" class="w-fit" />

    <div class="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      <div class="panel min-w-[636px] rounded-3xl p-2">
        <RouletteBets :view="view" :bets="shown" :others="others" :locked="!open" @place="game.place" @remove="game.remove" @move="game.move" @announce="game.announce" />
      </div>
    </div>
    <p v-if="view === 'table'" class="text-dimmed -mt-2 text-xs">Clic&nbsp;: poser un jeton (sur un filet ou un coin pour miser à cheval) · clic droit&nbsp;: retirer · glisser une pile&nbsp;: la déplacer, ou la sortir du tapis.</p>
    <p v-else class="text-dimmed -mt-2 text-xs">Clic sur un numéro&nbsp;: lui et ses deux voisins de chaque côté · sur un secteur&nbsp;: l’annonce, un jeton par mise.</p>

    <div class="flex flex-wrap items-center justify-between gap-4">
      <RouletteChipRack v-model="chip" :available="Math.max(available, 0)" />
      <div class="flex flex-wrap items-center gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-undo-2" label="Annuler" :disabled="!undoStack.length" @click="game.undo" />
        <UButton color="neutral" variant="soft" icon="i-lucide-trash-2" label="Effacer" :disabled="!staked" @click="game.clear" />
        <UButton color="neutral" variant="soft" icon="i-lucide-copy-plus" label="Doubler" :disabled="!staked" @click="game.double" />
        <UButton color="neutral" variant="soft" icon="i-lucide-rotate-ccw" label="Rejouer" :disabled="!!staked || !Object.keys(lastBets).length" @click="game.rebet" />
      </div>
    </div>

    <div class="flex items-center justify-between gap-4">
      <p class="text-muted">
        Mise <span class="font-display text-highlighted ms-1 text-2xl font-bold tabular-nums">{{ fmtChips(staked) }}</span>
      </p>
      <UButton v-if="broke" size="xl" icon="i-lucide-coins" label="Recharger mes jetons" @click="game.refill" />
    </div>
  </section>
</template>
