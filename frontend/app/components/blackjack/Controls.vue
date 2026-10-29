<script setup lang="ts">
import { BLACKJACK_SEATS, CHIPS, handValue, type Move } from '@casino/shared'

// Le panneau sous la table : pendant les mises, jetons et actions sur sa mise ; quand sa main a la parole, les coups (au
// clavier aussi : T, R, D, S) ; sinon, ce que fait la table.
const props = defineProps<{ game: ReturnType<typeof useBlackjack> }>()
const { table, phase, mine, playing, chip, staked, replayable, undoStack, available, remaining, timer, open, myHand, moves, acting } = props.game
const game = props.game

const MOVES: { move: Move; label: string; key: string; icon: string }[] = [
  { move: 'hit', label: 'Tirer', key: 'T', icon: 'i-lucide-plus' },
  { move: 'stand', label: 'Rester', key: 'R', icon: 'i-lucide-hand' },
  { move: 'double', label: 'Doubler', key: 'D', icon: 'i-lucide-copy-plus' },
  { move: 'split', label: 'Séparer', key: 'S', icon: 'i-lucide-split' },
]

function onKey(e: KeyboardEvent) {
  // Touche maintenue : un seul coup, pas une rafale de cartes.
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, textarea')) return
  const found = MOVES.find((m) => m.key === e.key.toUpperCase())
  if (found && myHand.value) game.play(found.move)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const broke = computed(() => available.value < CHIPS[0] && !staked.value)
const speaker = computed(() => {
  const t = table.value
  return t?.turn ? t.boxes.find((b) => b.seat === t.turn!.seat)?.name : null
})
// Bilan de son tour : ce que la table a rendu moins ce qu'il a mis.
const net = computed(() => {
  if (phase.value !== 'result' || !playing.value) return null
  return mine.value.flatMap((b) => b.hands).reduce((sum, h) => sum + (h.won ?? 0) - h.bet, 0)
})
const handLabel = computed(() => {
  if (!myHand.value) return ''
  const { total, soft } = handValue(myHand.value.cards)
  const where = [mine.value.length > 1 && `Case ${myHand.value.seat}`, myHand.value.hands > 1 && `main ${myHand.value.index + 1}`].filter(Boolean).join(', ')
  return `${where ? `${where} · ` : ''}${soft ? `${total - 10} ou ${total}` : total}`
})
</script>

<template>
  <section class="panel flex min-h-[8.5rem] flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl px-4 py-3 sm:px-6">
    <!-- Mises ouvertes. -->
    <template v-if="open">
      <div class="flex items-center gap-4" role="timer">
        <TableCountdown :timer="timer" :remaining="remaining" />
        <div>
          <p class="text-[11px] font-bold tracking-[.25em] text-emerald-300/80 uppercase">Mises ouvertes</p>
          <p class="font-display text-2xl font-semibold tracking-tight text-[#f4efe3]">Faites vos jeux</p>
        </div>
      </div>
      <TableChipRack v-model="chip" :available="Math.max(available, 0)" />
      <div class="flex flex-wrap items-center gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-undo-2" label="Annuler" :disabled="!undoStack.length" @click="game.undo" />
        <UButton color="neutral" variant="soft" icon="i-lucide-trash-2" label="Effacer" :disabled="!staked" @click="game.clear" />
        <UButton color="neutral" variant="soft" icon="i-lucide-copy-plus" label="Doubler" :disabled="!staked" @click="game.double" />
        <UButton color="neutral" variant="soft" icon="i-lucide-rotate-ccw" label="Rejouer" :disabled="!!staked || !Object.keys(replayable).length" @click="game.rebet()" />
      </div>
      <div class="ms-auto flex items-center gap-4">
        <p class="text-muted">Mise <span class="font-display text-highlighted ms-1 text-2xl font-bold tabular-nums">{{ fmtChips(staked) }}</span></p>
        <UButton v-if="broke" size="lg" icon="i-lucide-coins" label="Recharger" @click="game.refill" />
      </div>
      <p class="text-dimmed w-full text-xs">Clic sur une de vos cases&nbsp;: poser un jeton · clic droit&nbsp;: reprendre sa mise · fauteuil vide&nbsp;: une case de plus.</p>
    </template>

    <!-- Sa main a la parole. -->
    <template v-else-if="myHand">
      <div class="flex items-center gap-4" role="timer">
        <TableCountdown :timer="timer" :remaining="remaining" />
        <div>
          <p class="text-[11px] font-bold tracking-[.25em] text-emerald-300/80 uppercase">À vous de jouer</p>
          <p class="font-display text-2xl font-semibold tracking-tight text-[#f4efe3] tabular-nums">{{ handLabel }}</p>
        </div>
      </div>
      <div class="flex flex-1 flex-wrap justify-end gap-2">
        <UButton
          v-for="m in MOVES"
          :key="m.move"
          size="xl"
          :icon="m.icon"
          :color="m.move === 'hit' ? 'primary' : 'neutral'"
          :variant="m.move === 'hit' ? 'solid' : 'soft'"
          :disabled="acting || !moves.includes(m.move)"
          class="min-w-28 justify-center"
          @click="game.play(m.move)"
        >
          {{ m.label }}
          <UKbd :value="m.key" class="ms-1 hidden sm:inline-flex" />
        </UButton>
      </div>
    </template>

    <!-- Ce que fait la table. -->
    <div v-else class="flex items-center gap-4" role="status" aria-live="polite">
      <template v-if="!mine.length && phase === 'betting'">
        <UIcon name="i-lucide-eye" class="size-7 shrink-0 text-white/50" />
        <p class="text-muted">
          Vous regardez la partie.
          <template v-if="(table?.boxes.length ?? 0) < BLACKJACK_SEATS">Cliquez sur un fauteuil libre pour vous asseoir.</template>
          <template v-else>Table complète&nbsp;: une case se libère bientôt.</template>
        </p>
      </template>
      <template v-else-if="phase === 'betting'">
        <span class="size-2.5 animate-pulse rounded-full bg-red-500" />
        <p class="font-display text-xl font-semibold">Rien ne va plus</p>
      </template>
      <template v-else-if="phase === 'dealing'">
        <UIcon name="i-lucide-layers" class="size-7 shrink-0 text-emerald-300" />
        <p class="font-display text-xl font-semibold">Distribution des cartes<span v-if="!playing" class="text-muted font-sans text-base font-normal"> · vous ne jouez pas ce tour</span></p>
      </template>
      <template v-else-if="phase === 'playing'">
        <UIcon name="i-lucide-hourglass" class="size-7 shrink-0 text-emerald-300" />
        <p class="font-display text-xl font-semibold">Au tour de {{ speaker }}</p>
      </template>
      <template v-else-if="phase === 'dealer'">
        <UIcon name="i-lucide-user-round" class="size-7 shrink-0 text-amber-300" />
        <p class="font-display text-xl font-semibold">Le croupier retourne sa carte et tire</p>
      </template>
      <template v-else-if="phase === 'result'">
        <p v-if="net !== null" class="font-display text-2xl font-bold tabular-nums" :class="net > 0 ? 'brand-text' : net < 0 ? 'text-muted' : 'text-highlighted'">
          {{ net > 0 ? `+${fmtChips(net)}` : net < 0 ? 'Perdu, la maison remercie' : 'Mise rendue' }}
        </p>
        <p class="text-muted">Prochaine donne dans <span class="tabular-nums">{{ remaining }}&nbsp;s</span></p>
      </template>
    </div>
  </section>
</template>
