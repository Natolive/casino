<script setup lang="ts">
import { handValue, isNatural, type BlackjackPhase, type BoxDto, type HandDto } from '@casino/shared'
import { along, at, BOX_R, CARD_W, cq, DISCARD, handPoint, RACK, SHOE, tilt, type Point } from '~/utils/blackjack-layout'

// Une case de la table : le cercle de mise et sa pile de jetons, les mains (cartes en cascade, total, verdict) et la
// plaque du joueur. Les cartes arrivent du sabot et partent à la défausse ; au règlement, les jetons perdus filent au
// croupier et les gains en arrivent. Case libre : on peut s'y asseoir. Sur ses propres cases, pendant les mises : clic
// pour poser le jeton choisi, clic droit pour reprendre la mise ; et on s'en lève tant qu'aucune main n'y est jouée.
const props = defineProps<{
  seat: number
  box?: BoxDto
  mine: boolean
  phase: BlackjackPhase
  // La main de cette case qui a la parole, et le temps qu'il lui reste.
  turn: number | null
  timer: { key: string; total: number; elapsed: number } | null
  canBet: boolean
  canSit: boolean
  // Sa mise posée sur cette case, avant même que l'API l'ait enregistrée.
  stake?: number
  animate: boolean
}>()
const emit = defineEmits<{ place: []; remove: []; sit: []; stand: [] }>()

const hands = computed(() => props.box?.hands ?? [])
const playing = computed(() => props.phase === 'dealing' || props.phase === 'playing')
const result = computed(() => props.phase === 'result')

// Vecteur d'un point vers un autre, en largeur de table, pour les envols (sabot, défausse, croupier).
const toward = (from: Point, to: Point) => ({ x: cq(to.x - from.x), y: cq(to.y - from.y) })

// Toutes les cartes de la case à plat, pour qu'une carte passée d'une main à l'autre (séparation) glisse au lieu de
// repartir du sabot : chacune est reconnue par sa valeur et son rang parmi ses doubles.
const cards = computed(() => {
  const seen = new Map<string, number>()
  return hands.value.flatMap((h, i) => {
    const anchor = handPoint(props.seat, i, hands.value.length)
    const angle = (tilt(props.seat) * Math.PI) / 180
    return h.cards.map((card, k) => {
      const n = (seen.get(card) ?? 0) + 1
      seen.set(card, n)
      // Cascade vers le haut et la droite, dans le sens de la case ; la carte d'un double se pose en travers.
      const sideways = h.doubled && k === h.cards.length - 1
      const [dx, dy] = [k * 20, -k * 15 - (sideways ? 6 : 0)]
      const p = { x: anchor.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: anchor.y + dx * Math.sin(angle) + dy * Math.cos(angle) }
      return { key: `${card}#${n}`, card, p, z: k, rotate: tilt(props.seat) + (sideways ? 90 : 0), from: toward(p, SHOE), to: toward(p, DISCARD) }
    })
  })
})

function label(h: HandDto) {
  const { total, soft } = handValue(h.cards)
  if (isNatural(h.cards, hands.value.length)) return 'BJ'
  return soft && total < 21 && playing.value ? `${total - 10}/${total}` : String(total)
}

// Verdict d'une main : sautée dès qu'elle dépasse 21, blackjack dès la donne, le reste au règlement.
function verdict(h: HandDto) {
  const natural = isNatural(h.cards, hands.value.length)
  if (handValue(h.cards).total > 21) return { text: 'Sauté', tone: 'bg-red-600/90' }
  if (h.won === null) return natural ? { text: 'Blackjack', tone: 'bg-amber-500 text-amber-950' } : null
  if (h.won === 0) return { text: 'Perdu', tone: 'bg-zinc-700/90' }
  if (h.won === h.bet) return { text: 'Égalité', tone: 'bg-sky-600/90' }
  return natural ? { text: 'Blackjack', tone: 'bg-amber-500 text-amber-950' } : { text: 'Gagné', tone: 'bg-emerald-500 text-emerald-950' }
}

