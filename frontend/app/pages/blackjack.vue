<script setup lang="ts">
import { BLACKJACK_SEATS, isNatural } from '@casino/shared'
import { along, BOX_R, W } from '~/utils/blackjack-layout'

// La table de blackjack : le feutre et ce qui s'y pose (croupier, sept cases), le panneau des mises et des coups dessous.
// Sur petit écran, la table garde sa taille et défile, centrée sur sa case.
useHead({ title: 'Blackjack' })

const game = useBlackjack()
const { table, phase, mine, seats, playing, canSit, bets, available, timer, open, myHand, verified } = game
await game.load()

const SEATS = Array.from({ length: BLACKJACK_SEATS }, (_, i) => i + 1)
const boxOf = (seat: number) => table.value?.boxes.find((b) => b.seat === seat)

// La table telle qu'on la trouve en arrivant se pose sans animation ; ensuite, chaque carte vient du sabot.
const animate = ref(false)
watch(table, () => nextTick(() => setTimeout(() => (animate.value = true), 50)), { once: true })

// Annonces du croupier : ouverture et fermeture des mises, son blackjack, son gain.
const call = ref<{ text: string; tone: 'go' | 'stop' | 'gold'; key: string } | null>(null)
const say = (text: string, tone: 'go' | 'stop' | 'gold') => (call.value = { text, tone, key: `${table.value?.round}-${text}` })
watch(phase, (next, previous) => {
  if (!previous || !animate.value) return
  if (next === 'betting' && previous !== 'betting') say('Faites vos jeux', 'go')
  else if (next === 'dealing') say('Rien ne va plus', 'stop')
  else if (next === 'result' && playing.value) {
    const net = mine.value.flatMap((b) => b.hands).reduce((sum, h) => sum + (h.won ?? 0) - h.bet, 0)
    if (net > 0) {
      say(`Gagné +${fmtChips(net)}`, 'go')
      casinoSound.win()
    }
  }
})
const natural = computed(() => phase.value !== 'betting' && mine.value.some((b) => b.hands.length === 1 && isNatural(b.hands[0]!.cards)))
watch(natural, (yes) => yes && animate.value && say('Blackjack !', 'gold'))

// Sons : chaque carte posée, la carte cachée retournée, la parole qui arrive.
const dealt = computed(() => (table.value?.dealer.filter(Boolean).length ?? 0) + (table.value?.boxes.reduce((n, b) => n + b.hands.reduce((m, h) => m + h.cards.length, 0), 0) ?? 0))
watch(dealt, (n, before) => {
  if (!animate.value || n <= before) return
  if (phase.value === 'dealer' && table.value!.dealer.length === 2) casinoSound.flip()
  else casinoSound.card()
})
watch(() => !!myHand.value, (yes) => yes && casinoSound.turn())

// Petit écran : la table défile jusqu'à sa première case.
const scroller = useTemplateRef('scroller')
watch(
  () => seats.value[0],
  async (seat) => {
    await nextTick()
    const el = scroller.value
    if (!seat || !el || el.scrollWidth <= el.clientWidth) return
    const x = (along(seat, BOX_R).x / W) * el.scrollWidth
    el.scrollTo({ left: x - el.clientWidth / 2, behavior: 'smooth' })
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
    <AppHeader title="Blackjack" :balance="available" />
    <BlackjackRoom />
    <BlackjackCardDefs />
    <TableAnnounce v-if="call" :key="call.key" :text="call.text" :tone="call.tone" />

    <main class="flex flex-1 flex-col gap-3 px-3 pb-4 sm:px-6 xl:min-h-0">
      <div ref="scroller" class="-mx-3 grid flex-1 items-start justify-items-center overflow-x-auto px-3 sm:mx-0 sm:px-0 xl:min-h-0">
        <section class="stage relative" :class="{ still: !animate }" aria-label="Table de blackjack">
          <BlackjackFelt />
          <template v-if="table">
            <BlackjackDealer :cards="table.dealer" :animate="animate" />
            <BlackjackBox
              v-for="seat in SEATS"
              :key="seat"
              :seat="seat"
              :box="boxOf(seat)"
              :mine="seats.includes(seat)"
              :phase="table.phase"
              :turn="table.phase === 'playing' && table.turn?.seat === seat ? table.turn.hand : null"
              :timer="timer"
              :can-bet="open && seats.includes(seat)"
              :can-sit="canSit"
              :stake="seats.includes(seat) && phase === 'betting' ? (bets[seat] ?? 0) : undefined"
              :animate="animate"
              @place="game.place(seat)"
              @remove="game.remove(seat)"
              @sit="game.sit(seat)"
              @stand="game.stand(seat)"
            />
          </template>

          <!-- Coins hors du feutre : les joueurs à la table, la donne vérifiable. -->
          <p class="absolute right-0 bottom-0 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold tracking-[.2em] text-white/60 uppercase backdrop-blur">
            {{ table?.boxes.length ?? 0 }}/{{ BLACKJACK_SEATS }} cases prises<template v-if="table?.spectators"> · {{ table.spectators }} {{ table.spectators > 1 ? 'spectateurs' : 'spectateur' }}</template>
          </p>
          <TableFairness v-if="table" :round="{ id: table.round, hash: table.hash, seed: table.seed }" :verified="verified" class="absolute bottom-0 left-0 max-w-[32%]" />
        </section>
      </div>

      <BlackjackControls :game="game" class="mx-auto w-full max-w-6xl" />
    </main>
  </div>
</template>

<style scoped>
/* La table garde ses proportions : aussi large que possible sans pousser le panneau hors de l'écran, 720 px au moins
   (on fait défiler en dessous). Les cartes et jetons se dimensionnent sur sa largeur (cqw). */
.stage {
  container-type: inline-size;
  aspect-ratio: 1200 / 640;
  width: max(720px, min(100%, (100dvh - 17rem) * 1.875));
}
/* La table posée dans la salle : ombre portée sur la moquette. */
.stage > :first-child {
  filter: drop-shadow(0 28px 40px rgb(0 0 0 / .7)) drop-shadow(0 0 60px rgb(16 185 129 / .18));
}
.still :deep(.deal-enter-active) {
  animation: none;
}
</style>
