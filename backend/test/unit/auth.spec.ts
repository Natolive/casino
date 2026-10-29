import type { UserDto } from '@casino/shared';
import { AuthService } from '../../src/auth/application/auth.service.js';
import type { NewUser, UserRepository } from '../../src/auth/domain/user.repository.js';

const publicOf = ({ passwordHash: _, ...user }: UserDto & { passwordHash: string }): UserDto => user;

// Dépôt en mémoire : juste ce qu'AuthService utilise.
function memoryUsers() {
  const users: (UserDto & { passwordHash: string })[] = [];
  const sessions = new Map<string, string>();
  return {
    async create({ balance: _, ...user }: NewUser) {
      if (users.some((u) => u.email === user.email)) return 'taken' as const;
      const created = { ...user, id: String(users.length), role: users.length ? 'player' : 'admin' } as const;
      users.push(created);
      return publicOf(created);
    },
    credentialsOf: async (email: string) => users.find((u) => u.email === email) ?? null,
    openSession: async (id: string, playerId: string) => void sessions.set(id, playerId),
    userOfSession: async (id: string) => {
      const user = users.find((u) => u.id === sessions.get(id));
      return user ? publicOf(user) : null;
    },
    closeSession: async (id: string) => void sessions.delete(id),
  } as unknown as UserRepository;
}

describe('comptes', () => {
  it('inscrit, connecte et déconnecte', async () => {
    const auth = new AuthService(memoryUsers());
    const identity = { email: 'jeanne@exemple.fr', firstName: 'Jeanne', lastName: 'Martin' };
    const { user, token } = await auth.register({ ...identity, password: 'motdepasse' });
    expect(user).toMatchObject({ ...identity, role: 'admin' });
    await expect(auth.register({ ...identity, password: 'autrechose' })).rejects.toThrow('existe déjà');
    await expect(auth.login({ email: identity.email, password: 'mauvais!!' })).rejects.toThrow('incorrect');

    const login = await auth.login({ email: identity.email, password: 'motdepasse' });
    expect(await auth.userOf(login.token)).toEqual(user);
    expect(await auth.userOf(token)).toEqual(user);
    await auth.logout(login.token);
    expect(await auth.userOf(login.token)).toBeNull();
  });
});
