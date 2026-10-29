<script setup lang="ts">
import type { TableRoundDto } from '@casino/shared'

// Tirage vérifiable : hash publié avant les mises, graine révélée au tirage et recalculée dans le navigateur. Abrégés,
// complets au survol.
defineProps<{ round: TableRoundDto; verified: boolean | null }>()
const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`
</script>

<template>
  <p class="flex min-w-0 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 font-mono text-[11px] text-white/60 backdrop-blur">
    <UIcon
      :name="verified ? 'i-lucide-shield-check' : verified === false ? 'i-lucide-shield-alert' : 'i-lucide-lock'"
      class="size-3.5 shrink-0"
      :class="verified ? 'text-success' : verified === false && 'text-error'"
    />
    <span class="truncate">
      Tour {{ round.id }} · sha256 <span :title="round.hash">{{ short(round.hash) }}</span>
      <template v-if="round.seed">
        · graine <span :title="round.seed">{{ short(round.seed) }}</span>
        {{ verified ? '· vérifié' : verified === false ? '· ne correspond pas' : '' }}
      </template>
    </span>
  </p>
</template>
