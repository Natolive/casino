import { colorOf } from '@casino/shared'

// Montant en jetons, à la française (1 000).
export const fmtChips = (n: number) => n.toLocaleString('fr-FR')

// Fond d'une pastille de numéro, à la couleur de sa case (variables de main.css).
const POCKET_BG = { red: 'bg-pocket-red', black: 'bg-pocket-black', green: 'bg-pocket-green' }
export const pocketBg = (n: number) => POCKET_BG[colorOf(n)]

// Ce que le tour a rendu au joueur, pour la médaille et le plein écran du résultat.
export const outcomeLabel = (o: { staked: number; won: number }) =>
  o.won > o.staked ? 'Gagné !' : o.won ? `${fmtChips(o.won)} jetons récupérés` : 'Perdu, la maison remercie'
