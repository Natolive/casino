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
    <section class="hero relative isolate hidden flex-col justify-between overflow-hidden border-e border-white/10 p-14 lg:flex">
      <NuxtLink to="/login" class="font-display brand-text self-start text-2xl font-bold tracking-tight">{{ APP_NAME }}</NuxtLink>

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
          <TableChipDefs />
          <TableChip :amount="chip.amount" :r="20" />
        </svg>
      </div>

      <div>
        <p class="text-emerald-300/80 mb-4 text-xs font-semibold tracking-[.4em] uppercase">Jetons fictifs · frissons réels</p>
        <h2 class="font-display text-5xl leading-[1.05] font-bold tracking-tight xl:text-6xl">Faites vos jeux, <span class="brand-text tracking-tight">la maison offre</span>.</h2>
        <p class="text-muted mt-6 max-w-md text-lg">Roulette européenne en 3D, tirage vérifiable à chaque tour. Aucun argent réel, juste le plaisir du jeu.</p>
      </div>
    </section>

    <section class="enter flex items-center justify-center px-4 py-12 sm:px-10">
      <div class="w-full max-w-sm">
        <p class="font-display brand-text mb-12 text-center text-4xl font-bold tracking-tight lg:hidden">{{ APP_NAME }}</p>
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Halo émeraude et cyan sur fond zinc, grille fine en filigrane. */
.hero {
  background:
    radial-gradient(55% 45% at 50% 42%, rgb(52 211 153 / .16), transparent 75%),
    radial-gradient(40% 30% at 90% 0%, rgb(34 211 238 / .12), transparent 70%),
    linear-gradient(rgb(255 255 255 / .04) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, rgb(255 255 255 / .04) 1px, transparent 1px) 0 0 / 40px 40px,
    #0c0c0f;
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
