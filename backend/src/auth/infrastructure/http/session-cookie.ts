import type { Request, Response } from 'express';
import { SESSION_MAX_AGE_MS } from '../../application/auth.service.js';

const COOKIE = 'session';

export const sessionToken = (req: Request) => req.headers.cookie?.match(/(?:^|;\s*)session=([\w-]+)/)?.[1];

export const setSessionCookie = (req: Request, res: Response, token: string) =>
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_MAX_AGE_MS, secure: req.secure });

export const clearSessionCookie = (res: Response) => res.clearCookie(COOKIE);
