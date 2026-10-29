export abstract class WalletRepository {
  abstract balanceOf(playerId: string): Promise<number>;
  // Remonte le solde à `floor` s'il est en dessous.
  abstract topUp(playerId: string, floor: number): Promise<number>;
}
