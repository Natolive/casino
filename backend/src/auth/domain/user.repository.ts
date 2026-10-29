import type { AdminUserDto, UpdateUserDto, UserDto } from '@casino/shared';

export type NewUser = Pick<UserDto, 'email' | 'firstName' | 'lastName'> & { passwordHash: string; balance: number };

export abstract class UserRepository {
  // Crée le compte (admin si c'est le tout premier) ; 'taken' si l'email a déjà un compte.
  abstract create(user: NewUser): Promise<UserDto | 'taken'>;
  abstract credentialsOf(email: string): Promise<(UserDto & { passwordHash: string }) | null>;
  abstract openSession(sessionId: string, playerId: string): Promise<void>;
  // Le joueur d'une session encore valable (moins de `maxAgeMs`).
  abstract userOfSession(sessionId: string, maxAgeMs: number): Promise<UserDto | null>;
  abstract closeSession(sessionId: string): Promise<void>;
  abstract list(): Promise<AdminUserDto[]>;
  // null si le joueur n'existe pas.
  abstract update(id: string, changes: UpdateUserDto): Promise<AdminUserDto | null>;
}
