<!-- Couleurs (pique, cœur, carreau, trèfle), dos et figures des cartes, posés une fois dans la page : chaque carte y
     renvoie par <use>. Invisible, hors du flux. -->
<template>
  <svg class="pointer-events-none absolute size-0 overflow-hidden" aria-hidden="true">
    <defs>
      <symbol id="suit-S" viewBox="0 0 100 100">
        <path d="M50 3C60 21 96 38 96 61c0 15-11 23-23 23-9 0-16-5-19-12 1 10 5 18 13 25H33c8-7 12-15 13-25-3 7-10 12-19 12C15 84 4 76 4 61 4 38 40 21 50 3Z" />
      </symbol>
      <symbol id="suit-H" viewBox="0 0 100 100">
        <path d="M50 92C20 68 4 50 4 31 4 15 16 5 29 5c10 0 17 6 21 14 4-8 11-14 21-14 13 0 25 10 25 26 0 19-16 37-46 61Z" />
      </symbol>
      <symbol id="suit-D" viewBox="0 0 100 100">
        <path d="M50 2Q66 30 90 50 66 70 50 98 34 70 10 50 34 30 50 2Z" />
      </symbol>
      <symbol id="suit-C" viewBox="0 0 100 100">
        <circle cx="50" cy="27" r="21" />
        <circle cx="26" cy="58" r="21" />
        <circle cx="74" cy="58" r="21" />
        <path d="M45 52c0 22-6 35-14 44h38c-8-9-14-22-14-44Z" />
      </symbol>

      <!-- Couvre-chefs des figures : couronne du roi, diadème de la dame, toque à plume du valet. -->
      <symbol id="crown-K" viewBox="0 0 100 60">
        <path d="M8 54 4 14l22 18L50 4l24 28 22-18-4 40Z" />
        <circle cx="4" cy="12" r="5" /><circle cx="50" cy="4" r="5" /><circle cx="96" cy="12" r="5" />
      </symbol>
      <symbol id="crown-Q" viewBox="0 0 100 60">
        <path d="M10 54c0-18 6-30 14-38l10 18 16-28 16 28 10-18c8 8 14 20 14 38Z" />
        <circle cx="50" cy="8" r="6" />
      </symbol>
      <symbol id="crown-J" viewBox="0 0 100 60">
        <path d="M12 54c2-18 14-30 38-30s36 12 38 30Z" />
        <path d="M60 26C66 12 80 4 96 6 86 10 76 18 70 30Z" />
      </symbol>

      <!-- Dos : treillis émeraude sur fond vert sombre. -->
      <pattern id="card-lattice" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="16" height="16" fill="#0b3d2c" />
        <path d="M0 8h16M8 0v16" stroke="#1f7a57" stroke-width="2.5" />
        <circle cx="8" cy="8" r="2.4" fill="#d9b45a" />
      </pattern>
      <linearGradient id="card-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22" />
        <stop offset=".45" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>
  </svg>
</template>
