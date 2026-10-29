import { z } from 'zod'
import { MOVES, type Card, type Move } from './game.ts'

// Sept cases autour de la table, comme au casino. On arrive en spectateur et on choisit sa place ; un joueur peut jouer
// plusieurs cases, jusqu'à BLACKJACK_SEATS_PER_PLAYER. Plafond d'une mise par case.
export const BLACKJACK_SEATS = 7
export const BLACKJACK_SEATS_PER_PLAYER = 3
export const BLACKJACK_MAX_BET = 2500

// Le croupier mène la table seul : 15 s de mises (prolongées tant que personne ne mise), la donne carte par carte, 15 s par
// décision (au-delà, la main reste), le croupier joue, 7 s pour voir les résultats, tour suivant.
export const BLACKJACK_BETTING_MS = 15_000
export const DEAL_STEP_MS = 450
export const TURN_MS = 15_000
export const DEALER_STEP_MS = 900
export const BLACKJACK_RESULT_MS = 7_000

export type BlackjackPhase = 'betting' | 'dealing' | 'playing' | 'dealer' | 'result'

// Une main sur la table ; `won` : ce que la table a rendu (mise comprise), une fois le tour réglé.
export type HandDto = { cards: Card[]; bet: number; doubled: boolean; won: number | null }

// Une case occupée : le joueur (`player`, voir l'événement `you` ; le même sur toutes ses cases), la place (de 1, à la
// gauche du croupier, à 7), son prénom, la mise de départ de la case et
// ses mains (vides tant que les cartes ne sont pas données, ou s'il n'a pas misé).
export type BoxDto = { seat: number; player: number; name: string; bet: number; hands: HandDto[] }

// La table, commune à tous les joueurs, poussée entière à chaque changement. `dealer` : ses cartes, null pour la carte
// cachée. `turn` : la main qui a la parole (jusqu'à `endsAt`). `now` cale l'horloge du navigateur sur celle du serveur.
// Donne vérifiable : le sabot est mélangé à l'ouverture et le serveur publie `hash` = sha256(`seed`), `seed` valant
// « ordre du sabot:sel ». La graine n'est révélée qu'au règlement ; le navigateur rejoue alors le tour (mises de départ et
// `moves`) sur ce sabot et compare avec ce qu'il a vu.
export type BlackjackTableDto = {
  round: number
  phase: BlackjackPhase
  endsAt: number
  now: number
  hash: string
  seed: string | null
  dealer: (Card | null)[]
  boxes: BoxDto[]
  turn: { seat: number; hand: number } | null
  moves: Move[]
  spectators: number
}

// Ce que le croupier pousse par WebSocket (/ws/blackjack) : qui est le joueur, à la connexion, puis la table à chaque
// changement. Mises et coups passent par l'API.
export type BlackjackEvent = { type: 'you'; player: number } | { type: 'table'; table: BlackjackTableDto }

const seat = z.int().min(1).max(BLACKJACK_SEATS)
export const blackjackSeatSchema = z.coerce.number().pipe(seat)

// La mise d'un joueur sur l'une de ses cases : remplace la précédente (0 : il la reprend).
export const blackjackBetSchema = z.object({
  round: z.int().min(1),
  seat,
  amount: z.int().min(0).max(BLACKJACK_MAX_BET, `${BLACKJACK_MAX_BET} jetons au plus par case.`),
})
export type BlackjackBetDto = z.infer<typeof blackjackBetSchema>

export const blackjackMoveSchema = z.object({ round: z.int().min(1), move: z.enum(MOVES) })
export type BlackjackMoveDto = z.infer<typeof blackjackMoveSchema>
