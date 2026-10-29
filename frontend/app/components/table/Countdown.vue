<script setup lang="ts">
// Compte à rebours en anneau : il se vide sur la durée de la phase (animation CSS calée sur l'horloge du serveur, pas
// redessinée à chaque seconde) et passe à l'ambre dans les 5 dernières secondes.
defineProps<{ timer: { key: string; total: number; elapsed: number } | null; remaining: number }>()
</script>

<template>
  <div class="relative size-16 shrink-0">
    <svg viewBox="0 0 64 64" class="size-full -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="none" stroke-width="5" class="stroke-white/10" />
      <circle
        v-if="timer"
        :key="timer.key"
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke-width="5"
        stroke-linecap="round"
        pathLength="100"
        stroke-dasharray="100"
        class="ring transition-colors"
        :class="remaining <= 5 ? 'stroke-amber-400' : 'stroke-emerald-400'"
        :style="{ animationDuration: `${timer.total}ms`, animationDelay: `${-timer.elapsed}ms` }"
      />
    </svg>
    <span class="font-display absolute inset-0 grid place-items-center text-2xl font-bold tabular-nums" :class="remaining <= 5 && 'animate-pulse text-amber-300'">
      {{ remaining }}
    </span>
  </div>
</template>

<style scoped>
.ring {
  animation: ring linear both;
}
@keyframes ring {
  to { stroke-dashoffset: 100; }
}
</style>
