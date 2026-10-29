// Roulette européenne : 37 cases, un seul zéro. Ordre des numéros sur le cylindre, dans le sens des aiguilles d'une montre.
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

// Place d'un numéro sur le cylindre, et numéro à une place donnée (en faisant le tour).
export const wheelIndex = (n: number) => WHEEL.indexOf(n as (typeof WHEEL)[number])
export const wheelAt = (i: number) => WHEEL[((i % 37) + 37) % 37]!

export type PocketColor = 'green' | 'red' | 'black'
export const colorOf = (n: number): PocketColor => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black')
