// Jetons fictifs donnés à l'arrivée, et à chaque recharge.
export const STARTING_BALANCE = 1000

// Les jetons des tables, du plus petit au plus gros.
export const CHIPS = [1, 5, 10, 25, 100, 500] as const

export type WalletDto = { balance: number }

// Classement des plus riches : le haut du tableau, et la place du joueur connecté (ex aequo au même rang).
export type LeaderboardEntryDto = { rank: number; name: string; you: boolean; balance: number }
export type LeaderboardDto = { top: LeaderboardEntryDto[]; me: { rank: number; balance: number } }
