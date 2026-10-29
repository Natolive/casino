<script setup lang="ts">
// Barre du haut de chaque page : retour aux tables, enseigne, compte ; sur une table, le son et le solde qui défile
// jusqu'à sa nouvelle valeur.
const props = defineProps<{ title: string; balance?: number }>()

const displayed = ref(props.balance ?? 0)
let frame = 0
watch(
  () => props.balance,
  (to) => {
    if (to == null) return
    cancelAnimationFrame(frame)
    const from = displayed.value
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      displayed.value = Math.round(from + (to - from) * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  },
)
onBeforeUnmount(() => cancelAnimationFrame(frame))

const muted = ref(casinoSound.muted)
function toggleSound() {
  muted.value = !muted.value
  casinoSound.setMuted(muted.value)
}
</script>

<template>
  <header class="flex items-center justify-between gap-2 px-3 py-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-8">
    <UButton to="/" variant="ghost" color="neutral" icon="i-lucide-chevron-left" aria-label="Tables" class="justify-self-start"><span class="hidden sm:inline">Tables</span></UButton>
    <!-- Enseigne de la table : capitales espacées, ivoire, entre deux filets dorés. -->
    <h1 class="font-display flex items-center gap-3 text-sm font-semibold tracking-[.45em] text-[#f4efe3] uppercase sm:gap-4 sm:text-lg">
      <span class="hidden h-px w-12 bg-gradient-to-r from-transparent to-amber-200/50 sm:block" />
      <span class="text-[.5em] text-amber-200/80">◆</span>
      <span class="-me-[.45em]">{{ title }}</span>
      <span class="text-[.5em] text-amber-200/80">◆</span>
      <span class="hidden h-px w-12 bg-gradient-to-l from-transparent to-amber-200/50 sm:block" />
    </h1>
    <div class="flex items-center gap-1 justify-self-end sm:gap-2">
      <AccountMenu />
      <UButton
        v-if="balance != null"
        variant="ghost"
        color="neutral"
        :icon="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
        :aria-label="muted ? 'Remettre le son' : 'Couper le son'"
        @click="toggleSound"
      />
      <div v-if="balance != null" class="panel flex items-center gap-2 rounded-full py-1.5 ps-2 pe-4">
        <span class="grid size-7 place-items-center rounded-full bg-emerald-400 text-emerald-950"><UIcon name="i-lucide-coins" class="size-4" /></span>
        <span class="font-display text-lg font-bold tabular-nums">{{ fmtChips(displayed) }}</span>
      </div>
    </div>
  </header>
</template>
