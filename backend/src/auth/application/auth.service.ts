import { Injectable } from '@nestjs/common';
import { STARTING_BALANCE, type LoginDto, type RegisterDto, type UserDto } from '@casino/shared';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { EmailTakenError, InvalidCredentialsError } from '../domain/auth.errors.js';
import { UserRepository } from '../domain/user.repository.js';

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
export const SESSION_MAX_AGE_MS = 365 * 24 * 3600 * 1000;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scryptAsync(password, salt, 64)).toString('hex')}`;
}

async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await scryptAsync(password, salt!, 64), Buffer.from(hash!, 'hex'));
}

// Le jeton va dans le cookie, seul son sha256 va en base.
export const sessionIdOf = (token: string) => createHash('sha256').update(token).digest('hex');

// Inscription, connexion, déconnexion. Une connexion = un jeton aléatoire, gardé un an dans un cookie httpOnly.
// ponytail: pas de limite de tentatives (jetons fictifs) ; un compteur par email/IP si les comptes prennent de la valeur.
@Injectable()
export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register({ password, ...identity }: RegisterDto): Promise<{ user: UserDto; token: string }> {
    const user = await this.users.create({ ...identity, passwordHash: await hashPassword(password), balance: STARTING_BALANCE });
    if (user === 'taken') throw new EmailTakenError();
    return { user, token: await this.openSession(user.id) };
  }

  async login({ email, password }: LoginDto): Promise<{ user: UserDto; token: string }> {
    const found = await this.users.credentialsOf(email);
    if (!found || !(await checkPassword(password, found.passwordHash))) throw new InvalidCredentialsError();
    const { passwordHash: _, ...user } = found;
    return { user, token: await this.openSession(user.id) };
  }

  logout(token: string): Promise<void> {
    return this.users.closeSession(sessionIdOf(token));
  }

  userOf(token: string): Promise<UserDto | null> {
    return this.users.userOfSession(sessionIdOf(token), SESSION_MAX_AGE_MS);
  }

  private async openSession(playerId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.users.openSession(sessionIdOf(token), playerId);
    return token;
  }
}
