<script setup lang="ts">
// Annonce du croupier en travers de l'écran : un bandeau balaie l'écran, le texte se resserre, puis tout s'efface de
// lui-même. À remonter (changer de `key`) pour la rejouer.
defineProps<{ text: string; tone: 'go' | 'stop' | 'gold' }>()
</script>

<template>
  <div class="announce pointer-events-none fixed inset-0 z-40 grid place-items-center" aria-hidden="true">
    <p class="font-display w-full py-4 text-center font-extrabold text-white uppercase" :class="tone">{{ text }}</p>
  </div>
</template>

<style scoped>
.announce {
  animation: announce 2s ease both;
}
p {
  font-size: clamp(2.5rem, 9vw, 8rem);
  letter-spacing: .04em;
  text-shadow: 0 4px 30px rgb(0 0 0 / .6);
  background-repeat: no-repeat;
  background-position: center;
  animation: announce-text 2s cubic-bezier(.2, .8, .2, 1) both;
}
.go {
  background-image: linear-gradient(90deg, transparent, rgb(16 185 129 / .55) 20%, rgb(16 185 129 / .55) 80%, transparent);
}
.gold {
  background-image: linear-gradient(90deg, transparent, rgb(217 119 6 / .6) 20%, rgb(217 119 6 / .6) 80%, transparent);
}
.stop {
  background-image: linear-gradient(90deg, transparent, rgb(220 38 38 / .6) 20%, rgb(220 38 38 / .6) 80%, transparent);
}
@keyframes announce {
  0% { opacity: 0; }
  10%, 75% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}
@keyframes announce-text {
  from { letter-spacing: .5em; background-size: 0% 100%; filter: blur(8px); }
  30% { letter-spacing: .04em; background-size: 100% 100%; filter: blur(0); }
  to { background-size: 100% 100%; }
}
@media (prefers-reduced-motion: reduce) {
  p { animation: none; background-size: 100% 100%; }
}
</style>
