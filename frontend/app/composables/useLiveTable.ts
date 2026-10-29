// Une table en direct (WebSocket /ws/<jeu>) : le croupier pousse ses événements, dont `you` (qui est le joueur, à la
// connexion). Coupée (réseau, API redémarrée) : on se reconnecte de plus en plus lentement, avec un peu de hasard pour que
// toute la salle ne revienne pas d'un coup ; à la reconnexion, le croupier renvoie la table. Et l'horloge du serveur,
// pour les comptes à rebours.
export function useLiveTable<E extends { type: string }>(path: string, onEvent: (event: E) => void) {
  const toast = useToast()
  const player = ref<number | null>(null)

  // Horloge calée sur celle du serveur à chaque état daté reçu (`sync`) ; `now` avance tout seul.
  let offset = 0
  const serverNow = () => Date.now() + offset
  const now = ref(Date.now())
  const clock = setInterval(() => (now.value = serverNow()), 250)
  function sync(server: number) {
    offset = server - Date.now()
    now.value = server
  }

  let socket: WebSocket | undefined
  let reconnecting: ReturnType<typeof setTimeout> | undefined
  let retries = 0
  let disposed = false
  onScopeDispose(() => {
    disposed = true
    socket?.close()
    clearInterval(clock)
    clearTimeout(reconnecting)
  })

  function connect() {
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${path}`)
    socket.onopen = () => (retries = 0)
    socket.onmessage = (e) => {
      const event = JSON.parse(e.data) as E | { type: 'you'; player: number }
      if (event.type === 'you') player.value = (event as { player: number }).player
      else onEvent(event as E)
    }
    socket.onclose = (e) => {
      if (disposed) return
      // 44xx : refus du croupier (session fermée, trop d'onglets), inutile d'insister ; on dit pourquoi la table s'arrête.
      if (e.code >= 4400 && e.code < 4500)
        return void toast.add({ title: e.reason || 'La table s’est déconnectée.', description: 'Rechargez la page pour revenir.', color: 'error', icon: 'i-lucide-unplug', duration: 0 })
      reconnecting = setTimeout(connect, Math.min(1000 * 2 ** retries++, 15_000) * (0.5 + Math.random()))
    }
  }

  return { player, now, serverNow, sync, connect }
}
