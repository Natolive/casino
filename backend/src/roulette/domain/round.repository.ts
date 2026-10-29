import type { PlacedBet } from '@casino/shared';

export abstract class RoundRepository {
  // Ouvre un nouveau tour et rend son numéro.
  abstract open(hash: string): Promise<number>;
  // Remplace les mises du joueur sur un tour encore ouvert : rend le solde, 'closed' si les jeux sont faits, 'funds' si
  // le solde ne couvre pas la nouvelle mise (rien n'est écrit).
  abstract placeBets(roundId: number, playerId: string, bets: PlacedBet[]): Promise<number | 'closed' | 'funds'>;
  // Ferme le tour sur ce numéro (et révèle sa graine) et crédite les gagnants, d'un bloc.
  abstract settle(roundId: number, result: number, seed: string): Promise<void>;
  // Tours restés ouverts (serveur arrêté pendant les mises) : mises rendues, tours supprimés.
  abstract refundOpen(): Promise<void>;
  abstract betsOf(roundId: number, playerId: string): Promise<PlacedBet[]>;
  // Derniers numéros sortis à la table, le plus récent en premier.
  abstract lastResults(limit: number): Promise<number[]>;
}
