// Règles et schémas partagés front/back : la même règle valide la mise côté table et côté API.
// Source TypeScript chargée telle quelle (type stripping de Node côté back, Vite côté front) :
// imports relatifs avec l'extension .ts, et uniquement de la syntaxe effaçable (pas d'enum, pas de namespace).
export * from './app.ts'
export * from './games.ts'
export * from './auth.dto.ts'
export * from './wallet.dto.ts'
export * from './roulette/wheel.ts'
export * from './roulette/bets.ts'
export * from './roulette/spin.dto.ts'