const circle = computed(() => along(props.seat, BOX_R))
// Total et verdict d'une main : sous sa première carte, entre les cartes et le cercle de mise.
function labelPoint(i: number) {
  const p = handPoint(props.seat, i, hands.value.length)
  const c = circle.value
  return { x: p.x + (c.x - p.x) * 0.5, y: p.y + (c.y - p.y) * 0.5 + 8 }
}
// Plaque sous le cercle, hors des cartes.
const plate = computed(() => ({ x: circle.value.x, y: circle.value.y + 62 }))
const staked = computed(() => (hands.value.length ? hands.value.reduce((sum, h) => sum + h.bet, 0) : (props.stake ?? props.box?.bet ?? 0)))
// On se lève d'une case tant qu'aucune main n'y est en jeu.
const canStand = computed(() => props.mine && (!hands.value.length || result.value))
const won = computed(() => (result.value ? hands.value.reduce((sum, h) => sum + (h.won ?? 0), 0) : null))
const house = computed(() => toward(circle.value, RACK))
// Règlement vu en direct : les jetons filent au croupier ou en arrivent. Arrivé sur une table déjà réglée, ils sont posés.
const settledLive = ref(false)
watch(result, (yes) => (settledLive.value = yes && props.animate))
</script>

<template>
  <!-- Cercle de mise : on y pose ses jetons. -->
  <button
    v-if="mine"
    type="button"
    class="spot absolute rounded-full"
    :class="canBet ? 'cursor-pointer' : 'pointer-events-none'"
    :style="{ ...at(circle), width: cq(86), height: cq(86) }"
    :aria-label="canBet ? 'Poser un jeton sur ma case' : 'Ma case'"
    :disabled="!canBet"
    @click="emit('place')"
    @contextmenu.prevent="emit('remove')"
  >
    <span v-if="canBet" class="absolute inset-0 rounded-full ring-emerald-300/80" :class="staked ? 'ring-2' : 'invite ring-4'" />
  </button>

  <!-- Case libre : on s'y assoit. -->
  <button
    v-else-if="!box && canSit"
    type="button"
    class="spot group absolute grid place-items-center rounded-full"
    :style="{ ...at(circle), width: cq(86), height: cq(86), fontSize: cq(13) }"
    :aria-label="`S’asseoir à la place ${seat}`"
    @click="emit('sit')"
  >
    <span class="flex flex-col items-center gap-[.15em] font-bold tracking-wider text-white/45 uppercase transition group-hover:text-emerald-200">
      <UIcon name="i-lucide-armchair" class="size-[1.9em]" />
      S’asseoir
    </span>
    <span class="absolute inset-0 rounded-full ring-emerald-300/0 transition group-hover:bg-emerald-300/10 group-hover:ring-2 group-hover:ring-emerald-300/70" />
  </button>

  <!-- Mise, puis ce que la table rend : perdue, elle part au croupier ; gagnée, le gain arrive à côté. -->
  <Transition name="stack">
    <div
      v-if="staked && !(won === 0 && !settledLive)"
      :key="`bet-${box?.player}`"
      class="pile pointer-events-none absolute"
      :class="won === 0 && 'to-house'"
      :style="{ ...at(circle), width: cq(44), fontSize: cq(40), '--lift': cq(22), '--hx': house.x, '--hy': house.y }"
    >
      <BlackjackStack :amount="staked" />
    </div>
  </Transition>
  <div
    v-if="won && won > staked"
    class="pile pointer-events-none absolute"
    :class="settledLive && 'from-house'"
    :style="{ ...at({ x: circle.x + 46, y: circle.y + 6 }), width: cq(44), fontSize: cq(40), '--lift': cq(22), '--hx': house.x, '--hy': house.y }"
  >
    <BlackjackStack :amount="won - staked" />
  </div>

  <!-- Cartes. -->
  <TransitionGroup name="deal">
    <div
      v-for="c in cards"
      :key="c.key"
      class="slot pointer-events-none absolute"
      :style="{ ...at(c.p), width: cq(CARD_W), zIndex: 10 + c.z, '--r': `${c.rotate}deg`, '--fx': c.from.x, '--fy': c.from.y, '--tx': c.to.x, '--ty': c.to.y }"
    >
      <BlackjackCard :card="c.card" :deal="animate" />
    </div>
  </TransitionGroup>

  <!-- Total, verdict, main qui a la parole. -->
  <template v-for="(h, i) in hands" :key="i">
    <div
      class="pointer-events-none absolute z-30 flex -translate-1/2 flex-col items-center gap-[.3em]"
      :style="{ ...at(labelPoint(i)), fontSize: cq(hands.length > 2 ? 12 : 15) }"
    >
      <span
        class="font-display rounded-full px-[.6em] leading-[1.6] font-bold whitespace-nowrap tabular-nums shadow-lg"
        :class="turn === i ? 'bg-emerald-300 text-emerald-950 ring-4 ring-emerald-300/40' : 'bg-black/75 text-white'"
      >{{ label(h) }}</span>
      <Transition name="pop">
        <span v-if="verdict(h)" :key="verdict(h)!.text" class="rounded-full px-[.7em] text-[.85em] leading-[1.6] font-extrabold tracking-wider whitespace-nowrap uppercase shadow-lg" :class="verdict(h)!.tone">
          {{ verdict(h)!.text }}
        </span>
      </Transition>
    </div>
  </template>

  <!-- Plaque du joueur, avec son temps de parole. -->
  <div v-if="box" class="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2" :style="{ ...at(plate), fontSize: cq(15) }">
    <div
      class="relative flex items-center gap-[.4em] overflow-hidden rounded-full bg-black/70 py-[.25em] ps-[.35em] pe-[.8em] whitespace-nowrap shadow-lg backdrop-blur"
      :class="[turn !== null && 'ring-2 ring-emerald-300', mine && turn === null && 'ring-1 ring-white/40']"
    >
      <span class="size-[.9em] shrink-0 rounded-full border-2 border-dashed border-white/70" :style="{ background: seatColor(seat) }" />
      <span class="max-w-[8em] truncate font-semibold">{{ box.name }}</span>
      <span v-if="mine" class="text-white/55">(vous)</span>
      <button
        v-if="canStand"
        type="button"
        class="pointer-events-auto -me-[.4em] grid size-[1.4em] place-items-center rounded-full text-white/55 transition hover:bg-white/15 hover:text-white"
        :aria-label="`Se lever de la place ${seat}`"
        title="Se lever"
        @click="emit('stand')"
      >
        <UIcon name="i-lucide-x" class="size-[.9em]" />
      </button>
      <span
        v-if="turn !== null && timer"
        :key="timer.key"
        class="clock absolute inset-x-0 bottom-0 h-[.15em] origin-left bg-emerald-300"
        :style="{ animationDuration: `${timer.total}ms`, animationDelay: `${-timer.elapsed}ms` }"
      />
    </div>
  </div>
