import type { HandDto } from '@casino/shared';

// Ce que la table a rendu sur une case, à son joueur, et ses mains.
export type Settlement = { playerId: string; seat: number; won: number; hands: HandDto[] };

export abstract class BlackjackRoundRepository {
  // Ouvre un nouveau tour et rend son numéro.
  abstract open(hash: string): Promise<number>;
  // Remplace la mise du joueur sur l'une de ses cases, sur un tour encore ouvert (0 : il la reprend) : rend le solde, 'closed' si les cartes sont
  // données, 'funds' si le solde ne couvre pas la nouvelle mise (rien n'est écrit).
  abstract placeBet(roundId: number, playerId: string, seat: number, amount: number): Promise<number | 'closed' | 'funds'>;
  // Ferme les mises (plus rien ne passe après) et rend celles du tour.
  abstract close(roundId: number): Promise<{ playerId: string; seat: number; staked: number }[]>;
  // Jetons remis en jeu en cours de main (doubler, séparer) : rend le solde, 'funds' s'il ne les couvre pas.
  abstract raise(roundId: number, seat: number, playerId: string, amount: number): Promise<number | 'funds'>;
  // Révèle la graine et paie les joueurs, d'un bloc ; sans effet sur un tour déjà réglé.
  abstract settle(roundId: number, seed: string, settlements: Settlement[]): Promise<void>;
  // Tours restés en cours (serveur arrêté) : mises rendues, tours supprimés.
  abstract refundOpen(): Promise<void>;
}
