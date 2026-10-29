<!-- Un blackjack en éventail (as de pique, roi de cœur) et deux jetons : carte de l'accueil. -->
<template>
  <div class="relative">
    <BlackjackCardDefs />
    <div class="absolute top-[8%] left-[18%] w-[44%] -rotate-12 transition duration-700 group-hover:-rotate-[18deg]"><BlackjackCard card="AS" /></div>
    <div class="absolute top-[12%] left-[40%] w-[44%] rotate-12 transition duration-700 group-hover:rotate-[18deg]"><BlackjackCard card="KH" /></div>
    <svg viewBox="-24 -24 48 48" class="absolute bottom-[4%] left-[10%] w-[26%] drop-shadow-[0_6px_6px_rgba(0,0,0,.6)]">
      <TableChipDefs />
      <TableChip :amount="100" :r="22" />
    </svg>
    <svg viewBox="-24 -24 48 48" class="absolute bottom-[10%] left-[26%] w-[22%] drop-shadow-[0_6px_6px_rgba(0,0,0,.6)]">
      <TableChip :amount="25" :r="22" />
    </svg>
  </div>
</template>
