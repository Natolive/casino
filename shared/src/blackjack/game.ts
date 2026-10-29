// Blackjack : les règles de la table, sans horloge ni réseau. Le croupier (l'API) mène la partie avec ces fonctions, et le
// navigateur les rejoue sur le sabot révélé pour vérifier la donne (voir `replay`).
//
// Règles de la maison : sabot de 6 jeux, mélangé à chaque tour ; le croupier reçoit une carte cachée et la regarde s'il
// montre un as ou une figure (blackjack : le tour s'arrête là). Blackjack payé 3 pour 2, le croupier tire jusqu'à 16 et
// reste sur tout 17 (souple compris). Doubler sur deux cartes, même après séparation ; séparer deux cartes de même valeur,
// jusqu'à 4 mains ; as séparés : une carte chacun. 21 après séparation n'est pas un blackjack.
// ponytail: ni assurance ni abandon ; à ajouter ici (et un coup de plus dans `Move`) si les joueurs les réclament.

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const
export const SUITS = ['S', 'H', 'D', 'C'] as const
export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]
// Une carte en deux lettres : rang puis couleur (`TH` : dix de cœur, `AS` : as de pique).
export type Card = `${Rank}${Suit}`

export const DECKS = 6
export const MAX_HANDS = 4

export const MOVES = ['hit', 'stand', 'double', 'split'] as const
export type Move = (typeof MOVES)[number]

export type Hand = { cards: Card[]; bet: number; doubled: boolean; done: boolean }
// Une case de la table (`seat`) et ses mains : une seule, sauf séparation.
export type Box = { seat: number; hands: Hand[] }
// Un tour : le sabot, la prochaine carte à tirer, les cases jouées par ordre de place, la main du croupier, la main qui
// doit jouer et les coups joués, dans l'ordre.
export type BlackjackGame = { shoe: Card[]; next: number; boxes: Box[]; dealer: Card[]; turn: { box: number; hand: number } | null; moves: Move[] }

export const rankOf = (card: Card) => card[0] as Rank
export const suitOf = (card: Card) => card[1] as Suit
const pointsOf = (card: Card) => {
  const rank = rankOf(card)
  return rank === 'A' ? 1 : 'TJQK'.includes(rank) ? 10 : Number(rank)
}

// Total d'une main ; `soft` : un as y compte pour 11.
export function handValue(cards: Card[]) {
  const hard = cards.reduce((sum, c) => sum + pointsOf(c), 0)
  const soft = cards.some((c) => rankOf(c) === 'A') && hard + 10 <= 21
  return { total: soft ? hard + 10 : hard, soft }
}

// Blackjack : 21 en deux cartes, sur une main jamais séparée.
export const isNatural = (cards: Card[], hands = 1) => hands === 1 && cards.length === 2 && handValue(cards).total === 21

// Six jeux mélangés (Fisher-Yates) ; `randomInt(n)` rend un entier dans [0, n), tiré par le serveur.
export function newShoe(randomInt: (max: number) => number): Card[] {
  const shoe = Array.from({ length: DECKS }, () => SUITS.flatMap((s) => RANKS.map((r): Card => `${r}${s}`))).flat()
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[shoe[i], shoe[j]] = [shoe[j]!, shoe[i]!]
  }
  return shoe
}

// Graine publiée à la fin du tour : l'ordre du sabot, puis un sel. Son sha256 est publié avant les mises.
export const shoeSeed = (shoe: Card[], salt: string) => `${shoe.join('')}:${salt}`
export const shoeOf = (seed: string) => (seed.split(':')[0]!.match(/../g) ?? []) as Card[]

export const newGame = (shoe: Card[], bets: { seat: number; bet: number }[]): BlackjackGame => ({
  shoe,
  next: 0,
  boxes: [...bets].sort((a, b) => a.seat - b.seat).map(({ seat, bet }) => ({ seat, hands: [{ cards: [], bet, doubled: false, done: false }] })),
  dealer: [],
  turn: null,
  moves: [],
})

const draw = (game: BlackjackGame) => game.shoe[game.next++]!

// Donne une carte de la distribution : une à chaque case de droite à gauche, une au croupier (visible), puis la seconde à
// chacun (celle du croupier cachée). Rend false une fois la donne finie.
export function dealNext(game: BlackjackGame) {
  const n = game.boxes.length + 1
  const dealt = game.boxes.reduce((sum, b) => sum + b.hands[0]!.cards.length, 0) + game.dealer.length
  if (dealt >= 2 * n) return false
  const i = dealt % n
  ;(i < game.boxes.length ? game.boxes[i]!.hands[0]!.cards : game.dealer).push(draw(game))
  return true
}

