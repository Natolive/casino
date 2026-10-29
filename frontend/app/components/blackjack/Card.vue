<script setup lang="ts">
import { rankOf, suitOf, type Card } from '@casino/shared'

// Une carte à jouer en SVG (symboles de CardDefs), recto et verso : `card` null, elle est face cachée, et se retourne en
// 3D quand on la découvre. `deal` : elle arrive du sabot face cachée et se retourne en se posant. Sa taille suit celle de
// son conteneur.
const props = defineProps<{ card: Card | null; deal?: boolean }>()

const landing = ref(props.deal)
onMounted(() => landing.value && setTimeout(() => (landing.value = false), 260))

// Dessin du recto, mémorisé tant que la carte est cachée (la face ne change pas pendant qu'elle se retourne).
const face = ref<Card | null>(props.card)
watch(() => props.card, (card) => card && (face.value = card))

const RED = new Set(['H', 'D'])
const LABEL: Record<string, string> = { T: '10' }

// Pips des cartes de 2 à 10, sur une grille de 3 colonnes (x) et une hauteur de 0 à 1 (y) ; ceux du bas sont tête-bêche.
const L = 74
const M = 125
const R = 176
const col = (x: number, ...ys: number[]) => ys.map((y) => [x, y] as const)
const PIPS: Record<string, (readonly [number, number])[]> = {
  2: col(M, 0, 1),
  3: col(M, 0, 0.5, 1),
  4: [...col(L, 0, 1), ...col(R, 0, 1)],
  5: [...col(L, 0, 1), ...col(R, 0, 1), ...col(M, 0.5)],
  6: [...col(L, 0, 0.5, 1), ...col(R, 0, 0.5, 1)],
  7: [...col(L, 0, 0.5, 1), ...col(R, 0, 0.5, 1), ...col(M, 0.25)],
  8: [...col(L, 0, 0.5, 1), ...col(R, 0, 0.5, 1), ...col(M, 0.25, 0.75)],
  9: [...col(L, 0, 1 / 3, 2 / 3, 1), ...col(R, 0, 1 / 3, 2 / 3, 1), ...col(M, 0.5)],
  T: [...col(L, 0, 1 / 3, 2 / 3, 1), ...col(R, 0, 1 / 3, 2 / 3, 1), ...col(M, 1 / 6, 5 / 6)],
}
const pipY = (t: number) => 72 + t * 206

const view = computed(() => {
  if (!face.value) return null
  const rank = rankOf(face.value)
  const suit = suitOf(face.value)
  return {
    rank,
    suit: `#suit-${suit}`,
    label: LABEL[rank] ?? rank,
    color: RED.has(suit) ? '#b3122a' : '#16161a',
    pips: PIPS[rank]?.map(([x, t]) => ({ x, y: pipY(t), flip: t > 0.5 })) ?? [],
    court: 'JQK'.includes(rank),
  }
})
// Cadre et couleurs des figures, comme les jeux français : or, rouge et bleu.
const COURT = { K: '#c8952c', Q: '#b3122a', J: '#1d4fa8' } as Record<string, string>
</script>

<template>
  <div class="card" :class="{ down: !card || landing }">
    <div class="inner">
      <svg class="side" viewBox="0 0 250 350" role="img" :aria-label="view ? `${view.label} de ${{ '#suit-S': 'pique', '#suit-H': 'cœur', '#suit-D': 'carreau', '#suit-C': 'trèfle' }[view.suit]}` : 'Carte cachée'">
        <rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="#fbf8f1" stroke="#d6cfbf" stroke-width="3" />
        <g v-if="view" :fill="view.color">
          <!-- Index des coins, tête-bêche. -->
          <g v-for="flip in [false, true]" :key="String(flip)" :transform="flip ? 'rotate(180 125 175)' : undefined">
            <text x="30" y="56" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="50" font-weight="700" :letter-spacing="view.label.length > 1 ? -5 : 0">{{ view.label }}</text>
            <use :href="view.suit" x="12" y="66" width="36" height="36" />
          </g>

          <!-- As : un grand pip au centre. -->
          <use v-if="view.rank === 'A'" :href="view.suit" x="65" y="115" width="120" height="120" />

          <!-- Figures : cadre, puis deux moitiés tête-bêche (couvre-chef, lettre, couleur). -->
          <g v-else-if="view.court">
            <rect x="52" y="50" width="146" height="250" rx="8" fill="#fff8e6" :stroke="COURT[view.rank]" stroke-width="5" />
            <rect x="60" y="58" width="130" height="234" rx="5" fill="none" :stroke="COURT[view.rank]" stroke-width="1.5" stroke-opacity=".6" />
            <path d="M60 175h130" :stroke="COURT[view.rank]" stroke-width="1.5" stroke-dasharray="4 4" />
            <g v-for="flip in [false, true]" :key="String(flip)" :transform="flip ? 'rotate(180 125 175)' : undefined">
              <use :href="`#crown-${view.rank}`" x="88" y="66" width="74" height="44" :fill="COURT[view.rank]" />
              <text x="125" y="160" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" :fill="view.color">{{ view.rank === 'K' ? 'R' : view.rank === 'Q' ? 'D' : 'V' }}</text>
              <use :href="view.suit" x="148" y="132" width="30" height="30" />
            </g>
          </g>

          <!-- 2 à 10 : les pips à leur place. -->
          <use
            v-for="(p, i) in view.pips"
            v-else
            :key="i"
            :href="view.suit"
            :x="p.x - 22"
            :y="p.y - 22"
            width="44"
            height="44"
            :transform="p.flip ? `rotate(180 ${p.x} ${p.y})` : undefined"
          />
        </g>
        <rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#card-sheen)" />
      </svg>
      <svg class="side back" viewBox="0 0 250 350" aria-hidden="true">
        <rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="#fbf8f1" stroke="#d6cfbf" stroke-width="3" />
        <rect x="16" y="16" width="218" height="318" rx="9" fill="url(#card-lattice)" stroke="#d9b45a" stroke-width="3" />
        <circle cx="125" cy="175" r="34" fill="#0b3d2c" stroke="#d9b45a" stroke-width="3" />
        <use href="#suit-S" x="105" y="155" width="40" height="40" fill="#d9b45a" />
        <rect x="1.5" y="1.5" width="247" height="347" rx="16" fill="url(#card-sheen)" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.card {
  aspect-ratio: 5 / 7;
  perspective: 900px;
}
.inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.3, .7, .2, 1);
}
.down .inner {
  transform: rotateY(180deg);
}
.side {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  /* Sur chaque face : un filtre sur le parent aplatirait la 3D (et le retournement). */
  filter: drop-shadow(0 4px 5px rgb(0 0 0 / .45));
}
.back {
  transform: rotateY(180deg);
}
</style>
