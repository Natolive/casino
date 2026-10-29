<script setup lang="ts">
// Barre du haut de la table : retour aux tables, compte, son, et le solde qui défile jusqu'à sa nouvelle valeur.
const props = defineProps<{ balance: number }>()

const displayed = ref(props.balance)
let frame = 0
watch(
  () => props.balance,
  (to) => {
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
    <h1 class="font-display brand-text text-xl font-bold tracking-tight sm:text-3xl">Roulette</h1>
    <div class="flex items-center gap-1 justify-self-end sm:gap-2">
      <AccountMenu />
      <UButton
        variant="ghost"
        color="neutral"
        :icon="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
        :aria-label="muted ? 'Remettre le son' : 'Couper le son'"
        @click="toggleSound"
      />
      <div class="panel flex items-center gap-2 rounded-full py-1.5 ps-2 pe-4">
        <span class="grid size-7 place-items-center rounded-full bg-emerald-400 text-emerald-950"><UIcon name="i-lucide-coins" class="size-4" /></span>
        <span class="font-display text-lg font-bold tabular-nums">{{ fmtChips(displayed) }}</span>
      </div>
    </div>
  </header>
</template>
