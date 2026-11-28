import { ChoreRun } from "@modules/chores/domain/chore";
import { StationSession } from "@modules/station/application/station-ops";
import { planShipment, tierBlocker, type Carrier, type Shipment, type SupplyItem, type SupplyLauncher } from "@modules/station/domain/component-supply";
import type { ImportQuote } from "../domain/quote";
import type { ImportOps } from "./import-ops";
import { orderChore } from "./challenges";

/** What importing one component (or what a vehicle still lacks) takes: mass, vehicle, launcher, price and trip. */
export interface ComponentOffer {
  readonly label: string;
  readonly parts: Readonly<Record<string, number>>;
  readonly kg: number;
  readonly shipment: Shipment;
  /** With the shipment's launcher (or the cheapest, when none lifts it: only to show the multiplier). */
  readonly quote: ImportQuote;
  /** Why it cannot be ordered now (de serie, tier closed, too heavy, credits). */
  readonly blocker?: string;
  /** The tier is open (it may still lack credits): the catalogue shows it «desbloqueado». */
  readonly unlocked: boolean;
}

export type ComponentEvent = { readonly type: "llega"; readonly label: string; readonly parts: Readonly<Record<string, number>> };

const es = (v: number) => Math.ceil(v).toLocaleString("es-ES");

/**
 * Use case: better components and whole vehicles come from Earth (docs/design/importacion.md §5,
 * componentes.md §7). Nothing major is made at the station: a part is paid in credits, flies in a
 * cargo vehicle (Cygnus, Dragon) or on its own, the arm berths it, and it waits in the hangar to be
 * fitted in the bay or used to assemble a catalogue vehicle. Tiers open one at a time. It rides on
 * `ImportOps` (same quote, wallet and inbox) without changing it.
 */
export class ComponentImports {
  private readonly obtained = new Set<string>();
  private readonly inFlight = new Map<number, { label: string; parts: Readonly<Record<string, number>> }>();
  private events: ComponentEvent[] = [];

  constructor(
    readonly ops: ImportOps,
    readonly items: readonly SupplyItem[],
    private readonly carriers: readonly Carrier[],
    private readonly launchers: readonly SupplyLauncher[],
    /** Heaviest free-flyer the arm captures, kg. */
    private readonly armMaxKg: number,
    /** Mass of any part of a vehicle recipe (catalogue components included). */
    private readonly massOf: (partId: string) => number | undefined,
  ) {
    for (const i of items) if (i.deSerie) this.obtained.add(i.partId);
  }

  drainEvents(): ComponentEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** The station has, or has had, this part (fitted from the start, in the hangar, ordered before). */
  owned(partId: string): boolean {
    return this.obtained.has(partId) || this.ops.station.hangar.count(partId) > 0;
  }

  /** Units of a part on their way. */
  inTransit(partId: string): number {
    let n = 0;
    for (const d of this.inFlight.values()) n += d.parts[partId] ?? 0;
    return n;
  }

  private offerFor(label: string, parts: Readonly<Record<string, number>>, kg: number, stowage: SupplyItem["stowage"], closed?: string): ComponentOffer {
    const any = [...this.launchers].sort((a, b) => a.usdPerKg.value - b.usdPerKg.value)[0]!;
    const perKg = this.ops.quoteKg(Math.max(kg, 1e-6), any.id).leoKgPerKg;
    const shipment = planShipment(kg, stowage, perKg, this.carriers, this.launchers, this.armMaxKg);
    const quote = this.ops.quoteKg(kg, (shipment.launcher ?? any).id);
    const credits = !this.ops.wallet.canSpend(quote.credits) ? `Faltan ${es(quote.credits - this.ops.wallet.balance)} créditos` : undefined;
    const blocker = closed ?? shipment.blocker ?? credits;
    return { label, parts, kg, shipment, quote, unlocked: !closed, ...(blocker ? { blocker } : {}) };
  }

  /** One component of the tier ladders. */
  offer(partId: string): ComponentOffer {
    const item = this.items.find((i) => i.partId === partId);
    if (!item) throw new Error(`Unknown component ${partId}`);
    const closed = item.deSerie ? `De serie en ${item.deSerie}: no se importa suelto` : tierBlocker(item, this.items, (id) => this.owned(id));
    return this.offerFor(item.name.replace(/\s*\(.*\)$/, ""), { [partId]: 1 }, item.massKg.value, item.stowage, closed);
  }

  /**
   * What a catalogue vehicle still lacks, in one shipment (a whole vehicle is bought whole: its parts do
   * not climb the tiers). Smallsats travel pressurised, as the cubesats the Bishop lets go.
   */
  offerVehicle(name: string, missing: Readonly<Record<string, number>>, stowage: SupplyItem["stowage"]): ComponentOffer {
    let kg = 0;
    const unknown: string[] = [];
    for (const [id, n] of Object.entries(missing)) {
      const m = this.massOf(id);
      if (m === undefined) unknown.push(id);
      else kg += m * n;
    }
    const closed = !Object.keys(missing).length ? "No le falta nada" : unknown.length ? `Sin masa publicada: ${unknown.join(", ")}` : undefined;
    return this.offerFor(name, missing, kg, stowage, closed);
  }

  /** The order's challenge chain (the same as any import); solved, it is paid and leaves Earth. */
  start(offer: ComponentOffer): StationSession {
    if (offer.blocker) throw new Error(offer.blocker);
    const launcher = offer.shipment.launcher!;
    const carrier = offer.shipment.carrier === "libre" ? "vuelo propio" : offer.shipment.carrier.name;
    const chore = orderChore(offer.label, offer.quote, `${launcher.name} (${carrier})`);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      if (!this.ops.wallet.canSpend(offer.quote.credits)) return `No se pidió: faltan ${es(offer.quote.credits - this.ops.wallet.balance)} créditos`;
      const delivery = this.ops.orderKg(offer.label, offer.kg, launcher.id);
      this.inFlight.set(delivery.id, { label: offer.label, parts: offer.parts });
      for (const id of Object.keys(offer.parts)) this.obtained.add(id);
    });
  }

  /** After `ImportOps.tick`: what landed goes to the hangar. */
  tick(): void {
    const pending = new Set(this.ops.deliveries.pending.map((d) => d.id));
    for (const [id, d] of [...this.inFlight]) {
      if (pending.has(id)) continue;
      this.inFlight.delete(id);
      for (const [partId, n] of Object.entries(d.parts)) this.ops.station.hangar.put(partId, n);
      this.events.push({ type: "llega", label: d.label, parts: d.parts });
    }
  }
}
