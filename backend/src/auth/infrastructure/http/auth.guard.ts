import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { PlayerRequest } from '../../../common/infrastructure/http/player.js';
import { AuthService } from '../../application/auth.service.js';
import { ForbiddenError } from '../../domain/auth.errors.js';
import { sessionToken } from './session-cookie.js';

// Guard global : retrouve le joueur de la session, sans rien refuser (les routes publiques restent ouvertes ;
// @PlayerId / @CurrentUser rendent 401 sans joueur).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PlayerRequest>();
    const token = sessionToken(req);
    if (token) req.user = (await this.auth.userOf(token)) ?? undefined;
    return true;
  }
}

// Routes admin (@UseGuards(AdminGuard)) : après AuthGuard, global, donc le joueur est déjà connu.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.switchToHttp().getRequest<PlayerRequest>().user?.role === 'admin') return true;
    throw new ForbiddenError();
  }
}
