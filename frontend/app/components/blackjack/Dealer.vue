<script setup lang="ts">
import { handValue, isNatural, type Card } from '@casino/shared'
import { at, CARD_W, cq, DEALER, DISCARD, SHOE, type Point } from '~/utils/blackjack-layout'

// La main du croupier, face au joueur : la carte cachée se retourne quand il joue. Son total compte les cartes visibles.
const props = defineProps<{ cards: (Card | null)[]; animate: boolean }>()

const toward = (from: Point, to: Point) => ({ x: cq(to.x - from.x), y: cq(to.y - from.y) })
const placed = computed(() =>
  props.cards.map((card, k) => {
    const p = { x: DEALER.x + (k - (props.cards.length - 1) / 2) * 50, y: DEALER.y }
    return { card, p, from: toward(p, SHOE), to: toward(p, DISCARD) }
  }),
)
const shown = computed(() => props.cards.filter((c): c is Card => !!c))
const total = computed(() => handValue(shown.value).total)
const verdict = computed(() =>
  isNatural(shown.value) ? { text: 'Blackjack', tone: 'bg-amber-500 text-amber-950' } : total.value > 21 ? { text: 'Sauté', tone: 'bg-red-600/90' } : null,
)
</script>

<template>
  <TransitionGroup name="deal">
    <div
      v-for="(c, k) in placed"
      :key="k"
      class="slot pointer-events-none absolute"
      :style="{ ...at(c.p), width: cq(CARD_W), zIndex: 10 + k, '--fx': c.from.x, '--fy': c.from.y, '--tx': c.to.x, '--ty': c.to.y }"
    >
      <BlackjackCard :card="c.card" :deal="animate && !!c.card" />
    </div>
  </TransitionGroup>
  <div
    v-if="shown.length"
    class="pointer-events-none absolute z-30 flex -translate-y-1/2 flex-col items-start gap-[.3em]"
    :style="{ ...at({ x: DEALER.x + (cards.length - 1) * 25 + 78, y: DEALER.y }), fontSize: cq(15) }"
  >
    <span class="font-display rounded-full bg-black/75 px-[.6em] leading-[1.6] font-bold text-white tabular-nums shadow-lg">{{ verdict?.text === 'Blackjack' ? 'BJ' : total }}</span>
    <Transition name="pop">
      <span v-if="verdict" class="rounded-full px-[.7em] text-[.85em] leading-[1.6] font-extrabold tracking-wider uppercase shadow-lg" :class="verdict.tone">{{ verdict.text }}</span>
    </Transition>
  </div>
</template>

<style scoped>
.slot {
  transform: translate(-50%, -50%);
  transition: left .4s ease, top .4s ease;
}
.deal-enter-active {
  animation: deal .45s cubic-bezier(.2, .7, .25, 1) both;
}
@keyframes deal {
  from { transform: translate(calc(-50% + var(--fx)), calc(-50% + var(--fy))) rotate(-70deg); }
}
.deal-leave-active {
  transition: transform .6s ease-in, opacity .6s ease-in;
}
.deal-leave-to {
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(-20deg) scale(.8);
  opacity: 0;
}
.pop-enter-active {
  transition: opacity .25s, transform .35s cubic-bezier(.3, 1.6, .5, 1);
}
.pop-enter-from {
  opacity: 0;
  transform: scale(.4);
}
</style>
