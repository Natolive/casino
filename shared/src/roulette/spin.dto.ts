import { z } from 'zod'
import { BETS, type PlacedBet } from './bets.ts'

// Jetons de la table, et plafond d'une mise sur une case.
export const CHIPS = [1, 5, 10, 25, 100, 500] as const
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

// Le tour en cours vu par un joueur. `now` sert à caler l'horloge du navigateur sur celle du serveur.
// Tirage vérifiable : le numéro est tiré dès l'ouverture et le serveur publie `hash` = sha256(`seed`), `seed` valant
// « numéro:sel aléatoire ». `result` et `seed` ne sont révélés qu'une fois les jeux faits ; chacun peut alors recalculer
// le hash et voir que le numéro était fixé avant les mises.
export type RoundDto = {
  id: number
  phase: 'betting' | 'spinning'
  endsAt: number
  now: number
  result: number | null
  hash: string
  seed: string | null
  bets: PlacedBet[]
}

// Le numéro contenu dans une graine « numéro:sel ».
export const resultOf = (seed: string) => Number(seed.split(':')[0])
