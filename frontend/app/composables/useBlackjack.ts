import {
  BLACKJACK_BETTING_MS,
  BLACKJACK_MAX_BET,
  BLACKJACK_SEATS_PER_PLAYER,
  BLACKJACK_RESULT_MS,
  movesOf,
  replay,
  shoeOf,
  TURN_MS,
  type BlackjackEvent,
  type BlackjackTableDto,
  type Move,
  type WalletDto,
} from '@casino/shared'

// Une table plus ancienne que celle déjà vue (la table envoyée à la connexion croise une diffusion) : tour précédent, ou
// même tour mais calculée plus tôt par le serveur.
const older = (next: BlackjackTableDto, seen: BlackjackTableDto) => next.round < seen.round || (next.round === seen.round && next.now < seen.now)

// La table de blackjack vue par ce joueur. Le croupier (l'API) mène la partie pour tous et pousse la table entière en
// direct (WebSocket). On arrive en spectateur et on s'assoit à une ou plusieurs cases libres ; la mise de chaque case part
// à l'API au fil de l'eau (débitée tout de suite, voir useChipBets), les coups quand une de ses mains a la parole.
export function useBlackjack() {
  const api = useApi()

  const { user } = useAuth()
  // La table telle que le croupier l'a poussée ; `table` y ajoute les gestes du joueur pas encore confirmés (places
  // prises ou quittées), tenus pour acquis : seul un refus de l'API les annule.
  const served = ref<BlackjackTableDto | null>(null)
  const sitting = ref(new Set<number>())
  const leaving = ref(new Set<number>())
  const table = computed(() => {
    const t = served.value
    if (!t || (!sitting.value.size && !leaving.value.size)) return t
    const taken = new Set(t.boxes.map((b) => b.seat))
    const added = [...sitting.value].filter((seat) => !taken.has(seat)).map((seat) => ({ seat, player: player.value!, name: user.value!.firstName, bet: 0, hands: [] }))
    const boxes = [...t.boxes.filter((b) => !leaving.value.has(b.seat)), ...added].sort((a, b) => a.seat - b.seat)
    return { ...t, boxes }
  })
  const { player, now, serverNow, sync, connect } = useLiveTable<BlackjackEvent>('/ws/blackjack', (event) => event.type === 'table' && apply(event.table))

  // Le sabot révélé redonne-t-il exactement ce tour ? null : pas encore révélé (ou navigateur sans WebCrypto).
  const verified = ref<boolean | null>(null)
  // Un coup est parti, la table ne l'a pas encore montré : boutons coupés pour ne pas jouer deux fois. Rester ou doubler
  // rend la main tout de suite (`passed`), sans attendre la table.
  const acting = ref(false)
  const passed = ref(false)

  const phase = computed(() => table.value?.phase ?? null)
  // Ses cases (aucune : il regarde), et celles où il a des cartes ce tour-ci.
  const mine = computed(() => table.value?.boxes.filter((b) => b.player === player.value) ?? [])
  const seats = computed(() => mine.value.map((b) => b.seat))
  const playing = computed(() => mine.value.some((b) => b.hands.length))
  const canSit = computed(() => mine.value.length < BLACKJACK_SEATS_PER_PLAYER)
  const remaining = computed(() => (table.value ? Math.max(0, Math.ceil((table.value.endsAt - now.value) / 1000)) : 0))
  // Phase en cours : durée totale et temps déjà écoulé, pour les comptes à rebours animés en CSS.
  const timer = computed(() => {
    const t = table.value
    const total = t?.phase === 'betting' ? BLACKJACK_BETTING_MS : t?.phase === 'playing' ? TURN_MS : t?.phase === 'result' ? BLACKJACK_RESULT_MS : 0
    if (!t || !total) return null
    return { key: `${t.round}-${t.phase}-${t.moves.length}-${t.endsAt}`, total, elapsed: total - (t.endsAt - serverNow()) }
  })
  // Ses cases acceptent des jetons : assis, mises ouvertes, compte à rebours pas à zéro.
  const open = computed(() => phase.value === 'betting' && remaining.value > 0 && mine.value.length > 0)

  // Une mise par case : seules les cases changées partent, l'une après l'autre.
  const chips = useChipBets({
    open,
    maxBet: BLACKJACK_MAX_BET,
    round: () => served.value?.round ?? null,
    save: async (round, next, synced) => {
      let balance = chips.wallet.value
      for (const seat of new Set(Object.keys({ ...next, ...synced })))
        if ((next[seat] ?? 0) !== (synced[seat] ?? 0))
          ({ balance } = await api<WalletDto>('/blackjack/bet', { method: 'PUT', body: { round, seat: +seat, amount: next[seat] ?? 0 } }))
      return balance
    },
  })
  const { wallet, bets, chip, staked, available, undoStack, place, remove, clear, double, undo, refill } = chips

  // La main qui a la parole, si elle est à lui, et les coups qu'il peut payer.
  const myHand = computed(() => {
    const t = table.value
    const box = t?.turn && mine.value.find((b) => b.seat === t.turn!.seat)
    if (t?.phase !== 'playing' || !box || passed.value) return null
    return { seat: box.seat, index: t.turn!.hand, hands: box.hands.length, ...box.hands[t.turn!.hand]! }
  })
  const moves = computed<Move[]>(() => {
    const hand = myHand.value
    if (!hand) return []
    return movesOf(hand.cards, hand.hands).filter((m) => (m === 'double' || m === 'split' ? hand.bet <= available.value : true))
  })

  async function load() {
    wallet.value = (await api<WalletDto>('/wallet')).balance
    connect()
  }

  function apply(next: BlackjackTableDto) {
    const previous = served.value
    if (previous && older(next, previous)) return
    sync(next.now)
    served.value = next
    // Le coup parti est joué (ou la parole a changé) : boutons rendus. Une table sans rapport (arrivée d'un joueur) ne
    // les rend pas, pour ne pas jouer deux fois.
    if (next.moves.length !== previous?.moves.length || next.phase !== previous?.phase || next.round !== previous?.round) acting.value = passed.value = false
    // Gestes confirmés par la table : plus besoin de les tenir.
    const mineNow = (seat: number) => next.boxes.some((b) => b.seat === seat && b.player === player.value)
    for (const seat of sitting.value) if (mineNow(seat) || next.boxes.some((b) => b.seat === seat)) sitting.value.delete(seat)
    for (const seat of leaving.value) if (!mineNow(seat)) leaving.value.delete(seat)
    if (next.round !== previous?.round) {
      // Nouveau tour : ses cases débarrassées (ou les mises déjà posées, si l'onglet revient en cours de mises).
      const posed = next.phase === 'betting' ? next.boxes.filter((b) => b.player === player.value && b.bet) : []
      chips.reset(Object.fromEntries(posed.map((b) => [b.seat, b.bet])))
      verified.value = null
      // Règlement jamais vu (onglet en veille) : solde relu.
      if (previous && previous.phase !== 'result') void chips.refresh()
    }
    // Règlement vu en direct ; en arrivant sur un tour déjà réglé, le solde lu au chargement compte déjà les gains.
    if (next.phase === 'result' && previous && previous.phase !== 'result') void settle(next)
  }

  // Tour réglé : gains comptés (voir useChipBets), et la donne vérifiée sur le sabot révélé.
  async function settle(t: BlackjackTableDto) {
    chips.settle(t.boxes.filter((b) => b.player === player.value).flatMap((b) => b.hands).reduce((sum, h) => sum + (h.won ?? 0), 0))
    try {
      const played = t.boxes.filter((b) => b.hands.length)
      const game = replay(shoeOf(t.seed!), played.map((b) => ({ seat: b.seat, bet: b.bet })), t.moves)
      const same =
        JSON.stringify(game.dealer) === JSON.stringify(t.dealer) &&
        JSON.stringify(game.boxes.map((b) => b.hands.map((h) => h.cards))) === JSON.stringify(played.map((b) => b.hands.map((h) => h.cards)))
      verified.value = same && (await sha256(t.seed!)) === t.hash
    } catch {
      verified.value = false
    }
  }

  // Les mises du tour passé, sur celles de ses cases où il est encore assis.
  const replayable = computed(() => Object.fromEntries(Object.entries(chips.lastBets.value).filter(([seat]) => seats.value.includes(+seat))))
  const rebet = () => chips.rebet(replayable.value)

  // S'asseoir à une case libre, se lever (sa mise du tour rendue) : la place change tout de suite à l'écran. Envoyés dans
  // la même file que les mises : un jeton posé aussitôt assis part après la place.
  function sit(seat: number) {
    if (!canSit.value) return chips.warn(`${BLACKJACK_SEATS_PER_PLAYER} cases au plus par joueur.`)
    sitting.value.add(seat)
    chips.enqueue(async () => {
      try {
        await api(`/blackjack/seats/${seat}`, { method: 'PUT' })
      } catch (e) {
        sitting.value.delete(seat)
        const { [seat]: _, ...rest } = bets.value
        bets.value = rest
        chips.fail(e)
      }
    })
  }
  function stand(seat: number) {
    const { synced } = chips
    const before = { bets: bets.value, synced: synced.value }
    leaving.value.add(seat)
    const { [seat]: _, ...rest } = bets.value
    const { [seat]: refund = 0, ...kept } = synced.value
    synced.value = kept
    bets.value = rest
    wallet.value += refund
    chips.enqueue(async () => {
      try {
        await api(`/blackjack/seats/${seat}`, { method: 'DELETE' })
      } catch (e) {
        leaving.value.delete(seat)
        ;({ bets: bets.value, synced: synced.value } = before)
        wallet.value -= refund
        chips.fail(e)
      }
    })
  }

  // Un coup sur sa main ; doubler ou séparer remet sa mise, débitée tout de suite (le solde sera relu au règlement).
  async function play(move: Move) {
    const hand = myHand.value
    if (!hand || acting.value || !moves.value.includes(move)) return
    acting.value = true
    passed.value = move === 'stand' || move === 'double'
    if (move === 'double' || move === 'split') wallet.value -= hand.bet
    try {
      await api('/blackjack/move', { method: 'POST', body: { round: table.value!.round, move } })
    } catch (e) {
      acting.value = passed.value = false
      if (move === 'double' || move === 'split') wallet.value += hand.bet
      chips.fail(e)
    }
  }

  return { table, player, phase, mine, seats, playing, canSit, chip, bets, staked, replayable, undoStack, available, remaining, timer, open, myHand, moves, verified, acting, load, place, remove, clear, double, rebet, undo, sit, stand, play, refill }
}
