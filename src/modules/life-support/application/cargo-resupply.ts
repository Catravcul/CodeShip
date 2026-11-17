import { DeliveryLine, type Delivery } from "@modules/imports/domain/delivery";
import { CARGO_TUNING, cargoVehicle, type CargoVehicle, type CargoVehicleId } from "../data/cargo-vehicles";
import type { EclssMachineSpec } from "../domain/eclss";
import type { LifeSupport } from "../domain/life-support";
import { resupply } from "../domain/resupply";

/** What one cargo vehicle brings for the crew: `resupply()` for its days, cut to fit what it carries. */
export interface CargoManifest {
  readonly vehicle: CargoVehicle;
  readonly days: number;
  readonly foodKg: number;
  readonly waterKg: number;
  readonly o2Kg: number;
  readonly n2Kg: number;
  readonly spares: Readonly<Record<string, number>>;
  readonly massKg: number;
}

const FOOD = "comida";
const WATER = "agua";
const O2 = "o2";
const N2 = "n2";
const SPARE = "repuesto:";

export function cargoManifest(vehicleId: CargoVehicleId, crew: number, machines: readonly EclssMachineSpec[], days = CARGO_TUNING.daysPerCargo.value): CargoManifest {
  const vehicle = cargoVehicle(vehicleId);
  const mass = (d: number) => {
    const r = resupply(crew, d, machines);
    const spares = Object.fromEntries(r.spares.map((s) => [s.id, s.count]));
    const sparesKg = Object.values(spares).reduce((a, n) => a + n, 0) * CARGO_TUNING.spareKg.value;
    const m = { foodKg: r.foodKg, waterKg: r.waterLossKg + r.waterForO2Kg, o2Kg: r.o2LeakKg, n2Kg: r.n2LeakKg, spares };
    return { ...m, massKg: m.foodKg + m.waterKg + m.o2Kg + m.n2Kg + sparesKg };
  };
  let d = days;
  // A crew too big for one vehicle gets fewer days in it.
  while (d > 1 && mass(d).massKg > vehicle.pressurizedKg.value) d--;
  return { vehicle, days: d, ...mass(d) };
}

export type CargoEvent = { readonly kind: "lanzado" | "llegada"; readonly manifest: CargoManifest };

/**
 * The cargo line of one vehicle's life support (docs/design/soporte-vital.md, «Despensa»): a Dragon or a Cygnus
 * is ordered, flies its real transit on the board clock through the imports' delivery line, and unloads into the
 * pantry, the water, the gas tanks and the spares. One in flight at a time, like the ISS's ports.
 */
export class CargoResupply {
  private readonly line = new DeliveryLine();
  private readonly manifests = new Map<number, CargoManifest>();
  private events: CargoEvent[] = [];

  constructor(
    private readonly ls: LifeSupport,
    private readonly machines: readonly EclssMachineSpec[],
  ) {}

  /** The cargo on its way, with its hours left. */
  get inFlight(): { readonly manifest: CargoManifest; readonly hoursLeft: number } | undefined {
    const d = this.line.pending[0];
    return d ? { manifest: this.manifests.get(d.id)!, hoursLeft: d.hoursLeft } : undefined;
  }

  /** Why a cargo cannot be ordered now. */
  blocker(): string | undefined {
    const f = this.inFlight;
    return f ? `Ya viene ${f.manifest.vehicle.name}: llega en ${Math.ceil(f.hoursLeft)} h` : undefined;
  }

  manifest(vehicleId: CargoVehicleId): CargoManifest {
    return cargoManifest(vehicleId, this.ls.config.crew, this.machines);
  }

  order(vehicleId: CargoVehicleId): CargoManifest | string {
    const why = this.blocker();
    if (why) return why;
    const m = this.manifest(vehicleId);
    const goods: Record<string, number> = { [FOOD]: m.foodKg, [WATER]: m.waterKg, [O2]: m.o2Kg, [N2]: m.n2Kg };
    for (const [id, n] of Object.entries(m.spares)) goods[`${SPARE}${id}`] = n;
    const d: Delivery = this.line.send(`carguero:${vehicleId}`, m.vehicle.name, goods, m.vehicle.transitH.value);
    this.manifests.set(d.id, m);
    this.events.push({ kind: "lanzado", manifest: m });
    return m;
  }

  /** Board hours pass: an arrived cargo unloads into the life support. */
  tick(hours: number): void {
    for (const d of this.line.tick(hours)) {
      const g = d.goods;
      const spares = Object.fromEntries(Object.entries(g).filter(([k]) => k.startsWith(SPARE)).map(([k, n]) => [k.slice(SPARE.length), n]));
      this.ls.restock({ foodKg: g[FOOD], waterKg: g[WATER], o2Kg: g[O2], n2Kg: g[N2], spares });
      this.events.push({ kind: "llegada", manifest: this.manifests.get(d.id)! });
      this.manifests.delete(d.id);
    }
  }

  drainEvents(): CargoEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
