// Les jeux de l'accueil, rangés par salle. Un jeu sans `path` est annoncé, pas encore jouable.
export type Game = { id: string; name: string; tagline: string; icon: string; path?: string }
export type GameRoom = { id: string; name: string; games: Game[] }

export const GAME_ROOMS: GameRoom[] = [
  {
    id: 'tables',
    name: 'Tables',
    games: [
      { id: 'roulette', name: 'Roulette', tagline: 'Européenne, un seul zéro', icon: 'i-lucide-circle-dot', path: '/roulette' },
      { id: 'craps', name: 'Craps', tagline: 'Deux dés, mille paris', icon: 'i-lucide-dices' },
      { id: 'sic-bo', name: 'Sic Bo', tagline: 'Trois dés sous la cloche', icon: 'i-lucide-dice-5' },
    ],
  },
  {
    id: 'cards',
    name: 'Cartes',
    games: [
      { id: 'blackjack', name: 'Blackjack', tagline: 'Approche 21 sans le dépasser', icon: 'i-lucide-spade', path: '/blackjack' },
      { id: 'poker', name: 'Poker', tagline: 'Texas Hold’em entre joueurs', icon: 'i-lucide-club' },
      { id: 'baccarat', name: 'Baccarat', tagline: 'Banque ou joueur', icon: 'i-lucide-diamond' },
    ],
  },
  {
    id: 'machines',
    name: 'Machines & tirages',
    games: [
      { id: 'slots', name: 'Machines à sous', tagline: 'Trois rouleaux, un levier', icon: 'i-lucide-cherry' },
      { id: 'keno', name: 'Keno', tagline: 'Coche tes numéros', icon: 'i-lucide-grid-3x3' },
      { id: 'wheel', name: 'Roue de la fortune', tagline: 'Un tour, un multiplicateur', icon: 'i-lucide-life-buoy' },
    ],
  },
]

