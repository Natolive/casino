<script setup lang="ts">
const { user, logout } = useAuth()
</script>

<template>
  <div v-if="user" class="flex items-center gap-1">
    <UButton v-if="user.role === 'admin'" to="/admin" variant="ghost" color="neutral" icon="i-lucide-shield" label="Admin" />
    <span class="text-muted hidden px-2 text-sm sm:inline">{{ user.firstName }} {{ user.lastName }}</span>
    <UButton variant="ghost" color="neutral" icon="i-lucide-log-out" aria-label="Se déconnecter" @click="logout" />
  </div>
</template>
