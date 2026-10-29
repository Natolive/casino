import { z } from 'zod'
import { BETS, type PlacedBet } from './bets.ts'

// Plafond d'une mise sur une case.
export const MAX_BET = 5000

// La table tourne toute seule, pour tout le monde : 25 s pour miser, puis 25 s de tirage (lancer, ~7 à 12 s de course,
// et le résultat affiché) avant le tour suivant.
export const BETTING_MS = 25_000
export const SPINNING_MS = 25_000

// Derniers numéros affichés au-dessus du tapis.
export const HISTORY_SIZE = 18

// Les mises d'un joueur sur un tour : remplace celles qu'il avait déjà posées (liste vide : il reprend tout).
export const betsSchema = z.object({
  round: z.int().min(1),
  bets: z
    .array(
      z.object({
        bet: z.string().refine((key) => Object.hasOwn(BETS, key), 'Mise inconnue.'),
        amount: z.int().min(1).max(MAX_BET, `${MAX_BET} jetons au plus par case.`),
      }),
    )
    .max(200)
    .refine((bets) => new Set(bets.map((b) => b.bet)).size === bets.length, 'Une case ne se mise qu’une fois par tour.'),
})
export type BetsDto = z.infer<typeof betsSchema>

// Le tour en cours, commun à toute la table. `now` sert à caler l'horloge du navigateur sur celle du serveur.
// Tirage vérifiable : le numéro est tiré dès l'ouverture et le serveur publie `hash` = sha256(`seed`), `seed` valant
// « numéro:sel aléatoire ». `result` et `seed` ne sont révélés qu'une fois les jeux faits ; chacun peut alors recalculer
// le hash et voir que le numéro était fixé avant les mises.
export type TableRoundDto = {
  id: number
  phase: 'betting' | 'spinning'
  endsAt: number
  now: number
  result: number | null
  hash: string
  seed: string | null
}

// Le tour vu par un joueur : avec ses propres mises.
export type RoundDto = TableRoundDto & { bets: PlacedBet[] }

// Places autour de la table, comme au casino. Au-delà, on regarde (et on peut miser) en spectateur, et on monte à table,
// par ordre d'arrivée, dès qu'une place se libère.
export const MAX_SEATS = 8

// Un joueur assis : `player` le désigne tant qu'il est là (voir `you`), sa place donne la couleur de ses jetons, puis son
// prénom, ses mises du tour et, une fois la bille tombée, ce qu'il a gagné. Il garde sa place tant qu'il est connecté
// ou qu'il a des jetons sur le tapis.
export type SeatDto = { player: number; seat: number; name: string; bets: PlacedBet[]; won: number | null }

// Ce que le croupier pousse aux joueurs par WebSocket (/ws/roulette), jamais l'inverse : les mises passent par l'API
// (PUT /roulette/bets). `you` : qui est le joueur (son `player`), à la connexion ; `round` : à chaque changement de phase ;
// `seats` : les joueurs assis et le nombre de spectateurs, à chaque arrivée, départ ou mise.
export type TableEvent =
  | { type: 'you'; player: number }
  | { type: 'round'; round: TableRoundDto }
  | { type: 'seats'; seats: SeatDto[]; spectators: number }

// Le numéro contenu dans une graine « numéro:sel ».
export const resultOf = (seed: string) => Number(seed.split(':')[0])
