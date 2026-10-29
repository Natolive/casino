<script setup lang="ts">
// La salle autour de la table, derrière tout : la lumière chaude du lustre au-dessus du tapis, le reflet vert du feutre,
// une moquette de casino en filigrane et, au loin, les lumières floues des autres tables qui scintillent doucement.
const LIGHTS = [
  { x: 6, y: 18, size: 140, color: '#f59e0b', delay: 0 },
  { x: 16, y: 72, size: 90, color: '#f43f5e', delay: -3 },
  { x: 9, y: 46, size: 60, color: '#fde68a', delay: -6 },
  { x: 92, y: 24, size: 120, color: '#34d399', delay: -2 },
  { x: 86, y: 66, size: 150, color: '#f59e0b', delay: -5 },
  { x: 96, y: 48, size: 70, color: '#c084fc', delay: -8 },
  { x: 28, y: 92, size: 110, color: '#22d3ee', delay: -4 },
  { x: 74, y: 94, size: 100, color: '#fb7185', delay: -7 },
]
</script>

<template>
  <div class="room pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <div class="carpet absolute inset-0" />
    <span
      v-for="(l, i) in LIGHTS"
      :key="i"
      class="bokeh absolute rounded-full"
      :style="{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.size}px`, height: `${l.size}px`, background: l.color, animationDelay: `${l.delay}s` }"
    />
    <div class="lamp absolute inset-0" />
  </div>
</template>

<style scoped>
.room {
  background: #0b0a09;
}
/* Moquette : losanges bordeaux et filets dorés, à peine visibles, assombris vers les bords. */
.carpet {
  background:
    radial-gradient(circle at 50% 50%, rgb(217 180 90 / .07) 2px, transparent 3px) 0 0 / 56px 56px,
    repeating-linear-gradient(45deg, rgb(127 29 29 / .16) 0 2px, transparent 2px 28px),
    repeating-linear-gradient(-45deg, rgb(127 29 29 / .16) 0 2px, transparent 2px 28px),
    radial-gradient(120% 90% at 50% 45%, #2a1210, #120807 70%);
  mask-image: radial-gradient(90% 80% at 50% 45%, #000 30%, rgb(0 0 0 / .45));
}
/* Lustre au-dessus de la table (chaud), reflet du feutre (vert), et vignette sur les bords. */
.lamp {
  background:
    radial-gradient(38% 30% at 50% 0%, rgb(253 224 171 / .22), transparent 75%),
    radial-gradient(45% 40% at 50% 42%, rgb(16 185 129 / .2), transparent 70%),
    radial-gradient(120% 100% at 50% 40%, transparent 55%, rgb(0 0 0 / .6));
}
.bokeh {
  filter: blur(38px);
  opacity: .22;
  transform: translate(-50%, -50%);
  animation: twinkle 9s ease-in-out infinite alternate;
}
@keyframes twinkle {
  0% { opacity: .1; transform: translate(-50%, -50%) scale(.85); }
  60% { opacity: .3; }
  100% { opacity: .18; transform: translate(-46%, -54%) scale(1.1); }
}
@media (prefers-reduced-motion: reduce) {
  .bokeh { animation: none; }
}
</style>
