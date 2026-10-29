import { colorOf } from '@casino/shared'

// Géométrie du tapis (unités du viewBox SVG) : le zéro à gauche, 12 colonnes de 3 numéros (3, 6, 9… en haut),
// les « 2 à 1 » à droite, puis les douzaines et les chances simples.
export const CW = 64
export const CH = 78
const ZW = 68
const PAD = 10
const DH = 58
const X0 = PAD + ZW
const Y0 = PAD
export const TABLE_W = X0 + 13 * CW + PAD
export const TABLE_H = Y0 + 3 * CH + 2 * DH + PAD
// Demi-épaisseur des zones de mise à cheval sur un filet.
const E = 10

export type Rect = { x: number; y: number; w: number; h: number }
export type Spot = Rect & { key: string }
export type Label = Rect & { key: string; text: string; color?: 'red' | 'black' | 'green' }

export const cellOf = (n: number): Rect => {
  const c = Math.floor((n - 1) / 3)
  const r = 2 - ((n - 1) % 3)
  return { x: X0 + c * CW, y: Y0 + r * CH, w: CW, h: CH }
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const ONE_TO_36 = range(1, 36)

const EVEN_MONEY: [string, string][] = [['low', '1 à 18'], ['even', 'PAIR'], ['red', ''], ['black', ''], ['odd', 'IMPAIR'], ['high', '19 à 36']]

// Cases peintes sur le tapis.
export const ZERO: Rect = { x: PAD, y: Y0, w: ZW, h: 3 * CH }
export const LABELS: Label[] = [
  ...ONE_TO_36.map((n) => ({ key: `straight:${n}`, text: String(n), color: colorOf(n), ...cellOf(n) })),
  ...[0, 1, 2].map((r) => ({ key: `column:${3 - r}`, text: '2 à 1', x: X0 + 12 * CW, y: Y0 + r * CH, w: CW, h: CH })),
  ...[1, 2, 3].map((d) => ({ key: `dozen:${d}`, text: `${d}${d === 1 ? 're' : 'e'} 12`, x: X0 + (d - 1) * 4 * CW, y: Y0 + 3 * CH, w: 4 * CW, h: DH })),
  ...EVEN_MONEY.map(([key, text], i) => ({
    key,
    text,
    color: key === 'red' || key === 'black' ? key : undefined,
    x: X0 + i * 2 * CW,
    y: Y0 + 3 * CH + DH,
    w: 2 * CW,
    h: DH,
  })),
]

// Zones cliquables, dans l'ordre d'empilement : les cases, puis les filets (chevaux, transversales), puis les coins
// (carrés, sixains) par-dessus. Chaque zone porte la clé de BETS, et le jeton s'y pose en son centre.
const at = (key: string, x: number, y: number, w: number, h: number): Spot => ({ key, x, y, w, h })
const corner = (key: string, x: number, y: number) => at(key, x - E, y - E, 2 * E, 2 * E)

export const SPOTS: Spot[] = [
  { key: 'straight:0', ...ZERO },
  ...LABELS.map(({ key, x, y, w, h }) => ({ key, x, y, w, h })),
  ...ONE_TO_36.flatMap((n) => {
    const { x, y } = cellOf(n)
    const row = 2 - ((n - 1) % 3)
    const lastColumn = n > 33
    return [
      ...(lastColumn ? [] : [at(`split:${n}-${n + 3}`, x + CW - E, y + E, 2 * E, CH - 2 * E)]),
      row < 2 ? at(`split:${n - 1}-${n}`, x + E, y + CH - E, CW - 2 * E, 2 * E) : at(`street:${n}-${n + 1}-${n + 2}`, x + E, y + CH - E, CW - 2 * E, 2 * E),
    ]
  }),
  ...[1, 2, 3].map((n) => at(`split:0-${n}`, X0 - E, cellOf(n).y + E, 2 * E, CH - 2 * E)),
  ...ONE_TO_36.filter((n) => n <= 33).flatMap((n) => {
    const { x, y } = cellOf(n)
    return n % 3 === 1
      ? [corner(`line:${range(n, n + 5).join('-')}`, x + CW, y + CH)]
      : [corner(`corner:${n - 1}-${n}-${n + 2}-${n + 3}`, x + CW, y + CH)]
  }),
  corner('trio:0-1-2', X0, Y0 + 2 * CH),
  corner('trio:0-2-3', X0, Y0 + CH),
  corner('basket:0-1-2-3', X0, Y0 + 3 * CH),
]

export const centerOf = (key: string) => {
  const s = SPOTS.find((s) => s.key === key)!
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 }
}