export const dealerNatural = (game: BlackjackGame) => isNatural(game.dealer)

// Donne finie : blackjack du croupier (il a regardé sa carte cachée), tout est joué ; sinon les blackjacks des joueurs sont
// servis et la première main à jouer prend la parole.
export function begin(game: BlackjackGame) {
  for (const box of game.boxes)
    for (const hand of box.hands) hand.done = dealerNatural(game) || handValue(hand.cards).total === 21
  advance(game, { box: 0, hand: 0 })
}

// Première main encore à jouer, à partir de `from`.
function advance(game: BlackjackGame, from: { box: number; hand: number }) {
  for (let b = from.box; b < game.boxes.length; b++) {
    const hands = game.boxes[b]!.hands
    for (let h = b === from.box ? from.hand : 0; h < hands.length; h++) if (!hands[h]!.done) return void (game.turn = { box: b, hand: h })
  }
  game.turn = null
}

// Les coups permis sur une main à jouer (`hands` : nombre de mains de la case).
export function movesOf(cards: Card[], hands: number): Move[] {
  const pair = cards.length === 2
  return [
    'hit',
    'stand',
    ...(pair ? (['double'] as const) : []),
    ...(pair && pointsOf(cards[0]!) === pointsOf(cards[1]!) && hands < MAX_HANDS ? (['split'] as const) : []),
  ]
}

export const currentHand = (game: BlackjackGame) => (game.turn ? game.boxes[game.turn.box]!.hands[game.turn.hand]! : null)

export function legalMoves(game: BlackjackGame): Move[] {
  const hand = currentHand(game)
  return hand ? movesOf(hand.cards, game.boxes[game.turn!.box]!.hands.length) : []
}

// Jetons à ajouter pour ce coup : doubler et séparer remettent la mise de la main.
export const costOf = (game: BlackjackGame, move: Move) => (move === 'double' || move === 'split' ? currentHand(game)!.bet : 0)

// Joue un coup sur la main qui a la parole. Une main finit à 21 ou au-delà, après un double, ou sur des as séparés.
export function play(game: BlackjackGame, move: Move) {
  if (!legalMoves(game).includes(move)) throw new Error(`Coup interdit : ${move}`)
  const turn = game.turn!
  const box = game.boxes[turn.box]!
  const hand = box.hands[turn.hand]!
  game.moves.push(move)
  if (move === 'hit') hand.cards.push(draw(game))
  else if (move === 'stand') hand.done = true
  else if (move === 'double') {
    hand.bet *= 2
    hand.doubled = true
    hand.cards.push(draw(game))
    hand.done = true
  } else {
    const second: Hand = { cards: [hand.cards.pop()!], bet: hand.bet, doubled: false, done: false }
    box.hands.splice(turn.hand + 1, 0, second)
    hand.cards.push(draw(game))
    second.cards.push(draw(game))
    if (rankOf(hand.cards[0]!) === 'A') hand.done = second.done = true
  }
  for (const h of box.hands) if (handValue(h.cards).total >= 21) h.done = true
  advance(game, turn)
}

// Le croupier tire une carte s'il le doit : jusqu'à 16, et seulement si une main l'attend encore (pas toutes sautées ni
// payées en blackjack). Rend false quand il reste.
export function dealerDraws(game: BlackjackGame) {
  const waiting = game.boxes.some((b) => b.hands.some((h) => handValue(h.cards).total <= 21 && !isNatural(h.cards, b.hands.length)))
  if (!waiting || handValue(game.dealer).total >= 17) return false
  game.dealer.push(draw(game))
  return true
}

// Ce que la table rend pour une main, mise comprise (0 : perdue). Le blackjack paie 3 pour 2, arrondi au jeton inférieur.
export function payoutOf(cards: Card[], bet: number, hands: number, dealer: Card[]) {
  const me = handValue(cards).total
  const house = handValue(dealer).total
  if (me > 21) return 0
  if (isNatural(cards, hands)) return isNatural(dealer) ? bet : bet + Math.floor((bet * 3) / 2)
  if (isNatural(dealer)) return 0
  if (house > 21 || me > house) return 2 * bet
  return me === house ? bet : 0
}

// Le tour entier rejoué depuis le sabot, les mises et les coups : ce que le navigateur compare à ce qu'il a vu.
export function replay(shoe: Card[], bets: { seat: number; bet: number }[], moves: Move[]) {
  const game = newGame(shoe, bets)
  while (dealNext(game));
  begin(game)
  for (const move of moves) play(game, move)
  while (dealerDraws(game));
  return game
}
