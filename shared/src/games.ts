// Les jeux de l'accueil. Un jeu sans `path` est annoncé, pas encore jouable.
export type Game = { id: string; name: string; tagline: string; icon: string; path?: string }

export const GAMES: Game[] = [
  { id: 'roulette', name: 'Roulette', tagline: 'Européenne, un seul zéro', icon: 'i-lucide-circle-dot', path: '/roulette' },
  { id: 'blackjack', name: 'Blackjack', tagline: 'Bientôt à la table', icon: 'i-lucide-spade' },
  { id: 'poker', name: 'Poker', tagline: 'Bientôt à la table', icon: 'i-lucide-club' },
]
