<script setup lang="ts">
import { registerSchema, STARTING_BALANCE, type RegisterDto } from '@casino/shared'

definePageMeta({ layout: 'auth', guest: true })
useHead({ title: 'Inscription' })

const { enter } = useAuth()
const toast = useToast()
const route = useRoute()
const state = reactive<RegisterDto>({ firstName: '', lastName: '', email: '', password: '' })
const shaking = ref(false)

async function submit() {
  try {
    await enter('register', state)
  } catch (e) {
    shaking.value = true
    toast.add({ title: 'Inscription impossible', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div>
    <p class="text-emerald-300/80 text-xs font-semibold tracking-[.4em] uppercase">Nouveau joueur</p>
    <h1 class="font-display mt-2 text-4xl font-bold">Inscription</h1>
    <p class="text-muted mt-3">{{ fmtChips(STARTING_BALANCE) }} jetons offerts par la maison, dès ton arrivée.</p>

    <UForm
      :schema="registerSchema"
      :state="state"
      class="mt-10 space-y-6"
      :class="{ shake: shaking }"
      @submit="submit"
      @error="shaking = true"
      @animationend.self="shaking = false"
    >
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Prénom" name="firstName" class="field" style="--i: 0">
          <UInput v-model="state.firstName" autocomplete="given-name" size="xl" class="w-full" />
        </UFormField>
        <UFormField label="Nom" name="lastName" class="field" style="--i: 1">
          <UInput v-model="state.lastName" autocomplete="family-name" size="xl" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Email" name="email" class="field" style="--i: 2">
        <UInput v-model="state.email" type="email" autocomplete="email" icon="i-lucide-mail" size="xl" class="w-full" />
      </UFormField>
      <UFormField label="Mot de passe" name="password" help="8 caractères minimum." class="field" style="--i: 3">
        <PasswordInput v-model="state.password" autocomplete="new-password" />
      </UFormField>
      <UButton type="submit" size="xl" block loading-auto class="field font-bold" style="--i: 4" trailing-icon="i-lucide-arrow-right">
        Créer mon compte
      </UButton>
    </UForm>

    <p class="text-muted mt-8 text-sm">
      Déjà un compte&nbsp;?
      <ULink :to="{ path: '/login', query: route.query }" class="text-emerald-300 font-semibold">Connecte-toi</ULink>.
    </p>
  </div>
</template>
