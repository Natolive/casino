// Les places autour d'une table, comme au casino : chaque joueur garde les siennes tant qu'il est là (un onglet ouvert au
// moins) ou qu'il a des jetons sur la table. `player` désigne le joueur auprès des autres sans dévoiler son compte.
// Placement automatique (`auto`, la roulette) : une place par joueur, donnée à l'arrivée ; table pleine, les suivants
// regardent et montent à table, par ordre d'arrivée, dès qu'une place se libère. Sinon (le blackjack), on arrive en
// spectateur et on choisit ses places (`sit`, `stand`).
type Present = { player: number; seats: number[]; name: string; connections: number };

export class Seating {
  private readonly present = new Map<string, Present>();
  private arrivals = 0;

  constructor(
    private readonly size: number,
    private readonly auto = true,
  ) {}

  // Un onglet de plus : le joueur garde ses places, ou (placement automatique) prend la première libre.
  join(id: string, name: string): number {
    const present = this.present.get(id) ?? this.arrive(id, name);
    present.connections++;
    this.fill();
    return present.player;
  }

  // Un onglet de moins ; il ne s'en va qu'au prochain `update`, s'il n'a plus de jetons sur la table.
  leave(id: string) {
    const present = this.present.get(id);
    if (present) present.connections--;
  }

  // `holders` : les joueurs qui ont des jetons sur la table, et leur prénom. Ils gardent leurs places même partis (et
  // la retrouvent si l'API a redémarré) ; les autres, partis, les libèrent.
  update(holders: Map<string, string>) {
    for (const [id, name] of holders) if (!this.present.has(id)) this.arrive(id, name);
    for (const [id, p] of this.present) if (!p.connections && !holders.has(id)) this.present.delete(id);
    this.fill();
  }

  // Prend une place libre (le joueur arrive à la table s'il n'y était pas encore) ; rend false si elle est prise.
  sit(id: string, name: string, seat: number) {
    if (seat < 1 || seat > this.size || this.ownerOf(seat)) return false;
    (this.present.get(id) ?? this.arrive(id, name)).seats.push(seat);
    return true;
  }

  stand(id: string, seat: number) {
    const present = this.present.get(id);
    if (present) present.seats = present.seats.filter((s) => s !== seat);
  }

  ownerOf(seat: number) {
    return [...this.present].find(([, p]) => p.seats.includes(seat))?.[0] ?? null;
  }

  seatsOf(id: string) {
    return this.present.get(id)?.seats ?? [];
  }

  // Les places occupées, dans l'ordre.
  seated() {
    return [...this.present]
      .flatMap(([id, p]) => p.seats.map((seat) => ({ id, player: p.player, seat, name: p.name })))
      .sort((a, b) => a.seat - b.seat);
  }

  get spectators() {
    return [...this.present.values()].filter((p) => !p.seats.length).length;
  }

  private arrive(id: string, name: string) {
    const present: Present = { player: ++this.arrivals, seats: [], name, connections: 0 };
    this.present.set(id, present);
    return present;
  }

  private fill() {
    if (!this.auto) return;
    const taken = new Set([...this.present.values()].flatMap((p) => p.seats));
    const free = Array.from({ length: this.size }, (_, i) => i + 1).filter((n) => !taken.has(n));
    for (const p of this.present.values()) if (!p.seats.length && free.length) p.seats.push(free.shift()!);
  }
}
