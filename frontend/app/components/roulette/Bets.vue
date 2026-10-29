<script setup lang="ts">
// Les mises, sur le tapis ou sur le cylindre selon la vue choisie. `ghost` : aperçu en transparence, en lecture seule.
export type BetsView = 'table' | 'racetrack'

defineProps<{ view: BetsView; bets: Record<string, number>; locked: boolean; winner?: number | null; wins?: (key: string) => boolean; ghost?: boolean }>()
const emit = defineEmits<{ place: [key: string]; remove: [key: string]; move: [from: string, to: string]; announce: [keys: string[]] }>()
</script>

<template>
  <RouletteBettingTable
    v-if="view === 'table'"
    :bets="bets"
    :winner="winner"
    :locked="locked"
    :wins="wins"
    :ghost="ghost"
    @place="emit('place', $event)"
    @remove="emit('remove', $event)"
    @move="(from, to) => emit('move', from, to)"
  />
  <RouletteRacetrack v-else :bets="bets" :winner="winner" :locked="locked" :ghost="ghost" @announce="emit('announce', $event)" />
</template>
