// Pas de jeu sans compte : pages privées par défaut, `definePageMeta({ guest: true })` pour les pages réservées aux
// visiteurs (connexion, inscription) ; /admin seulement pour les admins.
export default defineNuxtRouteMiddleware(async (to) => {
  const user = await useAuth().load()
  if (to.meta.guest) return user ? navigateTo('/') : undefined
  if (!user) return navigateTo({ path: '/login', query: to.path === '/' ? {} : { next: to.fullPath } })
  if (to.path.startsWith('/admin') && user.role !== 'admin') return navigateTo('/')
})
