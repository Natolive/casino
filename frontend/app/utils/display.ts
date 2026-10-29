import { colorOf } from '@casino/shared'

// Montant en jetons, à la française (1 000).
export const fmtChips = (n: number) => n.toLocaleString('fr-FR')

// Fond d'une pastille de numéro, à la couleur de sa case (variables de main.css).
const POCKET_BG = { red: 'bg-pocket-red', black: 'bg-pocket-black', green: 'bg-pocket-green' }
export const pocketBg = (n: number) => POCKET_BG[colorOf(n)]

// Ce que le tour a rendu au joueur, pour la médaille et le plein écran du résultat.
export const outcomeLabel = (o: { staked: number; won: number }) =>
  o.won > o.staked ? 'Gagné !' : o.won ? `${fmtChips(o.won)} jetons récupérés` : 'Perdu, la maison remercie'

// Couleur des jetons d'un joueur, d'après sa place à la table (comme les jetons de roulette, une couleur par joueur).
const SEAT_COLORS = ['#f59e0b', '#38bdf8', '#f472b6', '#a3e635', '#c084fc', '#fb7185', '#2dd4bf', '#fde047']
export const seatColor = (seat: number) => SEAT_COLORS[(seat - 1) % SEAT_COLORS.length]!

// Couleurs des jetons, par valeur : corps, inserts de la tranche, chiffre.
export const CHIP_STYLES: Record<number, { body: string; edge: string; text: string }> = {
  1: { body: '#ece6d6', edge: '#3b6fd1', text: '#2b2b2b' },
  5: { body: '#c0162c', edge: '#f4efe3', text: '#fff' },
  10: { body: '#1d4fa8', edge: '#f4efe3', text: '#fff' },
  25: { body: '#14804b', edge: '#f4efe3', text: '#fff' },
  100: { body: '#161616', edge: '#e0ad35', text: '#f2dc95' },
  500: { body: '#6b2a9e', edge: '#f2dc95', text: '#fff' },
}
