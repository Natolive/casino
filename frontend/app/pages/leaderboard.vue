<script setup lang="ts">
import type { LeaderboardDto } from '@casino/shared'

useHead({ title: 'Classement' })

const { top, me } = await useApi()<LeaderboardDto>('/leaderboard')
const MEDALS = ['text-amber-300', 'text-slate-300', 'text-orange-400']
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader title="Classement" />

    <main class="px-3 pb-8 sm:px-8">
      <p class="text-muted text-center">
        Tu es <span class="font-bold text-white">{{ me.rank }}<sup>{{ me.rank === 1 ? 'er' : 'e' }}</sup></span> avec
        <span class="font-bold text-white tabular-nums">{{ fmtChips(me.balance) }}</span> jetons.
      </p>
      <ol class="panel mt-6 overflow-hidden rounded-2xl">
        <li
          v-for="(entry, i) in top"
          :key="i"
          class="flex items-center gap-4 border-t border-white/5 px-4 py-3 first:border-t-0"
          :class="{ 'bg-emerald-400/10': entry.you }"
        >
          <span class="font-display w-8 text-center text-lg font-bold tabular-nums" :class="MEDALS[entry.rank - 1] ?? 'text-muted'">
            <UIcon v-if="entry.rank <= 3" name="i-lucide-trophy" class="size-5 align-middle" :aria-label="`${entry.rank}e`" />
            <template v-else>{{ entry.rank }}</template>
          </span>
          <span class="flex-1 truncate font-semibold">
            {{ entry.name }} <span v-if="entry.you" class="text-dimmed font-normal">(toi)</span>
          </span>
          <span class="font-display flex items-center gap-1.5 font-bold tabular-nums">
            {{ fmtChips(entry.balance) }} <UIcon name="i-lucide-coins" class="size-4 text-emerald-400" />
          </span>
        </li>
      </ol>
    </main>
  </div>
</template>
