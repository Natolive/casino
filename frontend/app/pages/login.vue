<script setup lang="ts">
import { loginSchema, type LoginDto } from '@casino/shared'

definePageMeta({ layout: 'auth', guest: true })
useHead({ title: 'Connexion' })

const { enter } = useAuth()
const toast = useToast()
const route = useRoute()
const state = reactive<LoginDto>({ email: '', password: '' })
const shaking = ref(false)

async function submit() {
  try {
    await enter('login', state)
  } catch (e) {
    shaking.value = true
    toast.add({ title: 'Connexion impossible', description: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}
</script>

<template>
  <div>
    <p class="text-gold-300/80 text-xs font-semibold tracking-[.4em] uppercase">Bon retour</p>
    <h1 class="font-display mt-2 text-4xl font-bold">Connexion</h1>
    <p class="text-muted mt-3">Ta place t’attend à la table, et tes jetons aussi.</p>

    <UForm
      :schema="loginSchema"
      :state="state"
      class="mt-10 space-y-6"
      :class="{ shake: shaking }"
      @submit="submit"
      @error="shaking = true"
      @animationend.self="shaking = false"
    >
      <UFormField label="Email" name="email" class="field" style="--i: 0">
        <UInput v-model="state.email" type="email" autocomplete="email" icon="i-lucide-mail" size="xl" class="w-full" />
      </UFormField>
      <UFormField label="Mot de passe" name="password" class="field" style="--i: 1">
        <PasswordInput v-model="state.password" autocomplete="current-password" />
      </UFormField>
      <UButton type="submit" size="xl" block loading-auto class="field font-bold" style="--i: 2" trailing-icon="i-lucide-arrow-right">
        Prendre place
      </UButton>
    </UForm>

    <p class="text-muted mt-8 text-sm">
      Pas encore de compte&nbsp;?
      <ULink :to="{ path: '/register', query: route.query }" class="text-gold-300 font-semibold">Inscris-toi</ULink>, 1&nbsp;000 jetons offerts.
    </p>
    <p class="text-dimmed mt-2 text-sm">Mot de passe oublié&nbsp;? Demande à un admin.</p>
  </div>
</template>
