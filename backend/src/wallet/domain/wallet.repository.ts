import type { LeaderboardEntryDto } from '@casino/shared';

export abstract class WalletRepository {
  abstract balanceOf(playerId: string): Promise<number>;
  // Remonte le solde à `floor` s'il est en dessous.
  abstract topUp(playerId: string, floor: number): Promise<number>;
  // Les `limit` plus gros soldes, du plus riche au moins riche ; `you` marque `playerId`.
  abstract richest(limit: number, playerId: string): Promise<LeaderboardEntryDto[]>;
  // Nombre de joueurs strictement plus riches que `balance`.
  abstract countRicherThan(balance: number): Promise<number>;
}