</template>

<style scoped>
.spot {
  transform: translate(-50%, -50%);
}
.invite {
  animation: invite 1.4s ease-in-out infinite;
}
@keyframes invite {
  50% { box-shadow: 0 0 0 .6cqw rgb(110 231 183 / .25); }
}
.slot {
  transform: translate(-50%, -50%) rotate(var(--r));
  transition: left .4s ease, top .4s ease, transform .4s ease;
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
.pile {
  transform: translate(-50%, calc(-100% + var(--lift)));
}
.to-house {
  animation: to-house .8s ease-in .5s both;
}
@keyframes to-house {
  to { transform: translate(calc(-50% + var(--hx)), calc(-100% + var(--lift) + var(--hy))) scale(.6); opacity: 0; }
}
.from-house {
  animation: from-house .8s cubic-bezier(.2, .8, .3, 1) .5s both;
}
@keyframes from-house {
  from { transform: translate(calc(-50% + var(--hx)), calc(-100% + var(--lift) + var(--hy))) scale(.6); opacity: 0; }
}
.stack-enter-active {
  transition: opacity .2s, transform .25s cubic-bezier(.3, 1.6, .5, 1);
}
.stack-leave-active {
  transition: opacity .3s;
}
.stack-enter-from {
  opacity: 0;
}
.stack-leave-to {
  opacity: 0;
}
.pop-enter-active {
  transition: opacity .25s, transform .35s cubic-bezier(.3, 1.6, .5, 1);
}
.pop-enter-from {
  opacity: 0;
  transform: scale(.4);
}
.clock {
  animation: clock linear both;
}
@keyframes clock {
  to { transform: scaleX(0); }
}
</style>
