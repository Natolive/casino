<script setup lang="ts">
import { APP_NAME, GAME_ROOMS, STARTING_BALANCE } from '@casino/shared'

useHead({ title: 'Choisis ta table', titleTemplate: APP_NAME + ' · %s' })

// À l'affiche : les jeux déjà ouverts, en grand ; chaque salle liste ensuite tous ses jeux.
const featured = GAME_ROOMS.flatMap((room) => room.games).filter((game) => game.path)
</script>

<template>
  <main class="relative flex min-h-dvh flex-col px-3 py-10 sm:px-8 sm:py-16">
    <AccountMenu class="absolute end-4 top-3 sm:end-8" />
    <header class="text-center">
      <p class="text-emerald-300/80 text-xs font-semibold tracking-[.4em] uppercase">Jetons fictifs · frissons réels</p>
      <h1 class="font-display brand-text mt-4 text-5xl font-bold tracking-tight sm:text-7xl">{{ APP_NAME }}</h1>
      <p class="text-muted mx-auto mt-6 max-w-lg text-lg">
        À quelle table veux-tu t’asseoir&nbsp;? {{ fmtChips(STARTING_BALANCE) }} jetons t’attendent, offerts par la maison.
      </p>
    </header>

    <section class="mt-14 grid gap-6" :class="{ 'md:grid-cols-2': featured.length > 1 }" aria-label="À l’affiche">
      <NuxtLink
        v-for="game in featured"
        :key="game.id"
        :to="game.path"
        class="group panel relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl p-8 text-center transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(52,211,153,.45)] sm:flex-row sm:text-start"
      >
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_20%_50%,rgba(52,211,153,.12),transparent)]" />
        <HomeWheelEmblem v-if="game.id === 'roulette'" class="relative size-44 shrink-0 drop-shadow-[0_18px_30px_rgba(0,0,0,.6)] transition duration-700 group-hover:scale-105 sm:size-56" />
        <HomeCardsEmblem v-else-if="game.id === 'blackjack'" class="relative size-44 shrink-0 transition duration-700 group-hover:scale-105 sm:size-56" />
        <UIcon v-else :name="game.icon" class="relative size-32 shrink-0 text-emerald-400" />
        <div class="relative">
          <p class="text-xs font-semibold tracking-[.3em] text-emerald-300/80 uppercase">À l’affiche</p>
          <h2 class="font-display mt-2 text-4xl font-bold">{{ game.name }}</h2>
          <p class="text-muted mt-1">{{ game.tagline }}</p>
          <span class="bg-emerald-400 text-emerald-950 mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bold shadow-lg transition group-hover:bg-emerald-300">
            Prendre place <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </NuxtLink>
    </section>

    <section v-for="room in GAME_ROOMS" :key="room.id" class="mt-12" :aria-labelledby="`room-${room.id}`">
      <h2 :id="`room-${room.id}`" class="font-display flex items-center gap-4 text-sm font-semibold tracking-[.35em] text-[#f4efe3] uppercase">
        {{ room.name }} <span class="h-px flex-1 bg-gradient-to-r from-amber-200/40 to-transparent" />
      </h2>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <component
          :is="game.path ? 'NuxtLink' : 'div'"
          v-for="game in room.games"
          :key="game.id"
          :to="game.path"
          class="flex items-center gap-3 rounded-2xl p-4"
          :class="game.path ? 'panel transition hover:-translate-y-0.5 hover:border-emerald-400/40' : 'border border-dashed border-white/10 opacity-60'"
        >
          <UIcon :name="game.icon" class="size-8 shrink-0" :class="game.path ? 'text-emerald-400' : 'text-emerald-400/60'" />
          <div class="min-w-0">
            <p class="font-display truncate font-bold">{{ game.name }}</p>
            <p class="text-muted truncate text-xs">{{ game.path ? game.tagline : 'Bientôt à la table' }}</p>
          </div>
        </component>
      </div>
    </section>

    <footer class="text-dimmed mt-14 text-center text-xs">Aucun argent réel : les jetons n’ont aucune valeur. Jouez pour le plaisir.</footer>
  </main>
</template>
