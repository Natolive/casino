<script setup lang="ts">
import { APP_NAME, GAMES, STARTING_BALANCE } from '@casino/shared'

useHead({ title: 'Choisis ta table', titleTemplate: APP_NAME + ' · %s' })
</script>

<template>
  <main class="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-10 sm:px-8 sm:py-16">
    <AccountMenu class="absolute end-4 top-3 sm:end-8" />
    <header class="text-center">
      <p class="text-emerald-300/80 text-xs font-semibold tracking-[.4em] uppercase">Jetons fictifs · frissons réels</p>
      <h1 class="font-display brand-text mt-4 text-5xl font-bold tracking-tight sm:text-7xl">{{ APP_NAME }}</h1>
      <p class="text-muted mx-auto mt-6 max-w-lg text-lg">
        À quelle table veux-tu t’asseoir&nbsp;? {{ STARTING_BALANCE.toLocaleString('fr-FR') }} jetons t’attendent, offerts par la maison.
      </p>
    </header>

    <section class="mt-14 grid flex-1 gap-6 md:grid-cols-3" aria-label="Jeux">
      <template v-for="game in GAMES" :key="game.id">
        <NuxtLink
          v-if="game.path"
          :to="game.path"
          class="group panel relative flex flex-col items-center overflow-hidden rounded-3xl p-8 text-center transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_rgba(52,211,153,.45)] md:col-span-1"
        >
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(52,211,153,.12),transparent)]" />
          <HomeWheelEmblem class="relative size-52 drop-shadow-[0_18px_30px_rgba(0,0,0,.6)] transition duration-700 group-hover:scale-105 sm:size-60" />
          <h2 class="font-display relative mt-8 text-3xl font-bold">{{ game.name }}</h2>
          <p class="text-muted relative mt-1">{{ game.tagline }}</p>
          <span class="bg-emerald-400 text-emerald-950 relative mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bold shadow-lg transition group-hover:bg-emerald-300">
            Prendre place <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-1" />
          </span>
        </NuxtLink>
        <div v-else class="relative flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-8 text-center opacity-60">
          <UIcon :name="game.icon" class="text-emerald-400/60 size-16" />
          <h2 class="font-display mt-6 text-2xl font-bold">{{ game.name }}</h2>
          <p class="text-muted mt-1 text-sm">{{ game.tagline }}</p>
        </div>
      </template>
    </section>

    <footer class="text-dimmed mt-14 text-center text-xs">Aucun argent réel : les jetons n’ont aucune valeur. Jouez pour le plaisir.</footer>
  </main>
</template>
