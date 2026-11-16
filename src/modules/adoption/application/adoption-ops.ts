import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { ChoreRun, type Chore, type ChoreKind } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import { ChoreSession } from "@modules/habitat/application/habitat";
import type { SanctuaryArea } from "@modules/sanctuary/domain/area";
import type { Species } from "@modules/sanctuary/domain/fauna";
import { shipmentKg, type CatalogEntry } from "../domain/entry";
import { placeFor, type AreaNow, type Placement, ROLE_SHORT } from "../domain/placement";
import { habitatFor, type RackHabitat } from "../domain/rack";

/** The import system and the world, as the catalogue sees them (wired in main.ts). */
export interface AdoptionPorts {
  /** What `kg` from the Sanctuary costs and how long its Hohmann transfer takes (ImportOps.quoteKg). */
  quote(kg: number): { readonly credits: number; readonly transitDays: number; readonly gameHours: number; readonly launcher: string };
  /** Credits she has now. */
  credits(): number;
  /** Place the order on the import system: credits paid, a delivery on its way. */
  order(label: string, kg: number): { readonly deliveryId: number } | { readonly error: string };
  /** They land in the world (habitat, aquarium or a colony); returns their names, if they get one. */
  arrive(entry: CatalogEntry, count: number, area: SanctuaryArea): readonly string[];
  /** The crew calms down with new friends (negative startle). */
  calm?(amount: number): void;
}

export type AdoptionCost =
  | { readonly kind: "importar"; readonly kg: number; readonly credits: number; readonly gameHours: number; readonly transitDays: number; readonly launcher: string }
  | { readonly kind: "eclosion"; readonly days: number; readonly from: string };

export type AdoptionStatus =
  | { readonly kind: "disponible" }
  | { readonly kind: "en-camino"; readonly hoursLeft: number }
  | { readonly kind: "eclosionando"; readonly daysLeft: number }
  | { readonly kind: "a-bordo"; readonly count: number; readonly areaId: string; readonly names: readonly string[] };

export interface AdoptionCheck {
  readonly ok: boolean;
  /** Not adoptable at all for now: it never lived in microgravity, or no real habitat was flown with it. */
  readonly pendiente?: boolean;
  /** Why not, in Spanish for the card. */
  readonly why?: string;
  readonly placement: Placement;
  readonly cost: AdoptionCost;
}

export type AdoptionEvent =
  | { readonly type: "pedido"; readonly entry: CatalogEntry; readonly credits: number; readonly hours: number }
  | { readonly type: "incubando"; readonly entry: CatalogEntry; readonly days: number }
  | { readonly type: "llegada"; readonly entry: CatalogEntry; readonly count: number; readonly area: SanctuaryArea; readonly names: readonly string[] }
  | { readonly type: "amigos"; readonly entry: CatalogEntry }
  | { readonly type: "ayuda"; readonly entry: CatalogEntry }
  | { readonly type: "ayuda-terminada"; readonly entry: CatalogEntry };

/** Colonies' tuning: how long a help program runs, and the calm of a new friendship. Game values. */
export const COLONY_TUNING = { helpDays: 10, friendCalm: 0.1 } as const;

const COLONY_KINDS: ReadonlySet<ChoreKind> = new Set<ChoreKind>(["amistad-especie", "ayuda-especie"]);
export const isColonyChore = (c: Chore): boolean => COLONY_KINDS.has(c.kind);

interface Pending {
  readonly entryId: string;
  readonly areaId: string;
  readonly deliveryId?: number;
  daysLeft?: number;
  readonly hours?: number;
}

interface Colony {
  friends: boolean;
  helpDaysLeft: number;
}

const block = (id: string, pseudo: string, indent?: number, js = toCall(pseudo)): CodeBlock => (indent ? { id, pseudo, js, indent } : { id, pseudo, js });
const order = (id: string, idea: string, steps: readonly (readonly [string, number, string?])[]): OrderExercise => {
  const blocks = steps.map(([s, indent, js], i) => block(String.fromCharCode(97 + i), s, indent || undefined, js));
  return { kind: "order", id, concept: 9, idea, blocks, solution: blocks.map((b) => b.id) };
};
const choice = (id: string, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], options: readonly string[], correct: number): ChoiceExercise => ({ kind: "choice", id, concept: 5, skill, idea, question, code, options, correct });
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/[.:]$/, "");

