/**
 * A Bishop-type cargo airlock (docs/design/estacion-real.md, «Esclusa Bishop»). It has no hatches of
 * its own: the station's CBM hatch closes it. To put something out, the crew loads it, closes the
 * hatch, the vestibule's air is pumped back, the CBM bolts are released and Canadarm2 carries the
 * airlock out, where the payload is let go; then the arm berths it again. Real (Nanoracks, 2020).
 *
 * Retrieving a free-flyer back into the Bishop has never been done: the arm has only caught
 * vehicles with a grapple fixture. Here it is a licence, said so on the card.
 */

export interface AirlockItem {
  readonly id: string;
  readonly name: string;
  readonly massKg: number;
  readonly volumeM3: number;
}

/** Where a payload is: in the station's stowage, loaded in the airlock, or released outside. */
export type ItemPlace = "almacen" | "bishop" | "fuera";

/** The steps of one trip out, in order (the real sequence). */
export const DEPLOY_STEPS: readonly string[] = [
  "cerrar la escotilla CBM de Tranquility",
  "bombear el aire del vestíbulo de vuelta a la estación",
  "soltar los pernos del CBM",
  "Canadarm2 lleva la Bishop a la posición de suelta",
  "soltar la carga",
  "Canadarm2 vuelve a atracar la Bishop y se aprietan los pernos",
  "llenar el vestíbulo y abrir la escotilla",
];

export class CargoAirlock {
  private readonly where = new Map<string, ItemPlace>();
  /** Trips out so far. */
  trips = 0;

  constructor(
    readonly items: readonly AirlockItem[],
    /** Pressurised volume inside, m³ (Bishop: 3,99). */
    readonly volumeM3: number,
  ) {
    for (const i of items) this.where.set(i.id, "almacen");
  }

  place(id: string): ItemPlace {
    const p = this.where.get(id);
    if (!p) throw new Error(`No item ${id}`);
    return p;
  }

  item(id: string): AirlockItem {
    const i = this.items.find((x) => x.id === id);
    if (!i) throw new Error(`No item ${id}`);
    return i;
  }

  /** What is in a place. */
  at(place: ItemPlace): AirlockItem[] {
    return this.items.filter((i) => this.where.get(i.id) === place);
  }

  /** Volume taken inside, m³. */
  get loadedM3(): number {
    return this.at("bishop").reduce((s, i) => s + i.volumeM3, 0);
  }

  /** Load an item from the stowage; why not, if it cannot. */
  stow(id: string): string | undefined {
    const p = this.place(id);
    if (p === "bishop") return "Ya está en la Bishop";
    if (p === "fuera") return "Está fuera: recógela primero";
    const it = this.item(id);
    if (this.loadedM3 + it.volumeM3 > this.volumeM3 + 1e-9) return `No cabe: quedan ${(this.volumeM3 - this.loadedM3).toFixed(2).replace(".", ",")} m³ en la Bishop`;
    this.where.set(id, "bishop");
    return undefined;
  }

  /** Take an item back out of the airlock into the stowage. */
  unstow(id: string): string | undefined {
    if (this.place(id) !== "bishop") return "No está en la Bishop";
    this.where.set(id, "almacen");
    return undefined;
  }

  /** One trip out: everything loaded is released. Returns what went out, or why not. */
  deploy(): { released: AirlockItem[] } | { why: string } {
    const load = this.at("bishop");
    if (!load.length) return { why: "La Bishop está vacía: guarda antes la sonda o un cubesat" };
    for (const i of load) this.where.set(i.id, "fuera");
    this.trips++;
    return { released: load };
  }

  /** Bring a released item back (licence: the arm catches it and it goes back to the stowage). */
  retrieve(id: string): string | undefined {
    if (this.place(id) !== "fuera") return "No está fuera";
    this.where.set(id, "almacen");
    return undefined;
  }
}
