<script setup lang="ts">
// Le cylindre en 3D (utils/wheel-scene.ts) ; `spinTo(n)` lance la bille et se résout quand elle est tombée sur n.
// La scène enchaîne ses plans comme une réalisation télé ; ici, l'effet de coupe. `landed` : numéro sorti avant notre
// arrivée, la bille y est posée sans être lancée.
const props = defineProps<{ landed: number | null }>()
const canvas = useTemplateRef('canvas')
let scene: WheelScene | undefined
let observer: ResizeObserver | undefined
const ready = ref(false)
// Change à chaque coupe : relance l'effet de coupe.
const cut = ref(0)

onMounted(async () => {
  scene = await createWheelScene(canvas.value!, () => cut.value++)
  observer = new ResizeObserver(([entry]) => scene?.resize(entry!.contentRect.width, entry!.contentRect.height))
  observer.observe(canvas.value!)
  watch(() => props.landed, (n) => n !== null && scene?.place(n), { immediate: true })
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
    <div v-if="!ready" class="text-muted absolute inset-0 grid place-items-center font-display">Le croupier prépare la table…</div>
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
