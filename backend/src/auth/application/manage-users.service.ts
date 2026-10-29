import { Injectable } from '@nestjs/common';
import type { AdminUserDto, UpdateUserDto } from '@casino/shared';
import { ForbiddenError, UserNotFoundError } from '../domain/auth.errors.js';
import { UserRepository } from '../domain/user.repository.js';

// Page admin : voir les joueurs, changer leur rôle ou leurs jetons.
@Injectable()
export class ManageUsersService {
  constructor(private readonly users: UserRepository) {}

  list(): Promise<AdminUserDto[]> {
    return this.users.list();
  }

  async update(adminId: string, id: string, changes: UpdateUserDto): Promise<AdminUserDto> {
    // Pas de casino sans admin : on ne se retire pas son propre rôle.
    if (id === adminId && changes.role && changes.role !== 'admin') throw new ForbiddenError('Tu ne peux pas te retirer le rôle admin.');
    const user = await this.users.update(id, changes);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
