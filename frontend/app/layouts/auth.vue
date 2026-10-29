<script setup lang="ts">
import { APP_NAME } from '@casino/shared'

// Jetons posés sur le feutre du panneau de marque : montant, position (%), taille (px), inclinaison.
const CHIPS = [
  { amount: 500, x: 12, y: 18, size: 74, tilt: -18 },
  { amount: 100, x: 78, y: 12, size: 58, tilt: 24 },
  { amount: 25, x: 84, y: 64, size: 66, tilt: -8 },
  { amount: 5, x: 6, y: 70, size: 52, tilt: 32 },
]
</script>

<template>
  <main class="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
    <!-- Panneau de marque sur grand écran ; en dessous, le nom seul au-dessus du formulaire. -->
    <section class="felt relative isolate hidden flex-col justify-between overflow-hidden border-e border-gold-400/20 p-14 lg:flex">
      <NuxtLink to="/login" class="font-display gold-text self-start text-2xl font-black italic">{{ APP_NAME }}</NuxtLink>

      <div class="relative mx-auto aspect-square w-full max-w-md">
        <HomeWheelEmblem class="wheel absolute inset-[12%] drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
        <svg
          v-for="(chip, i) in CHIPS"
          :key="i"
          class="chip absolute"
          :style="{ left: `${chip.x}%`, top: `${chip.y}%`, width: `${chip.size}px`, '--tilt': `${chip.tilt}deg`, '--i': i }"
          viewBox="-24 -24 48 48"
          aria-hidden="true"
        >
          <RouletteChipDefs />
          <RouletteChip :amount="chip.amount" :r="20" />
        </svg>
      </div>

      <div>
        <p class="text-gold-300/80 mb-4 text-xs font-semibold tracking-[.4em] uppercase">Jetons fictifs · frissons réels</p>
        <h2 class="font-display text-5xl leading-[1.05] font-bold xl:text-6xl">Faites vos jeux, <span class="gold-text italic">la maison offre</span>.</h2>
        <p class="text-muted mt-6 max-w-md text-lg">Roulette européenne en 3D, tirage vérifiable à chaque tour. Aucun argent réel, juste le plaisir du jeu.</p>
      </div>
    </section>

    <section class="enter flex items-center justify-center px-4 py-12 sm:px-10">
      <div class="w-full max-w-sm">
        <p class="font-display gold-text mb-12 text-center text-4xl font-black italic lg:hidden">{{ APP_NAME }}</p>
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Feutre émeraude, éclairé par la lampe de la table, et losanges dorés en filigrane. */
.felt {
  background:
    radial-gradient(55% 45% at 50% 42%, rgb(20 112 63 / .55), transparent 75%),
    radial-gradient(40% 30% at 90% 0%, rgb(201 144 42 / .18), transparent 70%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M18 4 32 18 18 32 4 18Z' fill='none' stroke='%23e0ad35' stroke-opacity='.07'/%3E%3C/svg%3E"),
    linear-gradient(#073a21, #04150c);
}

/* Le cylindre tourne doucement, les jetons flottent chacun à son rythme. */
.wheel {
  animation: spin 60s linear infinite;
}
.chip {
  transform: translate(-50%, -50%) rotate(var(--tilt));
  filter: drop-shadow(0 12px 14px rgb(0 0 0 / .55));
  animation: float 6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -1.4s);
}
@keyframes spin {
  to { transform: rotate(1turn); }
}
@keyframes float {
  50% { transform: translate(-50%, calc(-50% - 10px)) rotate(var(--tilt)); }
}

/* Le formulaire monte en arrivant. */
.enter > div {
  animation: enter .6s .15s cubic-bezier(.2, .9, .3, 1.1) both;
}
@keyframes enter {
  from { opacity: 0; transform: translateY(14px); }
}

@media (prefers-reduced-motion: reduce) {
  .wheel, .chip, .enter > div { animation: none; }
}
</style>