/**
 * Use cases of the species catalogue (docs/design/catalogo-especies.md). A new game starts with Doménica alone:
 * only the plants and the biofilter's bacteria are aboard (Berón, 2026-11-16). Adopting a species checks where
 * it can live (`fit()` and `loopStatus()` through `placeFor`), pays the Sanctuary through the import system and
 * waits the real transfer, or hatches dormant eggs and cysts from the ship's bank; when they arrive they land
 * in the world and, for a colony, the friendship program becomes available, then its help.
 */
export class AdoptionOps {
  private readonly areas: readonly SanctuaryArea[];
  private readonly built: Set<string>;
  private readonly residents = new Map<string, string[]>();
  private readonly arrived = new Map<string, { count: number; areaId: string; names: string[] }>();
  private readonly pending: Pending[] = [];
  private readonly colonies = new Map<string, Colony>();
  private events: AdoptionEvent[] = [];

  constructor(
    readonly entries: readonly CatalogEntry[],
    private readonly species: readonly Species[],
    /** The real habitats of the rack slots (`RACK_HABITATS`): the only places animals go. */
    readonly habitats: readonly RackHabitat[],
    private readonly ports: AdoptionPorts,
    /** Habitats installed now (all of them by default). */
    built: readonly string[] = habitats.map((h) => h.id),
  ) {
    this.areas = habitats.map((h) => h.area);
    this.built = new Set(built);
    const aboard = new Set(entries.filter((e) => e.aboard).map((e) => e.speciesId));
    for (const a of this.areas) this.residents.set(a.id, a.residents.filter((id) => aboard.has(id)));
    for (const e of entries.filter((x) => x.aboard)) {
      const where = this.areas.find((a) => this.built.has(a.id) && a.residents.includes(e.speciesId));
      if (where) this.arrived.set(e.id, { count: e.acquire.count, areaId: where.id, names: [] });
    }
  }

  entry(id: string): CatalogEntry {
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new Error(`No está en el catálogo: ${id}`);
    return e;
  }

  private speciesOf(e: CatalogEntry): Species {
    const s = this.species.find((x) => x.id === e.speciesId);
    if (!s) throw new Error(`Especie desconocida: ${e.speciesId}`);
    return s;
  }

  /** Every area with who lives there now (those on their way count: they have a place booked). */
  areasNow(): AreaNow[] {
    return this.areas.map((area) => ({ area, built: this.built.has(area.id), residents: [...(this.residents.get(area.id) ?? []), ...this.pending.filter((p) => p.areaId === area.id).map((p) => this.entry(p.entryId).speciesId)] }));
  }

  /** Species ids living in an area (arrived). */
  residentsOf(areaId: string): readonly string[] {
    return this.residents.get(areaId) ?? [];
  }

  markBuilt(areaId: string): void {
    this.built.add(areaId);
  }

  cost(e: CatalogEntry): AdoptionCost {
    const a = e.acquire;
    if (a.kind === "eclosion") return { kind: "eclosion", days: a.days, from: a.from };
    const kg = shipmentKg(a, this.ports.quote(1).transitDays);
    const q = this.ports.quote(kg);
    return { kind: "importar", kg, credits: q.credits, gameHours: q.gameHours, transitDays: q.transitDays, launcher: q.launcher };
  }

  status(id: string): AdoptionStatus {
    const p = this.pending.find((x) => x.entryId === id);
    if (p?.daysLeft !== undefined) return { kind: "eclosionando", daysLeft: p.daysLeft };
    if (p) return { kind: "en-camino", hoursLeft: p.hours ?? 0 };
    const a = this.arrived.get(id);
    return a ? { kind: "a-bordo", count: a.count, areaId: a.areaId, names: a.names } : { kind: "disponible" };
  }

  /** Whether a habitat (area id) was flown with this species. */
  accepts(areaId: string, speciesId: string): boolean {
    return this.habitats.some((h) => h.id === areaId && h.accepts.includes(speciesId));
  }

  /** Animals in a habitat now, those on their way included. */
  private headcount(areaId: string): number {
    const here = [...this.arrived.entries()].filter(([, a]) => a.areaId === areaId).reduce((n, [, a]) => n + a.count, 0);
    return here + this.pending.filter((p) => p.areaId === areaId).reduce((n, p) => n + this.entry(p.entryId).acquire.count, 0);
  }

