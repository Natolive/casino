<script setup lang="ts">
import { colorOf, WHEEL } from '@casino/shared'

// Roue vue de dessus, en SVG (carte de l'accueil).
const STEP = 360 / WHEEL.length
const point = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`
}
const sector = (i: number, inner: number, outer: number) =>
  `M${point((i - 0.5) * STEP, outer)} A${outer},${outer} 0 0 1 ${point((i + 0.5) * STEP, outer)} L${point((i + 0.5) * STEP, inner)} A${inner},${inner} 0 0 0 ${point((i - 0.5) * STEP, inner)} Z`
</script>

<template>
  <svg viewBox="-100 -100 200 200">
    <defs>
      <radialGradient id="emblem-wood" r="1">
        <stop offset=".55" stop-color="#2a1208" />
        <stop offset=".9" stop-color="#6b3517" />
        <stop offset="1" stop-color="#2a1208" />
      </radialGradient>
      <radialGradient id="emblem-cone" r="1">
        <stop offset="0" stop-color="#8a4c22" />
        <stop offset="1" stop-color="#3a1a0b" />
      </radialGradient>
      <linearGradient id="emblem-brass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fbe7a8" />
        <stop offset=".5" stop-color="#c9902a" />
        <stop offset="1" stop-color="#fbe7a8" />
      </linearGradient>
    </defs>
    <circle r="99" fill="url(#emblem-wood)" stroke="url(#emblem-brass)" stroke-width="1.5" />
    <g class="rotor">
      <path v-for="(n, i) in WHEEL" :key="n" :d="sector(i, 52, 78)" :style="{ fill: `var(--color-pocket-${colorOf(n)})` }" stroke="#e0ad35" stroke-width=".6" />
      <text
        v-for="(n, i) in WHEEL"
        :key="`t${n}`"
        :transform="`rotate(${i * STEP}) translate(0 -70)`"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="7"
        font-weight="700"
        font-family="Space Grotesk, sans-serif"
        fill="#f7f1e1"
      >{{ n }}</text>
      <circle r="52" fill="url(#emblem-cone)" stroke="url(#emblem-brass)" stroke-width="1.2" />
      <g stroke="url(#emblem-brass)" stroke-width="3" stroke-linecap="round">
        <line x1="-26" y1="0" x2="26" y2="0" />
        <line x1="0" y1="-26" x2="0" y2="26" />
      </g>
      <circle r="9" fill="url(#emblem-brass)" />
    </g>
    <circle class="ball" cx="0" cy="-86" r="4.5" fill="#faf7ee" />
  </svg>
</template>

<style scoped>
.rotor {
  animation: spin 24s linear infinite;
}
.ball {
  transform-origin: 0 0;
  animation: spin 5s linear infinite reverse;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
