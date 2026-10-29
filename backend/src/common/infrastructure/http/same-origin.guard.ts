import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CrossSiteRequestError } from '../../domain/errors/cross-site-request.error.js';

const READ_ONLY = ['GET', 'HEAD', 'OPTIONS'];

// Guard global contre les requêtes forcées (CSRF) : une action (tout sauf une lecture) venue d'un autre site est refusée
// (`Sec-Fetch-Site`, donné par le navigateur). Sans l'en-tête (curl, scripts) : acceptée.
@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const site = req.headers['sec-fetch-site'];
    if (READ_ONLY.includes(req.method) || site === undefined || site === 'same-origin' || site === 'none') return true;
    throw new CrossSiteRequestError();
  }
}
