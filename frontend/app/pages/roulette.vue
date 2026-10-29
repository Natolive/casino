<script setup lang="ts">
import type { BetsView } from '~/components/roulette/Bets.vue'

// La table de roulette : assemble la scène. La roue occupe tout l'écran quand les mises sont fermées ; ouvertes, elle
// glisse à gauche et le panneau des mises arrive à droite.
useHead({ title: 'Roulette' })

const wheel = useTemplateRef('wheel')
const game = useRoulette((n) => wheel.value!.spinTo(n))
const { open, phase, round, remaining, verified, outcome, winner, available, shown, history, historyKey, seats, spectators, seat, others } = game

await game.load()

// Tapis classique, ou cylindre à plat pour les annonces ; le même choix vaut pour l'aperçu sur la roue.
const view = ref<BetsView>('table')

// Annonce du croupier à chaque ouverture ou fermeture des mises, pas à l'arrivée sur la page (tour déjà en cours).
const call = ref<string | null>(null)
watch(
  () => (open.value ? 'Faites vos jeux' : phase.value === 'spinning' ? 'Rien ne va plus' : null),
  (text) => text && (call.value = text),
)
</script>

<template>
  <div class="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
    <RouletteHeader :balance="available" />

    <main class="stage relative flex flex-1 flex-col gap-4 px-3 pb-4 sm:px-6 xl:block xl:min-h-0 xl:p-0" :class="{ open }">
      <RouletteAnnounce v-if="call && round" :key="`${round.id}-${call}`" :text="call" :tone="open ? 'go' : 'stop'" />
      <RouletteResult v-if="phase === 'result' && outcome?.staked" :key="round?.id" :outcome="outcome" />

      <section class="wheel relative w-full" aria-label="Cylindre">
        <div class="absolute inset-0"><RouletteWheel ref="wheel" /></div>

        <RouletteSeats :seats="seats" :spectators="spectators" :seat="seat" :result="phase === 'result'" class="pointer-events-none absolute top-[4%] left-[4%] max-w-[45%]" />

        <RouletteFairness v-if="round" :round="round" :verified="verified" class="absolute bottom-[4%] left-[4%] max-w-[60%]" />

        <!-- Mises fermées : l'état du tour et les derniers numéros en haut à droite, et le tapis en transparence en bas à
             droite, qui s'efface presque au survol pour laisser voir la roue. -->
        <Transition name="fade">
          <div v-if="!open" class="pointer-events-none absolute top-[4%] right-[4%] flex max-w-[60%] flex-col items-end gap-3">
            <p class="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold tracking-[.2em] whitespace-nowrap uppercase backdrop-blur" role="timer">
              <span class="size-2 rounded-full" :class="phase === 'result' ? 'bg-white/50' : 'animate-pulse bg-red-500'" />
              <template v-if="phase === 'result'"><span class="text-white/60">Prochain tour</span> <span class="tabular-nums">{{ remaining }}&nbsp;s</span></template>
              <template v-else>Rien ne va plus</template>
            </p>
            <RouletteHistory :history="history.slice(0, 8)" :history-key="historyKey" class="max-w-full" />
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="!open" class="absolute right-[3%] bottom-[4%] w-[min(60%,720px)] opacity-90 transition-opacity duration-300 hover:opacity-25" aria-label="Vos mises">
            <RouletteBets :view="view" :bets="shown" :others="others" :winner="winner" :wins="game.wins" locked ghost />
          </div>
        </Transition>

        <Transition name="medal">
          <RouletteMedal v-if="phase === 'result' && outcome" :outcome="outcome" class="pointer-events-none absolute bottom-[calc(4%+3rem)] left-[4%]" />
        </Transition>
      </section>

      <Transition name="panel">
        <RouletteBetPanel v-if="open" v-model:view="view" :game="game" class="xl:absolute xl:top-1/2 xl:right-[2%] xl:max-h-[calc(100%-2rem)] xl:w-[54%] xl:-translate-y-1/2 xl:overflow-y-auto" />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
/* Roue : toute la scène quand les mises sont fermées (la 3D suit le cadre, pas de carré), réduite quand le panneau est
   là ; sur grand écran, elle glisse vers la gauche. */
.wheel {
  height: calc(100dvh - 8rem);
  transition: height .8s cubic-bezier(.65, 0, .35, 1);
}
.stage.open .wheel {
  height: min(100vw - 1.5rem, 55vh);
}
@media (min-width: 1280px) {
  .wheel,
  .stage.open .wheel {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 100%;
    transition-property: top, left, width, height;
  }
  /* À côté du panneau, la 3D est un écran aux coins arrondis : les plans rapprochés ne finissent pas en arête vive. */
  .stage.open .wheel {
    top: 7%;
    left: 1%;
    width: 42%;
    height: 86%;
    border-radius: 1.5rem;
    overflow: hidden;
  }
}
/* Le panneau arrive une fois la roue partie sur le côté, et s'en va d'un coup. */
.panel-enter-active {
  transition: opacity .5s .35s, transform .6s .35s cubic-bezier(.2, .8, .2, 1);
}
.panel-leave-active {
  transition: opacity .3s, transform .3s;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(60px);
}
.fade-enter-active,
.fade-leave-active,
.medal-leave-active {
  transition: opacity .4s;
}
.fade-enter-from,
.fade-leave-to,
.medal-leave-to {
  opacity: 0;
}
.medal-enter-active {
  transition: opacity .4s, transform .5s cubic-bezier(.3, 1.5, .5, 1);
}
.medal-enter-from {
  opacity: 0;
  transform: scale(.6);
}
@media (prefers-reduced-motion: reduce) {
  .wheel, .panel-enter-active { transition: none; }
}
</style>
