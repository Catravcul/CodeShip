import type { Vec3 } from "@core/math/vec3";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { CompositionEntry } from "@modules/celestial/domain/asteroid";
import { extractToCargo } from "@modules/celestial/domain/resources";
import { StationSession } from "@modules/station/application/station-ops";
import type { Craft } from "@modules/station/domain/hangar";
import type { Amounts, MaterialId } from "@modules/station/domain/materials";
import type { Station } from "@modules/station/domain/station";
import { DeliveryLine, type Delivery, type StationInbox } from "../domain/delivery";
import { escapes, flightHours, MassDriver, type MassDriverSpec } from "../domain/mass-driver";
import { importQuote, type ImportQuote } from "../domain/quote";
import { towPlan, type TowPlan, type TugSpec } from "../domain/tug";
import type { Wallet } from "../domain/wallet";
import { installChore, orderChore, towChore } from "./challenges";

/** A small body the station can haul a boulder from or set a mass driver on (no subjugation needed). */
export interface ImportBody {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
  readonly meanRadiusM: number;
  readonly densityKgM3: number;
  readonly escapeSpeedMs: number;
  readonly composition: readonly CompositionEntry[];
  readonly comet: boolean;
}

export interface Launcher {
  readonly id: string;
  readonly name: string;
  readonly usdPerKg: { readonly value: number };
}

export interface ImportDeps {
  /** The region's distance from the Sun now, AU. */
  readonly regionAU: () => number;
  readonly bodies: () => readonly ImportBody[];
  /** Which store a body's material goes to (undefined: it boils away or has no use). */
  readonly toMaterial: (cargo: string) => MaterialId | undefined;
  readonly launchers: readonly Launcher[];
  readonly stage: { readonly ispS: number; readonly tankage: number };
  readonly gameHoursPerTransitDay: number;
  /** kg per unit of each importable material (kits weigh more than 1 kg). */
  readonly kgPerUnit: (materialId: MaterialId) => number;
  readonly tug: TugSpec;
  readonly driver: MassDriverSpec;
  /** Nevaeh's answer on the radio when an order leaves the Sanctuary. */
  readonly onOrder?: (q: ImportQuote, goods: Amounts, launcher: Launcher) => void;
}

export type ImportEvent =
  | { readonly type: "pedido"; readonly delivery: Delivery; readonly credits: number }
  | { readonly type: "llegada"; readonly delivery: Delivery }
  | { readonly type: "remolque"; readonly bodyName: string; readonly hours: number }
  | { readonly type: "lanzador"; readonly bodyName: string }
  | { readonly type: "paquete"; readonly bodyName: string };

/** The tug out on a haul. */
export interface Tow {
  readonly craftId: string;
  readonly bodyId: string;
  readonly bodyName: string;
  readonly plan: TowPlan;
  readonly delivery: Delivery;
}

/**
 * Use case: the three ways the station brings in what it cannot make (docs/design/importacion.md).
 * Orders to the Sanctuary are paid in credits and fly a Hohmann transfer; the tug hauls a boulder off
 * any small body; a mass driver set on one throws small packages at the station. The last two are the
 * early, passive sources: they need no subjugation and give slow, modest yields (a subjugated
 * asteroid's own deliveries are another mechanic, which can use `inbox`). Each one starts as a chain
 * of code challenges, like the rest of the station.
 */
export class ImportOps {
  readonly deliveries = new DeliveryLine();
  readonly drivers: MassDriver[] = [];
  private _tow: Tow | undefined;
  private events: ImportEvent[] = [];

  constructor(
    readonly station: Station,
    readonly wallet: Wallet,
    private readonly d: ImportDeps,
  ) {}

  /** The port other mechanics send goods to the station through (they land on the station clock). */
  get inbox(): StationInbox {
    return this.deliveries;
  }

  get tow(): Tow | undefined {
    return this._tow;
  }

  drainEvents(): ImportEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // --- Sanctuary -------------------------------------------------------------

  launcher(id: string): Launcher {
    const l = this.d.launchers.find((x) => x.id === id);
    if (!l) throw new Error(`Unknown launcher ${id}`);
    return l;
  }

  massKg(goods: Amounts): number {
    return Object.entries(goods).reduce((s, [id, n]) => s + n * this.d.kgPerUnit(id), 0);
  }

  quote(goods: Amounts, launcherId: string): ImportQuote {
    return importQuote(this.massKg(goods), this.launcher(launcherId).usdPerKg.value, this.d.regionAU(), this.d.stage, this.d.gameHoursPerTransitDay);
  }

  /** Why an order cannot be placed now, if so. */
  orderBlocker(goods: Amounts, launcherId: string): string | undefined {
    if (this.massKg(goods) <= 0) return "El pedido está vacío";
    const q = this.quote(goods, launcherId);
    if (!this.wallet.canSpend(q.credits)) return `Faltan ${(q.credits - this.wallet.balance).toLocaleString("es-ES")} créditos`;
    return undefined;
  }

