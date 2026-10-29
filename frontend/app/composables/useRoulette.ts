import { BETS, BETTING_MS, HISTORY_SIZE, MAX_BET, SPINNING_MS, payout, resultOf, type PlacedBet, type RoundDto, type SeatDto, type TableEvent, type TableRoundDto, type WalletDto } from '@casino/shared'

export type Phase = 'betting' | 'spinning' | 'result'
export type Outcome = { result: number; staked: number; won: number }

const toList = (bets: Bets) => Object.entries(bets).map(([bet, amount]) => ({ bet, amount }))
// Ordre des états de la table : tour après tour, les mises puis le tirage.
const order = (r: TableRoundDto) => r.id * 2 + (r.phase === 'spinning' ? 1 : 0)
const toBets = (list: RoundDto['bets']): Bets => Object.fromEntries(list.map((b) => [b.bet, b.amount]))

// État de la table vue par ce joueur. Le croupier (l'API) mène les tours pour tout le monde et les pousse en direct par
// WebSocket, avec les joueurs autour de la table et leurs mises ; les jetons posés partent à l'API au fil de l'eau
// (débités tout de suite, voir useChipBets), et la roue montre le numéro quand les jeux sont faits. `roll` lance la bille
// sur un numéro et se résout quand elle est tombée.
export function useRoulette(roll: (n: number) => Promise<void>) {
  const api = useApi()

  const history = ref<number[]>([])
  // Clé de la pastille la plus récente : augmente à chaque numéro sorti, pour que la liste anime l'arrivée.
  const historyKey = ref(0)
  const phase = ref<Phase>('spinning')
  const round = ref<TableRoundDto | null>(null)
  // Les joueurs assis (soi compris, si on a une place) et le nombre de spectateurs.
  const seats = ref<SeatDto[]>([])
  const spectators = ref(0)
  const { player, now, serverNow, sync: syncClock, connect } = useLiveTable<TableEvent>('/ws/roulette', (event) => {
    if (event.type === 'seats') ({ seats: seats.value, spectators: spectators.value } = event)
    else if (event.type === 'round') apply(event.round)
  })
  // Sa place à la table ; null : spectateur, en attendant qu'une place se libère.
  const seat = computed(() => seats.value.find((s) => s.player === player.value)?.seat ?? null)
  const outcome = ref<Outcome | null>(null)
  // Le tirage révélé correspond-il au hash publié avant les mises ? null : pas encore révélé (ou navigateur sans WebCrypto).
  const verified = ref<boolean | null>(null)
  // Les mises du tour joué, gardées sur le tapis le temps d'afficher le résultat.
  const settled = ref<Bets>({})
  // Numéro à éclairer sur le tapis : seulement le temps du résultat.
  const winner = computed(() => (phase.value === 'result' ? (outcome.value?.result ?? null) : null))

  const remaining = computed(() => (round.value ? Math.max(0, Math.ceil((round.value.endsAt - now.value) / 1000)) : 0))
  // Phase du croupier en cours : durée totale et temps déjà écoulé, pour la ligne du compte à rebours (animée en CSS, pas
  // à chaque tic). Recalculé seulement quand le tour est relu.
  const timer = computed(() => {
    if (!round.value) return null
    const total = round.value.phase === 'betting' ? BETTING_MS : SPINNING_MS
    return { key: `${round.value.id}-${round.value.phase}`, total, elapsed: total - (round.value.endsAt - serverNow()) }
  })
  // Le tapis accepte des jetons : phase de mises et compte à rebours pas encore à zéro.
  const open = computed(() => phase.value === 'betting' && remaining.value > 0)

  // Les jetons posés partent ensemble : la liste de l'API remplace la précédente. Refusés, le tapis reprend ce qu'elle a.
  const chips = useChipBets({
    open,
    maxBet: MAX_BET,
    round: () => round.value?.id ?? null,
    save: async (id, next) => (await api<WalletDto>('/roulette/bets', { method: 'PUT', body: { round: id, bets: toList(next) } })).balance,
    recover: async (id) => {
      const current = await api<RoundDto | null>('/roulette/round')
      return current?.id === id && current.phase === 'betting' ? toBets(current.bets) : null
    },
  })
  const { bets, chip, lastBets, undoStack, staked, available, place, remove, clear, double, rebet, undo, refill } = chips
  const shown = computed(() => (phase.value === 'result' ? settled.value : bets.value))

  // Les mises des autres joueurs, à poser sur le tapis à côté des siennes.
  const others = computed(() =>
    seats.value.filter((s) => s.player !== player.value).flatMap((s) => s.bets.map((b) => ({ key: b.bet, amount: b.amount, seat: s.seat }))),
  )

  async function load() {
    const [wallet, results, current] = await Promise.all([
      api<WalletDto>('/wallet'),
      api<number[]>('/roulette/history'),
      api<RoundDto | null>('/roulette/round'),
    ])
    history.value = results
    chips.wallet.value = wallet.balance
    if (current) apply(current)
    connect()
  }

  // Le tour poussé à tous ne porte pas les mises du joueur : seul celui envoyé à la connexion (ou relu) les a.
  function apply(next: TableRoundDto & { bets?: PlacedBet[] }) {
    const previous = round.value
    // Arrivé après plus récent (le tour envoyé à la connexion croise un changement de phase) : ignoré.
    if (previous && order(next) < order(previous)) return
    syncClock(next.now)
    round.value = next
    if (next.phase === 'betting') {
      if (previous?.id === next.id) return
      // Faites vos jeux : nouveau tour, tapis débarrassé.
      phase.value = 'betting'
      outcome.value = null
      verified.value = null
      settled.value = {}
      chips.reset(toBets(next.bets ?? []))
      // Les jetons des autres du tour passé s'en vont avec les siens, sans attendre les places à jour.
      seats.value = seats.value.map((s) => ({ ...s, bets: [], won: null }))
      // Tirage du tour précédent jamais vu (onglet en veille, API redémarrée) : solde et historique relus.
      if (previous?.phase === 'betting') void resync()
    } else if (previous?.id === next.id && previous.phase === 'betting') {
      void reveal(next)
    } else if (previous?.id !== next.id) {
      // Arrivé en plein tirage, ou tirage d'un autre tour que celui où l'on misait : on attend le tour suivant.
      phase.value = 'spinning'
      chips.reset()
      if (previous) void resync()
    }
  }

  async function resync() {
    try {
      const [wallet, results] = await Promise.all([api<WalletDto>('/wallet'), api<number[]>('/roulette/history')])
      history.value = results
      historyKey.value += HISTORY_SIZE
      chips.wallet.value = wallet.balance
    } catch {
      // API injoignable : le prochain tirage vu remettra le solde à jour.
    }
  }

  // Rien ne va plus : la bille tombe sur le numéro tiré, puis le tapis montre ce qui est gagné.
  async function reveal(r: TableRoundDto) {
    phase.value = 'spinning'
    void sha256(r.seed!)
      .then((hash) => (verified.value = hash === r.hash && resultOf(r.seed!) === r.result))
      .catch(() => (verified.value = null))
    // Onglet caché : pas d'animation (elle ne tourne pas en arrière-plan), le résultat directement.
    if (!document.hidden) await roll(r.result!)
    history.value = [r.result!, ...history.value].slice(0, HISTORY_SIZE)
    historyKey.value++
    // Le tour suivant a déjà commencé (onglet revenu tard) : ses mises sont déjà celles du nouveau tour, solde relu.
    if (round.value?.id !== r.id) return void chips.refresh()
    const won = payout(toList(chips.synced.value), r.result!)
    const mine = chips.settle(won)
    outcome.value = { result: r.result!, staked: totalOf(mine), won }
    if (totalOf(mine)) settled.value = mine
    if (won > totalOf(mine)) casinoSound.win()
    phase.value = 'result'
  }

  // Annonce du cylindre : un jeton sur chacune de ses mises, en un seul geste (annulable d'un coup).
  const announce = (keys: string[]) =>
    chips.edit((next) => {
      if (keys.length * chip.value > available.value) return chips.warn('Pas assez de jetons pour cette annonce.'), false
      for (const k of keys) next[k] = (next[k] ?? 0) + chip.value
      if (keys.some((k) => next[k]! > MAX_BET)) return chips.warn(`${fmtChips(MAX_BET)} jetons au plus par case.`), false
      casinoSound.chip()
    })

  // Pile glissée d'une case à l'autre : la mise change de case, le solde ne bouge pas.
  const move = (from: string, to: string) =>
    chips.edit((next) => {
      if (!next[from]) return false
      const amount = Math.min(next[from], MAX_BET - (next[to] ?? 0))
      if (amount <= 0) return chips.warn(`${fmtChips(MAX_BET)} jetons au plus par case.`), false
      next[to] = (next[to] ?? 0) + amount
      if (!(next[from]! -= amount)) delete next[from]
      casinoSound.chip()
    })

  // Une mise est gagnante si le numéro sorti est l'un des siens.
  const wins = (key: string) => outcome.value !== null && BETS[key]!.includes(outcome.value.result)

  return { history, historyKey, chip, open, phase, round, seats, spectators, seat, others, remaining, timer, verified, outcome, winner, staked, available, shown, lastBets, undoStack, load, place, announce, move, remove, clear, double, rebet, undo, refill, wins }
}