  /**
   * Whether it can be adopted now, where it would live, and what it costs. Only a real species (it lived in
   * microgravity) into a real habitat flown with it; there, `fit()`, the loop and the habitat's room decide.
   */
  check(id: string): AdoptionCheck {
    const e = this.entry(id);
    const sp = this.speciesOf(e);
    const now = this.areasNow();
    const homes = new Set(habitatFor(this.habitats, e.speciesId).map((h) => h.id));
    const home = placeFor(sp, now.filter((a) => homes.has(a.area.id)), this.species).area;
    const placement: Placement = { ...(home ? { area: home } : {}), verdicts: placeFor(sp, now, this.species).verdicts };
    const cost = this.cost(e);
    const no = (why: string, pendiente = false): AdoptionCheck => ({ ok: false, ...(pendiente ? { pendiente } : {}), why, placement, cost });
    if (!e.real) return no("Pendiente: nunca ha vivido en ingravidez", true);
    if (!homes.size) return no("Pendiente: aún no hay a bordo un hábitat real probado con ella", true);
    if (this.pending.some((p) => p.entryId === id)) return no(e.acquire.kind === "eclosion" ? "Ya están eclosionando" : "Ya vienen de camino");
    if (!placement.area) {
      const mine = placement.verdicts.filter((v) => homes.has(v.areaId));
      const built = mine.filter((v) => v.built);
      const fits = built.filter((v) => v.fit.ok);
      if (!fits.length) return no(mine.some((v) => v.fit.ok) ? "Su hábitat aún no está instalado" : "No cabe en su hábitat");
      const missing = fits[0]!.loop.missing.map((r) => ROLE_SHORT[r]).join(" y ");
      return no(`El bucle de ${fits[0]!.areaName} no se cierra: falta ${missing}`);
    }
    const hab = this.habitats.find((h) => h.id === placement.area!.id)!;
    const left = hab.capacity - this.headcount(hab.id);
    if (e.acquire.count > left) return no(`${hab.area.name} lleno: caben ${Math.max(0, left)} más`);
    if (cost.kind === "importar" && cost.credits > this.ports.credits()) return no(`Faltan ${Math.ceil(cost.credits - this.ports.credits()).toLocaleString("es-ES")} créditos`);
    return { ok: true, placement, cost };
  }

  /** Adopt: the order leaves the Sanctuary (or the eggs go to the incubator) with a place booked. */
  adopt(id: string): void {
    const c = this.check(id);
    if (!c.ok || !c.placement.area) throw new Error(c.why ?? "No se puede adoptar");
    const e = this.entry(id);
    const areaId = c.placement.area.id;
    if (c.cost.kind === "eclosion") {
      this.pending.push({ entryId: id, areaId, daysLeft: c.cost.days });
      this.events.push({ type: "incubando", entry: e, days: c.cost.days });
      return;
    }
    const r = this.ports.order(`${cap(e.acquire.what)} (${e.name})`, c.cost.kg);
    if ("error" in r) throw new Error(r.error);
    this.pending.push({ entryId: id, areaId, deliveryId: r.deliveryId, hours: c.cost.gameHours });
    this.events.push({ type: "pedido", entry: e, credits: c.cost.credits, hours: c.cost.gameHours });
  }

  /** Station hours pass: what is still on its way (the delivery itself lands through the import system). */
  tickHours(hours: number): void {
    for (const p of this.pending) if (p.hours !== undefined) (p as { hours: number }).hours = Math.max(0, p.hours - hours);
  }

  /** A delivery of the import system landed: if it was animals, they arrive. Returns whether it was ours. */
  delivered(deliveryId: number): boolean {
    const i = this.pending.findIndex((p) => p.deliveryId === deliveryId);
    if (i < 0) return false;
    const [p] = this.pending.splice(i, 1);
    this.land(p!);
    return true;
  }

  /** Board days pass: eggs and cysts hatch; help programs run out. */
  tick(days: number): void {
    if (days <= 0) return;
    for (const p of [...this.pending]) {
      if (p.daysLeft === undefined) continue;
      p.daysLeft -= days;
      if (p.daysLeft <= 0) {
        this.pending.splice(this.pending.indexOf(p), 1);
        this.land(p);
      }
    }
    for (const [id, c] of this.colonies) {
      if (c.helpDaysLeft <= 0) continue;
      c.helpDaysLeft -= days;
      if (c.helpDaysLeft <= 0) this.events.push({ type: "ayuda-terminada", entry: this.entry(id) });
    }
  }

  private land(p: Pending): void {
    const e = this.entry(p.entryId);
    const area = this.areas.find((a) => a.id === p.areaId)!;
    const names = [...this.ports.arrive(e, e.acquire.count, area)];
    const list = this.residents.get(area.id)!;
    if (!list.includes(e.speciesId)) list.push(e.speciesId);
    const was = this.arrived.get(e.id);
    this.arrived.set(e.id, { count: (was?.count ?? 0) + e.acquire.count, areaId: area.id, names: [...(was?.names ?? []), ...names] });
    if (e.lodging === "colonia" && !this.colonies.has(e.id)) this.colonies.set(e.id, { friends: false, helpDaysLeft: 0 });
    this.events.push({ type: "llegada", entry: e, count: e.acquire.count, area, names });
  }

