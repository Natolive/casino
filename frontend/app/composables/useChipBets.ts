import { STARTING_BALANCE, type WalletDto } from '@casino/shared'

// Des mises par case (une case du tapis, une place à la table…) : clé → jetons.
export type Bets = Record<string, number>
export const totalOf = (bets: Bets) => Object.values(bets).reduce((a, b) => a + b, 0)

// Les jetons d'un joueur à une table, communs à tous les jeux. Les mises se posent tout de suite à l'écran et partent à
// l'API peu après le dernier geste (`save`, débitées dès qu'elle les accepte) ; seul un refus les annule. Solde affiché
// (`available`) : celui de l'API (`wallet`), plus les mises qu'elle a déjà débitées (`synced`), moins celles posées.
export function useChipBets(options: {
  // La table accepte des jetons (mises ouvertes, compte à rebours pas à zéro…).
  open: Ref<boolean>
  maxBet: number
  // Le tour en cours : une mise part pour le tour où elle a été posée, jamais pour le suivant.
  round: () => number | null
  // Enregistre les mises du tour (elles remplacent `synced`) ; rend le solde.
  save: (round: number, next: Bets, synced: Bets) => Promise<number>
  // Après un refus : ce que l'API a vraiment enregistré sur ce tour (null : il est fini). Par défaut, `synced`.
  recover?: (round: number) => Promise<Bets | null>
}) {
  const api = useApi()
  const toast = useToast()

  const wallet = ref(0)
  const bets = shallowRef<Bets>({})
  const synced = shallowRef<Bets>({})
  const chip = ref(10)
  // Les mises du dernier tour joué, pour « Rejouer ».
  const lastBets = shallowRef<Bets>({})
  const undoStack = shallowRef<Bets[]>([])

  const staked = computed(() => totalOf(bets.value))
  const available = computed(() => wallet.value + totalOf(synced.value) - staked.value)

  const fail = (e: unknown) => toast.add({ title: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
  const warn = (title: string) => toast.add({ title, color: 'warning', icon: 'i-lucide-hand' })

  // Une seule file vers l'API : mises, et tout geste qui doit passer avant ou après elles (s'asseoir…).
  let queue = Promise.resolve()
  const enqueue = (task: () => Promise<void>) => void (queue = queue.then(task))
  let syncing: ReturnType<typeof setTimeout> | undefined
  onScopeDispose(() => clearTimeout(syncing))
  watch(bets, (next) => {
    clearTimeout(syncing)
    const round = options.round()
    if (!options.open.value || next === synced.value || round === null) return
    syncing = setTimeout(() => enqueue(() => send(round, next)), 250)
  })

  async function send(round: number, next: Bets) {
    try {
      const balance = await options.save(round, next, synced.value)
      if (options.round() !== round) return
      synced.value = next
      wallet.value = balance
    } catch (e) {
      fail(e)
      // La table reprend ce que l'API a vraiment enregistré.
      const restored = await (options.recover ? options.recover(round) : Promise.resolve(synced.value)).catch(() => null)
      if (options.round() !== round || !restored) return
      bets.value = synced.value = restored
      void refresh()
    }
  }

  async function refresh() {
    try {
      wallet.value = (await api<WalletDto>('/wallet')).balance
    } catch {
      // API injoignable : le prochain règlement remettra le solde à jour.
    }
  }

  // Nouveau tour : mises reprises de l'API (un onglet qui revient en cours de mises), ou table débarrassée.
  function reset(posed: Bets = {}) {
    clearTimeout(syncing)
    bets.value = synced.value = posed
    undoStack.value = []
  }

  // Tour réglé : les mises enregistrées sont jouées (un jeton posé au dernier instant, pas encore parti, ne compte pas),
  // le gain est compté tout de suite ; le solde relu en arrière-plan a le dernier mot. Rend les mises jouées.
  function settle(won: number) {
    clearTimeout(syncing)
    const played = synced.value
    if (totalOf(played)) lastBets.value = played
    reset()
    wallet.value += won
    void refresh()
    return played
  }

  // On ne touche aux mises que quand la table les accepte ; `change` rend false pour renoncer.
  function edit(change: (next: Bets) => boolean | void) {
    if (!options.open.value) return
    const next = { ...bets.value }
    if (change(next) === false) return
    for (const key in next) if (!next[key]) delete next[key]
    undoStack.value = [...undoStack.value, bets.value]
    bets.value = next
  }

  const tooMuch = () => `${fmtChips(options.maxBet)} jetons au plus par case.`

  const place = (key: string | number) =>
    edit((next) => {
      const amount = Math.min(chip.value, options.maxBet - (next[key] ?? 0), available.value)
      if (amount <= 0) return warn(available.value <= 0 ? 'Plus de jetons disponibles.' : tooMuch()), false
      next[key] = (next[key] ?? 0) + amount
      casinoSound.chip()
    })
  const remove = (key: string | number) => edit((next) => (next[key] ? void delete next[key] : false))
  const clear = () => edit((next) => (staked.value ? void Object.keys(next).forEach((k) => delete next[k]) : false))
  const double = () =>
    edit((next) => {
      if (!staked.value) return false
      if (staked.value > available.value) return warn('Pas assez de jetons pour doubler.'), false
      for (const key in next) next[key] = Math.min(next[key]! * 2, options.maxBet)
    })
  // Les mises du tour passé (`from` : celles qu'on peut encore poser, par défaut toutes).
  const rebet = (from: Bets = lastBets.value) =>
    edit((next) => {
      const cost = totalOf(from)
      if (!cost || staked.value) return false
      if (cost > available.value) return warn('Pas assez de jetons pour rejouer les mêmes mises.'), false
      Object.assign(next, from)
    })
  function undo() {
    if (!options.open.value || !undoStack.value.length) return
    bets.value = undoStack.value.at(-1)!
    undoStack.value = undoStack.value.slice(0, -1)
  }

  // Recharge comptée tout de suite (le solde remonte aux jetons de départ) ; l'API confirme le montant.
  async function refill() {
    wallet.value = Math.max(wallet.value, STARTING_BALANCE)
    toast.add({ title: 'Jetons rechargés. Bonne chance !', color: 'success', icon: 'i-lucide-coins' })
    try {
      wallet.value = (await api<WalletDto>('/wallet/refill', { method: 'POST' })).balance
    } catch (e) {
      fail(e)
      void refresh()
    }
  }

  return { wallet, bets, synced, chip, lastBets, undoStack, staked, available, warn, fail, enqueue, refresh, reset, settle, edit, place, remove, clear, double, rebet, undo, refill }
}
