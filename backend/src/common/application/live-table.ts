import type { UserDto } from '@casino/shared';
import type { Observable } from 'rxjs';

// Une table en direct, vue par LiveTableGateway : ce que le croupier pousse à tous (`events`), les onglets qui
// s'assoient ou partent, et ce qu'un onglet qui arrive reçoit tout de suite.
export interface LiveTable<E> {
  readonly events: Observable<E>;
  // Rend ce qui désigne le joueur auprès des autres (`player`).
  join(user: UserDto): number;
  leave(playerId: string): void;
  snapshot(playerId: string): Promise<E | null>;
}