  friends(id: string): boolean {
    return this.colonies.get(id)?.friends ?? false;
  }
  helping(id: string): boolean {
    return (this.colonies.get(id)?.helpDaysLeft ?? 0) > 0;
  }

  drainEvents(): AdoptionEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Where a colony lives (its area id), once it arrived. */
  areaOf(id: string): string | undefined {
    return this.arrived.get(id)?.areaId;
  }

  /** Befriending each colony that arrived, then asking it for help (mind programs). */
  chores(): Chore[] {
    const out: Chore[] = [];
    for (const [id, c] of this.colonies) {
      const e = this.entry(id);
      if (!c.friends) out.push(this.befriendChore(e));
      else if (c.helpDaysLeft <= 0 && e.contributions[0]) out.push(this.helpChore(e));
    }
    return out;
  }

  start(chore: Chore): ChoreSession {
    if (!isColonyChore(chore)) throw new Error(`No es una tarea del catálogo: ${chore.id}`);
    const id = chore.targetId!;
    const run = new ChoreRun(chore, 2);
    return new ChoreSession(
      run,
      () => {},
      () => {
        const c = this.colonies.get(id)!;
        const e = this.entry(id);
        if (chore.kind === "amistad-especie") {
          c.friends = true;
          this.ports.calm?.(COLONY_TUNING.friendCalm);
          this.events.push({ type: "amigos", entry: e });
        } else {
          c.helpDaysLeft = COLONY_TUNING.helpDays;
          this.events.push({ type: "ayuda", entry: e });
        }
      },
      () => {},
    );
  }

  private befriendChore(e: CatalogEntry): Chore {
    const who = e.plural.replace(/^(los|las|el|la|un|una) /, "");
    return {
      id: `especie-amistad-${e.id}`,
      kind: "amistad-especie",
      targetId: e.id,
      title: `Hacer amistad con ${e.plural}`,
      scenario: `Acaban de llegar y no te conocen: escribe en su mente que eres amiga`,
      exercises: [
        order(`especie-amistad-${e.id}-programa`, "¿Quién es esa? ¿Trae comida o peligro?", [
          ["cuando Doménica se acerque", 0, "on('domenica-cerca', (ella) => {"],
          ["si viene despacio y con calma", 1, "if (ella.despacio && ella.calma) {"],
          ["recordar su olor y su voz", 2, "recordar(ella.olor, ella.voz);"],
          ["acercarse sin miedo", 2, "acercarse(ella);"],
          ["fin del si", 1, "}"],
          ["fin", 0, "});"],
        ]),
        choice(
          `especie-amistad-${e.id}-predecir`,
          "predecir",
          "¿Nos quedamos o nos escondemos?",
          `${cap(who)}: calma 0,8 y ya conocen su voz. ¿Qué hacen al verla?`,
          [block("a", "si calma > 0,5 y conoce(voz) entonces", 0, "if (calma > 0.5 && conoce(voz)) {"), block("b", "acercarse()", 1, "acercarse();"), block("c", "si no", 0, "} else {"), block("d", "esconderse()", 1, "esconderse();"), block("e", "fin", 0, "}")],
          ["Se esconden", "Se acercan", "No hacen nada"],
          1,
        ),
      ],
    };
  }

  private helpChore(e: CatalogEntry): Chore {
    const help = e.contributions[0]!;
    const first = help.split(/[:;.]/)[0]!.trim();
    return {
      id: `especie-ayuda-${e.id}`,
      kind: "ayuda-especie",
      targetId: e.id,
      title: `Pedir ayuda a ${e.plural}`,
      scenario: `Son tus amigos: prográmalos para que ${lower(first)}`,
      exercises: [
        order(`especie-ayuda-${e.id}-programa`, "¿Nos lo pides a nosotros?", [
          ["cuando Doménica lo pida", 0, "on('domenica-pide', () => {"],
          [lower(first), 1],
          ["descansar al terminar", 1, "descansar();"],
          ["fin", 0, "});"],
        ]),
        choice(
          `especie-ayuda-${e.id}-especificar`,
          "especificar",
          "Dinos cómo, sin hacernos daño",
          "¿Qué programa les pide ayuda como a amigos?",
          [],
          [`Que ${lower(first)} y luego descansen`, "Que trabajen sin parar hasta caer", "Que lo hagan solo cuando nadie mire"],
          0,
        ),
      ],
    };
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
