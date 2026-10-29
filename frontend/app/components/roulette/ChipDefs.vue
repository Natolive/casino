<!-- Dégradés et ombre des jetons, à poser une fois dans chaque <svg> qui en dessine. -->
<template>
  <defs>
    <radialGradient id="chip-shine" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity=".35" />
      <stop offset=".5" stop-color="#fff" stop-opacity="0" />
      <stop offset="1" stop-color="#000" stop-opacity=".3" />
    </radialGradient>
    <filter id="chip-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="1.5" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".6" />
    </filter>
  </defs>
</template>
