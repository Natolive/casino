<script setup lang="ts">
import { ROLES, type AdminUserDto, type Role } from '@casino/shared'

useHead({ title: 'Admin' })

const api = useApi()
const toast = useToast()
const { user: me } = useAuth()
const users = ref(await api<AdminUserDto[]>('/admin/users'))
const ROLE_LABEL: Record<Role, string> = { player: 'Joueur', admin: 'Admin' }

async function update(user: AdminUserDto, changes: Partial<Pick<AdminUserDto, 'role' | 'balance'>>) {
  try {
    Object.assign(user, await api<AdminUserDto>(`/admin/users/${user.id}`, { method: 'PATCH', body: changes }))
    toast.add({ title: `${fullName(user)} mis à jour`, color: 'success', icon: 'i-lucide-check' })
  } catch (e) {
    toast.add({ title: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
    users.value = await api<AdminUserDto[]>('/admin/users')
  }
}

const fullName = (user: AdminUserDto) => `${user.firstName} ${user.lastName}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 py-3 sm:px-8">
    <header class="flex items-center justify-between gap-4">
      <UButton to="/" variant="ghost" color="neutral" icon="i-lucide-chevron-left" label="Tables" />
      <h1 class="font-display gold-text text-2xl font-bold italic sm:text-3xl">Admin</h1>
      <AccountMenu />
    </header>

    <main class="mt-8">
      <h2 class="font-display text-xl font-bold">Joueurs <span class="text-muted text-base">({{ users.length }})</span></h2>
      <div class="gold-frame mt-4 overflow-x-auto rounded-2xl">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead class="text-muted text-xs tracking-widest uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Joueur</th>
              <th class="px-4 py-3 font-semibold">Inscrit le</th>
              <th class="px-4 py-3 font-semibold">Rôle</th>
              <th class="px-4 py-3 font-semibold">Jetons</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-t border-white/5">
              <td class="px-4 py-2">
                <p class="font-semibold">
                  {{ fullName(user) }} <span v-if="user.id === me?.id" class="text-dimmed font-normal">(toi)</span>
                </p>
                <p class="text-muted text-xs">{{ user.email }}</p>
              </td>
              <td class="text-muted px-4 py-2">{{ fmtDate(user.createdAt) }}</td>
              <td class="px-4 py-2">
                <USelect
                  :model-value="user.role"
                  :items="ROLES.map((value) => ({ value, label: ROLE_LABEL[value] }))"
                  :disabled="user.id === me?.id"
                  :aria-label="`Rôle de ${fullName(user)}`"
                  class="w-32"
                  @update:model-value="(role) => update(user, { role: role as Role })"
                />
              </td>
              <td class="px-4 py-2">
                <UInputNumber
                  :model-value="user.balance"
                  :min="0"
                  :step="100"
                  :aria-label="`Jetons de ${fullName(user)}`"
                  class="w-40"
                  @update:model-value="(balance) => balance != null && balance !== user.balance && update(user, { balance })"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
