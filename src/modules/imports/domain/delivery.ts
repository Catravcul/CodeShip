import type { Amounts } from "@modules/station/domain/materials";

/**
 * Where a delivery comes from: an order to the Sanctuary, the tug's boulder or a mass-driver package.
 * Other sources (a subjugated asteroid sending resources, branch niveles-subyugacion) name their own.
 */
export type DeliverySource = "santuario" | "remolcador" | "lanzador" | (string & {});

export interface Delivery {
  readonly id: number;
  readonly source: DeliverySource;
  readonly label: string;
  /** What reaches the store: station material ids (kg, or kit units). */
  readonly goods: Amounts;
  readonly hoursTotal: number;
  hoursLeft: number;
  /** Arrived, but the store had no room for it («Almacén lleno», HC-02): it waits in the inbox. */
  waiting?: boolean;
}

/**
 * Port: how anything sends goods to the station. Whoever has something on its way calls `send` with
 * the hours it takes on the station clock; the goods land in the store when they run out.
 */
export interface StationInbox {
  send(source: DeliverySource, label: string, goods: Amounts, hours: number): Delivery;
}

/**
 * Everything on its way to the station. Unlike machine jobs they travel in parallel: each one
 * counts its own hours on the station clock and lands when they run out.
 */
export class DeliveryLine implements StationInbox {
  private readonly list: Delivery[] = [];
  private nextId = 1;

  get pending(): readonly Delivery[] {
    return this.list;
  }

  send(source: DeliverySource, label: string, goods: Amounts, hours: number): Delivery {
    const d: Delivery = { id: this.nextId++, source, label, goods, hoursTotal: hours, hoursLeft: hours };
    this.list.push(d);
    return d;
  }

  /** Arrived and waiting for room in the store. */
  get waiting(): readonly Delivery[] {
    return this.list.filter((d) => d.waiting);
  }

  /**
   * Let `hours` pass; returns what landed, soonest first. `accept` is the store saying whether it has
   * room for a delivery (and taking it): a refused one, and every one after it, waits in the inbox
   * until a later tick (HC-02).
   */
  tick(hours: number, accept: (d: Delivery) => boolean = () => true): Delivery[] {
    for (const d of this.list) d.hoursLeft = Math.max(0, d.hoursLeft - hours);
    const arrived = this.list.filter((d) => d.hoursLeft <= 1e-9).sort((a, b) => a.id - b.id);
    const landed: Delivery[] = [];
    let open = true;
    for (const d of arrived) {
      open &&= accept(d);
      if (!open) {
        d.waiting = true;
        continue;
      }
      d.waiting = false;
      this.list.splice(this.list.indexOf(d), 1);
      landed.push(d);
    }
    return landed;
  }
}