  /** The order's challenge chain; solved, the credits are paid and the goods leave the Sanctuary. */
  startOrder(goods: Amounts, launcherId: string, label: string): StationSession {
    const why = this.orderBlocker(goods, launcherId);
    if (why) throw new Error(why);
    const l = this.launcher(launcherId);
    const q = this.quote(goods, launcherId);
    const chore = orderChore(label, q, l.name);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      if (!this.wallet.canSpend(q.credits)) return;
      this.wallet.spend(q.credits, `Pedido al Santuario: ${label}`);
      const delivery = this.deliveries.send("santuario", label, goods, q.gameHours);
      this.events.push({ type: "pedido", delivery, credits: q.credits });
      this.d.onOrder?.(q, goods, l);
    });
  }

  // --- Own sources -----------------------------------------------------------

  /** Bodies the tug and the mass driver can work on: every catalogued small body of the region. */
  sources(): ImportBody[] {
    return [...this.d.bodies()];
  }

  private body(id: string): ImportBody {
    const b = this.d.bodies().find((x) => x.id === id);
    if (!b) throw new Error(`Unknown body ${id}`);
    return b;
  }

  /** From the body's surface to the station now, m. */
  distanceM(b: ImportBody): number {
    return Math.max(1, this.station.distanceTo(b.position) - b.meanRadiusM);
  }

  /** What `kg` of a body's material give the store (mid composition; volatiles that boil away are lost). */
  goodsFrom(b: ImportBody, kg: number): { goods: Amounts; lostKg: number } {
    const goods: Record<string, number> = {};
    let lostKg = 0;
    for (const c of extractToCargo(b.composition, kg)) {
      const id = this.d.toMaterial(c.material);
      if (id) goods[id] = (goods[id] ?? 0) + c.kg;
      else lostKg += c.kg;
    }
    return { goods, lostKg };
  }

  private craftOf(kind: Craft["kind"]): Craft | undefined {
    return this.station.hangar.crafts.find((c) => c.kind === kind && c.docked);
  }

  /** The tug waiting in the hangar, if one is built and home. */
  get tug(): Craft | undefined {
    return this.craftOf("remolcador");
  }
  get driverCraft(): Craft | undefined {
    return this.craftOf("lanzador");
  }

  towPlan(bodyId: string, diameterM: number): TowPlan {
    const b = this.body(bodyId);
    return towPlan(this.d.tug, this.distanceM(b), diameterM, b.densityKgM3);
  }

  towBlocker(bodyId: string, diameterM: number): string | undefined {
    if (!this.tug) return this._tow ? "El remolcador está fuera" : "Construye el remolcador en Planos";
    if (diameterM > this.d.tug.maxBoulderM) return `Los brazos solo cierran rocas de hasta ${this.d.tug.maxBoulderM} m`;
    const p = this.towPlan(bodyId, diameterM);
    if (this.station.stock.amount("xenon") + 1e-9 < p.xenonKg) return `Falta xenón: ${p.xenonKg.toFixed(2).replace(".", ",")} kg`;
    return undefined;
  }

  startTow(bodyId: string, diameterM: number): StationSession {
    const why = this.towBlocker(bodyId, diameterM);
    if (why) throw new Error(why);
    const b = this.body(bodyId);
    const plan = this.towPlan(bodyId, diameterM);
    const chore = towChore(b.name, diameterM, b.densityKgM3, this.distanceM(b), plan, this.d.tug.dryKg);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      const tug = this.tug;
      if (!tug || this.towBlocker(bodyId, diameterM)) return;
      this.station.stock.take({ xenon: plan.xenonKg });
      tug.docked = false;
      const delivery = this.deliveries.send("remolcador", `Roca de ${b.name}`, this.goodsFrom(b, plan.boulderKg).goods, plan.totalHours);
      this._tow = { craftId: tug.id, bodyId, bodyName: b.name, plan, delivery };
      this.events.push({ type: "remolque", bodyName: b.name, hours: plan.totalHours });
    });
  }

  installBlocker(bodyId: string): string | undefined {
    if (!this.driverCraft) return "Construye un lanzador de masas en Planos";
    if (this.drivers.some((x) => x.bodyId === bodyId)) return "Ya tiene un lanzador";
    if (!escapes(this.d.driver.launchSpeedMs, this.body(bodyId).escapeSpeedMs)) return "Los paquetes no escaparían de su gravedad";
    return undefined;
  }

  startInstall(bodyId: string): StationSession {
    const why = this.installBlocker(bodyId);
    if (why) throw new Error(why);
    const b = this.body(bodyId);
    const chore = installChore(b.name, this.distanceM(b), this.d.driver);
    return new StationSession(chore, new ChoreRun(chore, 2), () => {
      const craft = this.driverCraft;
      if (!craft || this.installBlocker(bodyId)) return;
      this.station.hangar.removeCraft(craft.id);
      this.drivers.push(new MassDriver(this.d.driver, b.id, b.name));
      this.events.push({ type: "lanzador", bodyName: b.name });
    });
  }

  /** Let `hours` of the station clock pass: drivers throw, deliveries land in the store. */
  tick(hours: number): void {
    for (const drv of this.drivers) {
      const n = drv.tick(hours);
      if (!n) continue;
      const b = this.body(drv.bodyId);
      const { goods } = this.goodsFrom(b, drv.spec.packageKg);
      for (let i = 0; i < n; i++) this.deliveries.send("lanzador", `Paquete de ${b.name}`, goods, flightHours(this.distanceM(b), drv.spec.launchSpeedMs));
    }
    for (const del of this.deliveries.tick(hours)) {
      this.station.stock.add(del.goods);
      if (del.source === "remolcador" && this._tow?.delivery === del) {
        const craft = this.station.hangar.crafts.find((c) => c.id === this._tow!.craftId);
        if (craft) craft.docked = true;
        this._tow = undefined;
      }
      if (del.source === "lanzador") this.events.push({ type: "paquete", bodyName: del.label.replace(/^Paquete de /, "") });
      else this.events.push({ type: "llegada", delivery: del });
    }
  }
}
