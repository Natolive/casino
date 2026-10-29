<script setup lang="ts">
import { CHIPS, colorOf } from '@casino/shared'

useHead({ title: 'Roulette' })

const wheel = useTemplateRef('wheel')
const game = useRoulette((n) => wheel.value!.spinTo(n))
const { history, historyKey, chip, open, phase, round, remaining, timer, verified, outcome, staked, available, shown, lastBets, undoStack } = game

await game.load()

// Hash et graine abrégés pour le bandeau ; complets au survol.
const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`

// Solde affiché : compte jusqu'à la nouvelle valeur.
const displayed = ref(available.value)
watch(available, (to) => {
  const from = displayed.value
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 700)
    displayed.value = Math.round(from + (to - from) * (1 - (1 - t) ** 3))
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
})

const fmt = (n: number) => n.toLocaleString('fr-FR')

const muted = ref(casinoSound.muted)
function toggleSound() {
  muted.value = !muted.value
  casinoSound.setMuted(muted.value)
}
const PILL = { red: 'bg-pocket-red', black: 'bg-pocket-black', green: 'bg-pocket-green' }
const broke = computed(() => available.value < CHIPS[0] && !staked.value)

// Tapis classique, ou cylindre à plat pour les annonces.
const view = ref<'table' | 'racetrack'>('table')
const VIEWS = [
  { label: 'Tapis', value: 'table', icon: 'i-lucide-grid-3x3' },
  { label: 'Cylindre', value: 'racetrack', icon: 'i-lucide-circle-dashed' },
]
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="flex items-center justify-between gap-2 px-3 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-8">
      <UButton to="/" variant="ghost" color="neutral" icon="i-lucide-chevron-left" aria-label="Tables" class="justify-self-start"><span class="hidden sm:inline">Tables</span></UButton>
      <h1 class="font-display brand-text text-xl font-bold tracking-tight sm:text-3xl">Roulette</h1>
      <div class="flex items-center gap-1 justify-self-end sm:gap-2">
        <AccountMenu />
        <UButton
          variant="ghost"
          color="neutral"
          :icon="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
          :aria-label="muted ? 'Remettre le son' : 'Couper le son'"
          @click="toggleSound"
        />
        <div class="panel flex items-center gap-2 rounded-full py-1.5 ps-2 pe-4">
          <span class="grid size-7 place-items-center rounded-full bg-emerald-400 text-emerald-950"><UIcon name="i-lucide-coins" class="size-4" /></span>
          <span class="font-display text-lg font-bold tabular-nums">{{ fmt(displayed) }}</span>
        </div>
      </div>
    </header>

    <main class="grid flex-1 gap-4 px-3 pb-6 sm:px-6 xl:grid-cols-[5fr_7fr] xl:gap-8">
      <section class="relative aspect-square max-h-[70vh] w-full xl:max-h-[calc(100dvh-5rem)] xl:self-center" aria-label="Cylindre">
        <div class="absolute inset-0"><RouletteWheel ref="wheel" /></div>
        <Transition name="banner">
          <p v-if="phase === 'spinning'" class="font-display text-emerald-200 absolute inset-x-0 bottom-6 text-center text-2xl font-semibold tracking-tight drop-shadow">Rien ne va plus…</p>
        </Transition>
        <Transition name="medal">
          <div v-if="phase === 'result' && outcome" class="absolute inset-x-0 bottom-4 flex flex-col items-center" role="status">
            <div
              class="font-display grid size-24 place-items-center rounded-full border-4 border-emerald-300 text-5xl font-bold text-white shadow-[0_0_40px_rgba(52,211,153,.55)]"
              :class="PILL[colorOf(outcome.result)]"
            >
              {{ outcome.result }}
            </div>
            <p v-if="outcome.staked" class="mt-3 rounded-full bg-black/60 px-5 py-1.5 text-lg font-bold backdrop-blur">
              <span v-if="outcome.won > outcome.staked" class="text-emerald-300">Gagné&nbsp;! +{{ fmt(outcome.won - outcome.staked) }}</span>
              <span v-else-if="outcome.won" class="text-highlighted">{{ fmt(outcome.won) }} jetons récupérés</span>
              <span v-else class="text-muted">Perdu, la maison remercie</span>
            </p>
          </div>
        </Transition>
      </section>

      <!-- Résultat en plein écran quelques secondes, seulement si l'on a misé, sans bloquer le tapis ; la médaille sur la roue prend le relais. -->
      <Teleport to="body">
        <div
          v-if="phase === 'result' && outcome?.staked"
          :key="round?.id"
          class="takeover pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="font-display grid size-40 place-items-center rounded-full border-[6px] border-emerald-300 text-7xl font-bold text-white shadow-[0_0_80px_rgba(52,211,153,.55)] sm:size-52 sm:text-8xl"
              :class="PILL[colorOf(outcome.result)]"
            >
              {{ outcome.result }}
            </div>
            <p v-if="outcome.won > outcome.staked" class="font-display brand-text mt-8 text-6xl font-bold tracking-tight tabular-nums sm:text-8xl">+{{ fmt(outcome.won - outcome.staked) }}</p>
            <p v-if="outcome.won > outcome.staked" class="mt-2 text-xl font-semibold text-emerald-200">Gagné&nbsp;!</p>
            <p v-else-if="outcome.won" class="font-display mt-8 text-4xl font-bold">{{ fmt(outcome.won) }} jetons récupérés</p>
            <p v-else class="font-display text-muted mt-8 text-4xl font-bold">Perdu, la maison remercie</p>
          </div>
        </div>
      </Teleport>

      <section class="flex min-w-0 flex-col justify-center gap-4">
        <div class="flex items-center gap-3">
          <span class="text-muted shrink-0 text-xs font-semibold tracking-widest uppercase">Derniers</span>
          <TransitionGroup tag="ol" name="pill" class="flex min-w-0 gap-1.5 overflow-hidden" aria-label="Derniers numéros sortis">
            <li
              v-for="(n, i) in history"
              :key="historyKey - i"
              class="font-display grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-1 ring-white/15"
              :class="[PILL[colorOf(n)], i === 0 && 'ring-emerald-300 ring-2']"
            >
              {{ n }}
            </li>
            <li v-if="!history.length" key="none" class="text-dimmed text-sm">Aucun tour joué</li>
          </TransitionGroup>
        </div>

        <!-- Compte à rebours du croupier : la ligne se vide jusqu'à la fin des mises, puis jusqu'au tour suivant. -->
        <div class="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            v-if="timer"
            :key="timer.key"
            class="timer h-full origin-left rounded-full transition-colors"
            :class="open ? (remaining <= 5 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/30'"
            :style="{ animationDuration: `${timer.total}ms`, animationDelay: `${-timer.elapsed}ms` }"
          />
        </div>

        <UTabs v-model="view" :items="VIEWS" :content="false" size="sm" class="w-fit" />

        <div class="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <div class="panel min-w-[636px] rounded-3xl p-2">
            <RouletteBettingTable
              v-if="view === 'table'"
              :bets="shown"
              :winner="phase === 'result' ? outcome?.result ?? null : null"
              :locked="!open"
              :wins="game.wins"
              @place="game.place"
              @remove="game.remove"
              @move="game.move"
            />
            <RouletteRacetrack v-else :bets="shown" :winner="phase === 'result' ? outcome?.result ?? null : null" :locked="!open" @announce="game.announce" />
          </div>
        </div>
        <p v-if="view === 'table'" class="text-dimmed -mt-2 text-xs">Clic&nbsp;: poser un jeton (sur un filet ou un coin pour miser à cheval) · clic droit&nbsp;: retirer · glisser une pile&nbsp;: la déplacer, ou la sortir du tapis.</p>
        <p v-else class="text-dimmed -mt-2 text-xs">Clic sur un numéro&nbsp;: lui et ses deux voisins de chaque côté · sur un secteur&nbsp;: l’annonce, un jeton par mise.</p>

        <div class="flex flex-wrap items-center justify-between gap-4">
          <RouletteChipRack v-model="chip" :available="Math.max(available, 0)" />
          <div class="flex flex-wrap items-center gap-2">
            <UButton color="neutral" variant="soft" icon="i-lucide-undo-2" label="Annuler" :disabled="!open || !undoStack.length" @click="game.undo" />
            <UButton color="neutral" variant="soft" icon="i-lucide-trash-2" label="Effacer" :disabled="!open || !staked" @click="game.clear" />
            <UButton color="neutral" variant="soft" icon="i-lucide-copy-plus" label="Doubler" :disabled="!open || !staked" @click="game.double" />
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-rotate-ccw"
              label="Rejouer"
              :disabled="!open || !!staked || !Object.keys(lastBets).length"
              @click="game.rebet"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <p class="text-muted">
            Mise <span class="font-display text-highlighted ms-1 text-2xl font-bold tabular-nums">{{ fmt(staked) }}</span>
          </p>
          <UButton v-if="broke" size="xl" icon="i-lucide-coins" label="Recharger mes jetons" @click="game.refill" />
          <!-- Le croupier mène la table : pas de bouton, un compte à rebours. -->
          <p class="croupier font-display rounded-full px-8 py-3 text-lg font-semibold" :class="phase === 'betting' && remaining <= 5 && 'animate-pulse'" role="timer">
            <template v-if="phase === 'betting' && remaining">Faites vos jeux · <span class="tabular-nums">{{ remaining }}&nbsp;s</span></template>
            <template v-else-if="phase === 'result'">Prochain tour dans <span class="tabular-nums">{{ remaining }}&nbsp;s</span></template>
            <template v-else>Rien ne va plus</template>
          </p>
        </div>

        <!-- Tirage vérifiable : hash publié avant les mises, graine révélée au tirage et recalculée ici. -->
        <p v-if="round" class="text-dimmed flex min-w-0 items-center gap-1.5 font-mono text-[11px]">
          <UIcon :name="verified ? 'i-lucide-shield-check' : verified === false ? 'i-lucide-shield-alert' : 'i-lucide-lock'" class="size-3.5 shrink-0" :class="verified ? 'text-success' : verified === false && 'text-error'" />
          <span class="truncate">
            Tour {{ round.id }} · sha256 <span :title="round.hash">{{ short(round.hash) }}</span>
            <template v-if="round.seed">
              · graine <span :title="round.seed">{{ short(round.seed) }}</span>
              {{ verified ? '· vérifié' : verified === false ? '· ne correspond pas' : '' }}
            </template>
          </span>
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.takeover {
  animation: takeover 4s ease both;
}
.takeover > div {
  animation: medal-pop .6s cubic-bezier(.3, 1.5, .5, 1) both;
}
@keyframes takeover {
  0% { opacity: 0; }
  10%, 80% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}
@keyframes medal-pop {
  from { transform: scale(.6); }
}
@media (prefers-reduced-motion: reduce) {
  .takeover > div { animation: none; }
}
.timer {
  animation: timer linear both;
}
@keyframes timer {
  to { transform: scaleX(0); }
}
.croupier {
  color: #022c22;
  background: var(--brand-gradient);
  box-shadow: 0 10px 30px -10px rgb(52 211 153 / .6);
}
.medal-enter-active {
  transition: opacity .4s, transform .5s cubic-bezier(.3, 1.5, .5, 1);
}
.medal-enter-from {
  opacity: 0;
  transform: scale(.6);
}
.medal-leave-active,
.banner-enter-active,
.banner-leave-active {
  transition: opacity .3s;
}
.medal-leave-to,
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
}
.pill-enter-active {
  transition: all .4s;
}
.pill-enter-from {
  opacity: 0;
  transform: scale(.4);
}
.pill-move {
  transition: transform .4s;
}
</style>
