import { colorOf, wheelAt, wheelIndex } from './wheel.ts'

// Toutes les mises possibles de la table, par clé : `straight:17`, `split:17-20`, `corner:16-17-19-20`, `red`, `dozen:2`…
// Une mise couvre k numéros et rend 36/k fois la mise (gain 35, 17, 11, 8, 5, 2 ou 1 contre 1) : l'avantage de la maison
// vient seulement du zéro.
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const ONE_TO_36 = range(1, 36)

const inside = (kind: string, groups: number[][]) => groups.map((g): [string, number[]] => [`${kind}:${g.join('-')}`, g])

export const BETS: Record<string, number[]> = Object.fromEntries([
  ...inside('straight', range(0, 36).map((n) => [n])),
  // Cheval : deux voisins sur le tapis (dans une colonne de trois, ou d'une colonne à la suivante), et le zéro avec 1, 2 ou 3.
  ...inside('split', [
    ...ONE_TO_36.filter((n) => n % 3 !== 0).map((n) => [n, n + 1]),
    ...range(1, 33).map((n) => [n, n + 3]),
    [0, 1], [0, 2], [0, 3],
  ]),
  ...inside('street', range(0, 11).map((c) => range(3 * c + 1, 3 * c + 3))),
  ...inside('corner', range(1, 32).filter((n) => n % 3 !== 0).map((n) => [n, n + 1, n + 3, n + 4])),
  ...inside('line', range(0, 10).map((c) => range(3 * c + 1, 3 * c + 6))),
  // Transversales du zéro et premier quatre.
  ...inside('trio', [[0, 1, 2], [0, 2, 3]]),
  ...inside('basket', [[0, 1, 2, 3]]),
  ...[1, 2, 3].map((d): [string, number[]] => [`dozen:${d}`, range(12 * d - 11, 12 * d)]),
  // Colonne 1 : 1, 4, 7… (la rangée du bas du tapis), colonne 3 : 3, 6, 9… (celle du haut).
  ...[1, 2, 3].map((c): [string, number[]] => [`column:${c}`, ONE_TO_36.filter((n) => n % 3 === c % 3)]),
  ['low', range(1, 18)],
  ['high', range(19, 36)],
  ['even', ONE_TO_36.filter((n) => n % 2 === 0)],
  ['odd', ONE_TO_36.filter((n) => n % 2 === 1)],
  ['red', ONE_TO_36.filter((n) => colorOf(n) === 'red')],
  ['black', ONE_TO_36.filter((n) => colorOf(n) === 'black')],
])

export type PlacedBet = { bet: string; amount: number }

// Ce que rend la table pour un numéro sorti : mise comprise, 0 si tout est perdu.
export const payout = (bets: PlacedBet[], result: number) =>
  bets.reduce((sum, { bet, amount }) => sum + (BETS[bet]!.includes(result) ? (amount * 36) / BETS[bet]!.length : 0), 0)

// Annonces du cylindre : des jetons posés d'un coup sur des mises du tapis (une clé répétée = deux jetons). Rien de neuf
// côté API, elle ne voit que les mises du tapis.
export const ANNOUNCES = {
  voisins: { name: 'Voisins du zéro', bets: ['trio:0-2-3', 'trio:0-2-3', 'split:4-7', 'split:12-15', 'split:18-21', 'split:19-22', 'split:32-35', 'corner:25-26-28-29', 'corner:25-26-28-29'] },
  tiers: { name: 'Tiers du cylindre', bets: ['split:5-8', 'split:10-11', 'split:13-16', 'split:23-24', 'split:27-30', 'split:33-36'] },
  orphelins: { name: 'Orphelins', bets: ['straight:1', 'split:6-9', 'split:14-17', 'split:17-20', 'split:31-34'] },
  zero: { name: 'Jeu zéro', bets: ['split:0-3', 'split:12-15', 'straight:26', 'split:32-35'] },
} satisfies Record<string, { name: string; bets: string[] }>

// Un numéro et ses deux voisins de chaque côté sur le cylindre, en plein.
export const neighborsOf = (n: number) => [-2, -1, 0, 1, 2].map((d) => `straight:${wheelAt(wheelIndex(n) + d)}`)
