import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserDto } from '@casino/shared';
import type { Request } from 'express';
import { NotLoggedInError } from '../../../auth/domain/auth.errors.js';

// Le joueur connecté, posé sur la requête par AuthGuard (cookie `session`).
export type PlayerRequest = Request & { user?: UserDto };

const userOf = (ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<PlayerRequest>().user;
  if (!user) throw new NotLoggedInError();
  return user;
};

// Route réservée aux joueurs connectés : 401 sinon.
export const PlayerId = createParamDecorator((_: unknown, ctx: ExecutionContext) => userOf(ctx).id);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => userOf(ctx));
