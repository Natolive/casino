<script setup lang="ts">
// Le cylindre en 3D (utils/wheel-scene.ts) ; `spinTo(n)` lance la bille et se résout quand elle est tombée sur n.
// La scène enchaîne ses plans comme une réalisation télé ; ici, le bandeau « en direct » ou « ralenti » et l'effet de coupe.
const canvas = useTemplateRef('canvas')
let scene: WheelScene | undefined
let observer: ResizeObserver | undefined
const ready = ref(false)
const shot = ref<Shot>('large')
// Change à chaque coupe : relance l'effet de coupe.
const cut = ref(0)

const CAMERAS: Record<Shot, string> = { large: 'Caméra 1', table: 'Caméra 2', dessus: 'Caméra 3', bille: 'Caméra bille', ralenti: 'Ralenti' }

onMounted(async () => {
  scene = await createWheelScene(canvas.value!, (next) => {
    shot.value = next
    cut.value++
  })
  observer = new ResizeObserver(([entry]) => scene?.resize(entry!.contentRect.width, entry!.contentRect.height))
  observer.observe(canvas.value!)
  ready.value = true
})

onBeforeUnmount(() => {
  observer?.disconnect()
  scene?.dispose()
})

defineExpose({ spinTo: (n: number) => scene?.spinTo(n) ?? Promise.resolve() })
</script>

<template>
  <!-- Fond transparent : le feutre s'efface dans la salle, sans cadre. -->
  <div class="relative size-full">
    <!-- Coupe : la vue s'éteint un bref instant à chaque changement de plan (deux animations identiques en alternance pour
         la relancer). -->
    <canvas
      ref="canvas"
      class="block size-full transition-opacity duration-700"
      :class="ready ? 'opacity-100' : 'opacity-0'"
      :style="cut ? { animation: `${cut % 2 ? 'cut-a' : 'cut-b'} .3s ease-out` } : undefined"
    />
    <div v-if="!ready" class="text-muted absolute inset-0 grid place-items-center font-display italic">Le croupier prépare la table…</div>

    <!-- Bandeau de la réalisation. -->
    <p
      v-if="ready"
      class="pointer-events-none absolute top-[4%] left-[4%] flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold tracking-[.2em] uppercase backdrop-blur"
      aria-live="polite"
    >
      <template v-if="shot === 'ralenti'">
        <UIcon name="i-lucide-rewind" class="text-gold-300 size-3.5" />
        <span class="text-gold-200">Ralenti</span>
      </template>
      <template v-else>
        <span class="size-2 animate-pulse rounded-full bg-red-500" />
        <span class="text-white">En direct</span>
        <span class="text-white/50">· {{ CAMERAS[shot] }}</span>
      </template>
    </p>
  </div>
</template>

<style>
@keyframes cut-a {
  from { opacity: 0.35; }
}
@keyframes cut-b {
  from { opacity: 0.35; }
}
</style>
