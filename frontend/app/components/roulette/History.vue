<script setup lang="ts">
// Derniers numéros sortis, le plus récent en tête. `historyKey` augmente à chaque tirage pour animer l'arrivée.
defineProps<{ history: number[]; historyKey: number }>()
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-muted shrink-0 text-xs font-semibold tracking-widest uppercase">Derniers</span>
    <TransitionGroup tag="ol" name="pill" class="flex min-w-0 gap-1.5 overflow-hidden" aria-label="Derniers numéros sortis">
      <li
        v-for="(n, i) in history"
        :key="historyKey - i"
        class="font-display grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-1 ring-white/15"
        :class="[pocketBg(n), i === 0 && 'ring-emerald-300 ring-2']"
      >
        {{ n }}
      </li>
      <li v-if="!history.length" key="none" class="text-dimmed text-sm">Aucun tour joué</li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.pill-enter-active {
  transition: all .4s;
}
.pill-enter-from {
  opacity: 0;
  transform: scale(.4);
}
.pill-move {
  transition: transform .4s;
}
</style>
