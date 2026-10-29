import type { LoginDto, RegisterDto, UserDto } from '@casino/shared'

// Le joueur connecté, chargé une fois par le middleware puis partagé par toutes les pages.
export function useAuth() {
  const user = useState<UserDto | null | undefined>('user', () => undefined)
  const api = useApi()
  const route = useRoute()

  async function load() {
    if (user.value === undefined) user.value = (await api<UserDto | null>('/auth/me')) || null
    return user.value
  }

  // Connecte (ou inscrit), puis renvoie vers la page demandée avant la connexion (`?next=`, même site seulement).
  async function enter(mode: 'login' | 'register', body: LoginDto | RegisterDto) {
    user.value = await api<UserDto>(`/auth/${mode}`, { method: 'POST', body })
    const next = route.query.next
    await navigateTo(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/')
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, load, enter, logout }
}
