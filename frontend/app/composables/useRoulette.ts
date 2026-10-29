import { BETS, BETTING_MS, HISTORY_SIZE, MAX_BET, SPINNING_MS, payout, resultOf, type PlacedBet, type RoundDto, type SeatDto, type TableEvent, type TableRoundDto, type WalletDto } from '@casino/shared'

type Bets = Record<string, number>
export type Phase = 'betting' | 'spinning' | 'result'
export type Outcome = { result: number; staked: number; won: number }

const total = (bets: Bets) => Object.values(bets).reduce((a, b) => a + b, 0)
const toList = (bets: Bets) => Object.entries(bets).map(([bet, amount]) => ({ bet, amount }))
// Ordre des états de la table : tour après tour, les mises puis le tirage.
const order = (r: TableRoundDto) => r.id * 2 + (r.phase === 'spinning' ? 1 : 0)
const toBets = (list: RoundDto['bets']): Bets => Object.fromEntries(list.map((b) => [b.bet, b.amount]))

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// État de la table vue par ce joueur. Le croupier (l'API) mène les tours pour tout le monde et les pousse en direct par
// WebSocket, avec les joueurs autour de la table et leurs mises ; les jetons posés partent à l'API au fil de l'eau
// (débités tout de suite), et la roue montre le numéro quand les jeux sont faits. `roll` lance la bille sur un numéro et se résout quand elle est tombée.
export function useRoulette(roll: (n: number) => Promise<void>) {
  const api = useApi()
  const toast = useToast()

  // Solde, jetons du tour en cours compris (ils sont déjà débités côté API).
  const balance = ref(0)
  const history = ref<number[]>([])
  // Clé de la pastille la plus récente : augmente à chaque numéro sorti, pour que la liste anime l'arrivée.
  const historyKey = ref(0)
  const bets = ref<Bets>({})
  const chip = ref(10)
  const phase = ref<Phase>('spinning')
  const round = ref<TableRoundDto | null>(null)
  // Les joueurs assis (soi compris, si on a une place) et le nombre de spectateurs.
  const seats = ref<SeatDto[]>([])
  const spectators = ref(0)
  const player = ref<number | null>(null)
  // Sa place à la table ; null : spectateur, en attendant qu'une place se libère.
  const seat = computed(() => seats.value.find((s) => s.player === player.value)?.seat ?? null)
  const outcome = ref<Outcome | null>(null)
  // Le tirage révélé correspond-il au hash publié avant les mises ? null : pas encore révélé (ou navigateur sans WebCrypto).
  const verified = ref<boolean | null>(null)
  // Les mises du tour joué, gardées sur le tapis le temps d'afficher le résultat, puis rejouables.
  const settled = ref<Bets>({})
  const lastBets = ref<Bets>({})
  const undoStack = ref<Bets[]>([])

  const staked = computed(() => total(bets.value))
  const available = computed(() => balance.value - staked.value)
  const shown = computed(() => (phase.value === 'result' ? settled.value : bets.value))
  // Numéro à éclairer sur le tapis : seulement le temps du résultat.
  const winner = computed(() => (phase.value === 'result' ? (outcome.value?.result ?? null) : null))

  // Horloge calée sur celle du serveur, pour le compte à rebours.
  let offset = 0
  const now = ref(Date.now())
  const clock = setInterval(() => (now.value = Date.now()), 250)
  const remaining = computed(() => (round.value ? Math.max(0, Math.ceil((round.value.endsAt - now.value - offset) / 1000)) : 0))
  // Phase du croupier en cours : durée totale et temps déjà écoulé, pour la ligne du compte à rebours (animée en CSS, pas
  // à chaque tic). Recalculé seulement quand le tour est relu.
  const timer = computed(() => {
    if (!round.value) return null
    const total = round.value.phase === 'betting' ? BETTING_MS : SPINNING_MS
    return { key: `${round.value.id}-${round.value.phase}`, total, elapsed: total - (round.value.endsAt - Date.now() - offset) }
  })
  // Le tapis accepte des jetons : phase de mises et compte à rebours pas encore à zéro.
  const open = computed(() => phase.value === 'betting' && remaining.value > 0)

  // Les mises des autres joueurs, à poser sur le tapis à côté des siennes.
  const others = computed(() =>
    seats.value.filter((s) => s.player !== player.value).flatMap((s) => s.bets.map((b) => ({ key: b.bet, amount: b.amount, seat: s.seat }))),
  )

  let socket: WebSocket | undefined
  let reconnecting: ReturnType<typeof setTimeout> | undefined
  let retries = 0
  let disposed = false
  onScopeDispose(() => {
    disposed = true
    socket?.close()
    clearInterval(clock)
    clearTimeout(reconnecting)
    clearTimeout(syncing)
  })

  async function load() {
    const [wallet, results, current] = await Promise.all([
      api<WalletDto>('/wallet'),
      api<number[]>('/roulette/history'),
      api<RoundDto | null>('/roulette/round'),
    ])
    history.value = results
    balance.value = wallet.balance
    if (current) apply(current)
    if (current?.phase === 'betting') balance.value += total(bets.value)
    connect()
  }

  // La table en direct. Coupée (réseau, API redémarrée) : on se reconnecte de plus en plus lentement, avec un peu de
  // hasard pour que toute la salle ne revienne pas d'un coup ; à la reconnexion, le croupier renvoie le tour en cours.
  function connect() {
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/roulette`)
    socket.onopen = () => (retries = 0)
    socket.onmessage = (e) => {
      const event = JSON.parse(e.data) as TableEvent
      if (event.type === 'you') player.value = event.player
      else if (event.type === 'seats') ({ seats: seats.value, spectators: spectators.value } = event)
      else apply(event.round)
    }
    socket.onclose = (e) => {
      if (disposed) return
      // 44xx : refus du croupier (session fermée, trop d'onglets), inutile d'insister ; on dit pourquoi la table s'arrête.
      if (e.code >= 4400 && e.code < 4500)
        return void toast.add({ title: e.reason || 'La table s’est déconnectée.', description: 'Rechargez la page pour revenir.', color: 'error', icon: 'i-lucide-unplug', duration: 0 })
      reconnecting = setTimeout(connect, Math.min(1000 * 2 ** retries++, 15_000) * (0.5 + Math.random()))
    }
  }

  // Le tour poussé à tous ne porte pas les mises du joueur : seul celui envoyé à la connexion (ou relu) les a.
  function apply(next: TableRoundDto & { bets?: PlacedBet[] }) {
    const previous = round.value
    // Arrivé après plus récent (le tour envoyé à la connexion croise un changement de phase) : ignoré.
    if (previous && order(next) < order(previous)) return
    offset = next.now - Date.now()
    round.value = next
    if (next.phase === 'betting') {
      if (previous?.id === next.id) return
      // Faites vos jeux : nouveau tour, tapis débarrassé.
      phase.value = 'betting'
      outcome.value = null
      verified.value = null
      settled.value = {}
      undoStack.value = []
      bets.value = synced = toBets(next.bets ?? [])
      // Les jetons des autres du tour passé s'en vont avec les siens, sans attendre les places à jour.
      seats.value = seats.value.map((s) => ({ ...s, bets: [], won: null }))
      // Tirage du tour précédent jamais vu (onglet en veille, API redémarrée) : solde et historique relus.
      if (previous?.phase === 'betting') void resync()
    } else if (previous?.id === next.id && previous.phase === 'betting') {
      void reveal(next)
    } else if (previous?.id !== next.id) {
      // Arrivé en plein tirage, ou tirage d'un autre tour que celui où l'on misait : on attend le tour suivant.
      phase.value = 'spinning'
      bets.value = synced = {}
      if (previous) void resync()
    }
  }

  async function resync() {
    try {
      const [wallet, results] = await Promise.all([api<WalletDto>('/wallet'), api<number[]>('/roulette/history')])
      history.value = results
      historyKey.value += HISTORY_SIZE
      balance.value = wallet.balance + total(synced)
    } catch {
      // API injoignable : le prochain tirage vu remettra le solde à jour.
    }
  }

  // Rien ne va plus : la bille tombe sur le numéro tiré, puis le tapis montre ce qui est gagné.
  async function reveal(r: TableRoundDto) {
    clearTimeout(syncing)
    phase.value = 'spinning'
    void sha256(r.seed!)
      .then((hash) => (verified.value = hash === r.hash && resultOf(r.seed!) === r.result))
      .catch(() => (verified.value = null))
    // Onglet caché : pas d'animation (elle ne tourne pas en arrière-plan), le résultat directement.
    if (!document.hidden) await roll(r.result!)
    // Ce que l'API a enregistré (un jeton posé au dernier instant, pas encore parti, ne compte pas).
    const mine = synced
    history.value = [r.result!, ...history.value].slice(0, HISTORY_SIZE)
    historyKey.value++
    balance.value = (await api<WalletDto>('/wallet')).balance
    // Le tour suivant a déjà commencé (onglet revenu tard) : rien à afficher.
    if (round.value?.id !== r.id) return
    const won = payout(toList(mine), r.result!)
    outcome.value = { result: r.result!, staked: total(mine), won }
    if (total(mine)) lastBets.value = settled.value = mine
    bets.value = {}
    if (won > total(mine)) casinoSound.win()
    phase.value = 'result'
  }

  // Les jetons posés partent à l'API peu après le dernier geste ; l'API rend le solde, débité de la mise.
  let synced: Bets = {}
  let syncing: ReturnType<typeof setTimeout> | undefined
  let queue = Promise.resolve()
  watch(bets, (next) => {
    clearTimeout(syncing)
    if (phase.value !== 'betting' || next === synced) return
    // Le tour où les jetons ont été posés, pas celui en cours quand l'envoi part enfin.
    const id = round.value!.id
    syncing = setTimeout(() => (queue = queue.then(() => sync(id, next))), 250)
  })

  async function sync(id: number, sent: Bets) {
    try {
      const wallet = await api<WalletDto>('/roulette/bets', { method: 'PUT', body: { round: id, bets: toList(sent) } })
      synced = sent
      if (round.value?.id === id) balance.value = wallet.balance + total(sent)
    } catch (e) {
      toast.add({ title: apiErrorMessage(e), color: 'error', icon: 'i-lucide-circle-alert' })
      // Le tapis reprend ce que l'API a vraiment enregistré.
      const [wallet, current] = await Promise.all([api<WalletDto>('/wallet'), api<RoundDto | null>('/roulette/round')])
      if (current?.id !== id || current.phase !== 'betting') return
      bets.value = synced = toBets(current.bets)
      balance.value = wallet.balance + total(synced)
    }
  }

  function warn(title: string) {
    toast.add({ title, color: 'warning', icon: 'i-lucide-hand' })
  }

  // On ne touche au tapis que pendant les mises.
  function edit(change: (next: Bets) => boolean | void) {
    if (!open.value) return
    const before = { ...bets.value }
    const next = { ...bets.value }
    if (change(next) === false) return
    undoStack.value.push(before)
    bets.value = next
  }

  const place = (key: string) =>
    edit((next) => {
      const amount = Math.min(chip.value, MAX_BET - (next[key] ?? 0), available.value)
      if (amount <= 0) return warn(available.value <= 0 ? 'Plus de jetons disponibles.' : `${MAX_BET} jetons au plus par case.`), false
      next[key] = (next[key] ?? 0) + amount
      casinoSound.chip()
    })

  // Annonce du cylindre : un jeton sur chacune de ses mises, en un seul geste (annulable d'un coup).
  const announce = (keys: string[]) =>
    edit((next) => {
      if (keys.length * chip.value > available.value) return warn('Pas assez de jetons pour cette annonce.'), false
      for (const k of keys) next[k] = (next[k] ?? 0) + chip.value
      if (keys.some((k) => next[k]! > MAX_BET)) return warn(`${MAX_BET} jetons au plus par case.`), false
      casinoSound.chip()
    })

  // Pile glissée d'une case à l'autre : la mise change de case, le solde ne bouge pas.
  const move = (from: string, to: string) =>
    edit((next) => {
      if (!next[from]) return false
      const amount = Math.min(next[from], MAX_BET - (next[to] ?? 0))
      if (amount <= 0) return warn(`${MAX_BET} jetons au plus par case.`), false
      next[to] = (next[to] ?? 0) + amount
      if (!(next[from]! -= amount)) delete next[from]
      casinoSound.chip()
    })

  const remove = (key: string) =>
    edit((next) => {
      if (!next[key]) return false
      delete next[key]
    })

  const clear = () =>
    edit((next) => {
      if (!staked.value) return false
      for (const k in next) delete next[k]
    })

  const double = () =>
    edit((next) => {
      if (!staked.value) return false
      if (staked.value > available.value) return warn('Pas assez de jetons pour doubler.'), false
      for (const k in next) next[k] = Math.min(next[k]! * 2, MAX_BET)
    })

  const rebet = () =>
    edit((next) => {
      const cost = total(lastBets.value)
      if (!cost || staked.value) return false
      if (cost > balance.value) return warn('Pas assez de jetons pour rejouer la même mise.'), false
      Object.assign(next, lastBets.value)
    })

  function undo() {
    if (!open.value || !undoStack.value.length) return
    bets.value = undoStack.value.pop()!
  }

  async function refill() {
    balance.value = (await api<WalletDto>('/wallet/refill', { method: 'POST' })).balance + staked.value
    toast.add({ title: 'Jetons rechargés. Bonne chance !', color: 'success', icon: 'i-lucide-coins' })
  }

  // Une mise est gagnante si le numéro sorti est l'un des siens.
  const wins = (key: string) => outcome.value !== null && BETS[key]!.includes(outcome.value.result)

  return { balance, history, historyKey, chip, open, phase, round, seats, spectators, seat, others, remaining, timer, verified, outcome, winner, staked, available, shown, lastBets, undoStack, load, place, announce, move, remove, clear, double, rebet, undo, refill, wins }
}
