import { MAX_SEATS, type UserDto } from '@casino/shared';
import { TableService } from '../../src/roulette/application/table.service.js';
import type { PlayerBets, RoundRepository } from '../../src/roulette/domain/round.repository.js';

const player = (id: string): UserDto => ({ id, firstName: id, lastName: '', email: `${id}@test.fr`, role: 'player' });

describe('places à la table', () => {
  let placed: PlayerBets[] = [];
  const table = new TableService({ betsAt: async () => placed } as unknown as RoundRepository);
  (table as unknown as { round: object }).round = { id: 1 };
  const names = async () => (await table.seats()).seats.map((s) => `${s.seat}:${s.name}`);
  afterAll(() => table.onApplicationShutdown());

  it('une place par joueur, gardée tant qu’il est là ou que ses jetons sont sur le tapis', async () => {
    const ana = table.join(player('ana'));
    table.join(player('bob'));
    expect(table.join(player('ana'))).toBe(ana);
    // Un onglet d'Ana fermé : elle reste assise.
    table.leave('ana');
    expect(await names()).toEqual(['1:ana', '2:bob']);
    // Bob part avec des jetons sur le tapis : sa place l'attend jusqu'au tour suivant.
    placed = [{ playerId: 'bob', name: 'bob', bets: [{ bet: 'red', amount: 10 }], won: null }];
    table.leave('bob');
    table.leave('ana');
    expect(await names()).toEqual(['2:bob']);
    placed = [];
    table.join(player('cleo'));
    expect(await names()).toEqual(['1:cleo']);
    table.leave('cleo');
    await table.seats();
  });

  it(`${MAX_SEATS} places : les suivants regardent, et montent à table par ordre d’arrivée`, async () => {
    for (let i = 1; i <= MAX_SEATS + 2; i++) table.join(player(`p${i}`));
    expect(await table.seats()).toMatchObject({ seats: { length: MAX_SEATS }, spectators: 2 });
    table.leave('p3');
    expect(await names()).toContain(`3:p${MAX_SEATS + 1}`);
    expect((await table.seats()).spectators).toBe(1);
  });
});
