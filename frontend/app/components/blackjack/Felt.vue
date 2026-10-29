<script setup lang="ts">
import { BLACKJACK_MAX_BET, BLACKJACK_SEATS, CHIPS } from '@casino/shared'
import { along, BOX_R, DISCARD, H, RACK, SHOE, W } from '~/utils/blackjack-layout'

// Le décor de la table, en SVG : tapis de feutre dans son boudin de cuir, inscriptions dorées en arc, cercles de mise,
// rack de jetons du croupier, sabot et défausse. Rien n'y bouge : cartes et jetons sont posés par-dessus.
const SEATS = Array.from({ length: BLACKJACK_SEATS }, (_, i) => i + 1)

// Arc large et plat, sous le croupier, de gauche à droite : son point bas en `bottom`, ses bouts à ±`half` du centre.
const arc = (bottom: number, r: number, half: number) => {
  const y = bottom - r + Math.sqrt(r * r - half * half)
  return `M${600 - half},${y} A${r},${r} 0 0 0 ${600 + half},${y}`
}
const TABLE = 'M14 6H1186A586 604 0 0 1 14 6Z'

// Rack du croupier : des tubes de jetons couchés, vus de dessus, deux par valeur, centrés. Chaque tube montre la tranche
// de ses jetons empilés : une bande par jeton, ses inserts décalés d'un jeton à l'autre.
const STEP = 27
const rack = [...CHIPS, ...CHIPS].map((value, i, all) => ({
  x: RACK.x + (i - (all.length - 1) / 2) * STEP,
  body: CHIP_STYLES[value]!.body,
  edge: CHIP_STYLES[value]!.edge,
}))
const SLICES = Array.from({ length: 11 }, (_, i) => ({ y: 4 + i * 3.2, shift: (i * 7) % 12 }))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="absolute inset-0 size-full" aria-hidden="true">
    <TableChipDefs />
    <defs>
      <radialGradient id="felt" cx="50%" cy="20%" r="85%">
        <stop offset="0" stop-color="#1c7a52" />
        <stop offset=".6" stop-color="#0f5236" />
        <stop offset="1" stop-color="#082d1e" />
      </radialGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5a2e17" />
        <stop offset=".5" stop-color="#3a1b0c" />
        <stop offset="1" stop-color="#1c0b04" />
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#b98a2e" />
        <stop offset=".5" stop-color="#f3d58a" />
        <stop offset="1" stop-color="#b98a2e" />
      </linearGradient>
      <!-- Tube de jetons : sombre sur les bords, reflet au centre. -->
      <linearGradient id="tube" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".55" />
        <stop offset=".35" stop-color="#fff" stop-opacity=".18" />
        <stop offset=".5" stop-color="#fff" stop-opacity=".05" />
        <stop offset="1" stop-color="#000" stop-opacity=".6" />
      </linearGradient>
      <linearGradient id="rack-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a2512" />
        <stop offset="1" stop-color="#1e0d05" />
      </linearGradient>
      <!-- Grain du feutre. -->
      <filter id="felt-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <path id="arc-title" :d="arc(240, 900, 360)" />
      <path id="arc-rule" :d="arc(272, 930, 330)" />
      <clipPath id="table-clip"><path :d="TABLE" /></clipPath>
    </defs>

    <!-- Boudin de cuir, puis le feutre et son grain. -->
    <path :d="TABLE" fill="none" stroke="url(#rail)" stroke-width="30" stroke-linejoin="round" />
    <path :d="TABLE" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2" transform="translate(0 2)" />
    <path :d="TABLE" fill="url(#felt)" />
    <rect :width="W" :height="H" fill="#fff" filter="url(#felt-grain)" clip-path="url(#table-clip)" />
    <!-- Lumière du lustre, et liseré doré le long du boudin. -->
    <ellipse cx="600" cy="230" rx="420" ry="260" fill="#fff" fill-opacity=".04" clip-path="url(#table-clip)" />
    <path d="M40 8A560 580 0 0 0 1160 8" fill="none" stroke="url(#gold)" stroke-opacity=".55" stroke-width="2" transform="translate(0 0)" clip-path="url(#table-clip)" />

    <!-- Inscriptions. -->
    <text font-family="Georgia, 'Times New Roman', serif" fill="url(#gold)" font-size="27" font-weight="700" letter-spacing="5">
      <textPath href="#arc-title" startOffset="50%" text-anchor="middle">LE BLACKJACK PAIE 3 POUR 2</textPath>
    </text>
    <text font-family="Manrope, sans-serif" fill="#f4efe3" fill-opacity=".62" font-size="13.5" font-weight="700" letter-spacing="3.5">
      <textPath href="#arc-rule" startOffset="50%" text-anchor="middle">LE CROUPIER TIRE À 16 ET RESTE SUR TOUT 17</textPath>
    </text>
    <path :d="arc(292, 950, 400)" fill="none" stroke="url(#gold)" stroke-opacity=".5" stroke-width="1.5" />
    <path :d="arc(299, 958, 400)" fill="none" stroke="url(#gold)" stroke-opacity=".25" stroke-width="1" />

    <!-- Cercles de mise. -->
    <g v-for="seat in SEATS" :key="seat" :transform="`translate(${along(seat, BOX_R).x} ${along(seat, BOX_R).y})`">
      <circle r="43" fill="#000" fill-opacity=".14" stroke="#f4efe3" stroke-opacity=".55" stroke-width="2.5" />
      <circle r="36" fill="none" stroke="url(#gold)" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 5" />
    </g>

    <!-- Rack du croupier, encastré dans le bord : bac en bois, liseré laiton, tubes de jetons. -->
    <g :transform="`translate(0 ${RACK.y - 24})`">
      <rect :x="RACK.x - 182" y="-7" width="364" height="54" rx="9" fill="url(#rack-wood)" stroke="#000" stroke-opacity=".7" />
      <rect :x="RACK.x - 182" y="-7" width="364" height="54" rx="9" fill="none" stroke="url(#gold)" stroke-opacity=".55" stroke-width="1.5" />
      <rect :x="RACK.x - 172" y="1" width="344" height="40" rx="5" fill="#120904" />
      <g v-for="(c, i) in rack" :key="i">
        <rect :x="c.x - 11" y="3" width="22" height="36" rx="3" :fill="c.body" />
        <!-- Tranches : un filet sombre entre deux jetons, et les inserts de couleur. -->
        <g v-for="(sl, k) in SLICES" :key="k">
          <rect :x="c.x - 11" :y="sl.y + 2.4" width="22" height=".8" fill="#000" fill-opacity=".45" />
          <rect :x="c.x - 11 + sl.shift" :y="sl.y" width="4" height="2.4" :fill="c.edge" fill-opacity=".85" />
          <rect :x="c.x - 11 + ((sl.shift + 12) % 20)" :y="sl.y" width="3" height="2.4" :fill="c.edge" fill-opacity=".6" />
        </g>
        <rect :x="c.x - 11" y="3" width="22" height="36" rx="3" fill="url(#tube)" />
      </g>
    </g>

    <!-- Sabot (à droite du croupier) et défausse (à sa gauche). -->
    <g :transform="`translate(${SHOE.x} ${SHOE.y}) rotate(-18)`">
      <rect x="-62" y="-46" width="124" height="92" rx="10" fill="#111" stroke="#3b3b3b" stroke-width="2" />
      <rect x="-50" y="-38" width="86" height="76" rx="5" fill="url(#card-lattice)" stroke="#d9b45a" stroke-width="2" />
      <path d="M36 -46 62 -20V46H36Z" fill="#1d1d1d" />
      <text x="0" y="62" text-anchor="middle" font-family="Manrope, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#f4efe3" fill-opacity=".45">SABOT · 6 JEUX</text>
    </g>
    <g :transform="`translate(${DISCARD.x} ${DISCARD.y}) rotate(18)`">
      <rect x="-56" y="-44" width="112" height="88" rx="8" fill="#000" fill-opacity=".28" stroke="#f4efe3" stroke-opacity=".25" stroke-width="2" stroke-dasharray="6 5" />
      <text x="0" y="5" text-anchor="middle" font-family="Manrope, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#f4efe3" fill-opacity=".4">DÉFAUSSE</text>
    </g>

    <!-- Limites de la table. -->
    <g :transform="`translate(${RACK.x + 290} ${RACK.y - 4})`" font-family="Manrope, sans-serif" text-anchor="middle">
      <text font-size="12" font-weight="700" letter-spacing="2.5" fill="#f4efe3" fill-opacity=".5">MISE {{ CHIPS[0] }} – {{ fmtChips(BLACKJACK_MAX_BET) }}</text>
    </g>
  </svg>
</template>
