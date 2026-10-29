<script setup lang="ts">
import { CHIPS } from '@casino/shared'

// Le choix du jeton à poser ; ceux qu'on ne peut plus payer sont grisés.
defineProps<{ available: number }>()
const chip = defineModel<number>({ required: true })
</script>

<template>
  <div class="flex items-end gap-1.5 sm:gap-2.5" role="radiogroup" aria-label="Valeur du jeton">
    <button
      v-for="value in CHIPS"
      :key="value"
      type="button"
      role="radio"
      :aria-checked="chip === value"
      :aria-label="`Jeton de ${value}`"
      :disabled="value > available && chip !== value"
      class="relative transition duration-200 ease-out hover:-translate-y-1 disabled:opacity-35 disabled:hover:translate-y-0"
      :class="chip === value ? '-translate-y-2 hover:-translate-y-2' : ''"
      @click="chip = value"
    >
      <svg viewBox="-24 -24 48 48" class="size-11 drop-shadow-[0_4px_4px_rgba(0,0,0,.6)] sm:size-14">
        <RouletteChip :amount="value" :r="22" />
      </svg>
      <span v-if="chip === value" class="absolute -inset-1 rounded-full ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(52,211,153,.7)]" />
    </button>
  </div>
</template>
