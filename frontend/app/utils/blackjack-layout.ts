import { BLACKJACK_SEATS } from '@casino/shared'

// Géométrie de la table de blackjack, en unités de dessin (W × H) : le croupier au bord droit du haut, les sept cases en
// arc de cercle autour de lui (case 1 à sa gauche, donc à droite de l'écran). Les éléments posés sur le tapis sont placés en
// % de la table et dimensionnés en `cqw` (largeur de la table), pour suivre sa taille.
export const W = 1200
export const H = 640
// Centre de l'arc : le croupier.
const CX = 600
const CY = 50
// Rayons : cercle de mise, mains.
export const BOX_R = 440
export const HAND_R = 300
// Une carte, en unités de dessin (rapport 2,5 × 3,5 d'une vraie carte).
export const CARD_W = 72
export const CARD_H = 100

export type Point = { x: number; y: number }

export const DEALER: Point = { x: CX, y: 128 }
export const SHOE: Point = { x: 1040, y: 92 }
export const DISCARD: Point = { x: 160, y: 92 }
export const RACK: Point = { x: CX, y: 38 }

// Angle d'une case, de 25° (case 1) à 155° (case 7), y vers le bas.
export const seatAngle = (seat: number) => ((25 + ((seat - 1) * 130) / (BLACKJACK_SEATS - 1)) * Math.PI) / 180
export const along = (seat: number, r: number): Point => ({ x: CX + r * Math.cos(seatAngle(seat)), y: CY + r * Math.sin(seatAngle(seat)) })
// Inclinaison des cartes d'une case vers le croupier, adoucie pour rester lisible.
export const tilt = (seat: number) => (((seatAngle(seat) * 180) / Math.PI - 90) * 0.45)

// Position en % de la table, et longueur en largeur de table.
export const at = ({ x, y }: Point) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
export const cq = (n: number) => `${(n / W) * 100}cqw`

// Main `hand` sur `hands` d'une case : les mains séparées s'alignent le long de l'arc.
export function handPoint(seat: number, hand: number, hands: number): Point {
  const center = along(seat, HAND_R)
  const a = seatAngle(seat) + Math.PI / 2
  const d = (hand - (hands - 1) / 2) * (hands > 2 ? 62 : 84)
  // Écartées de droite à gauche, comme la donne : la première main est la plus à droite.
  return { x: center.x + Math.cos(a) * d, y: center.y + Math.sin(a) * d }
}
