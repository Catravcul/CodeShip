import type { Vec3 } from "@core/math/vec3";
import { refineRun, batchScale, canRefine, type Blueprint, type CraftSpec, type MachineId, type RefineProcess } from "./blueprint";
import type { Hangar } from "./hangar";
import type { Amounts, MaterialId, MaterialStock } from "./materials";

/** Where the station is: a place in the region a ship (or the navigation map) can head for. */
export interface StationSite {
  readonly id: string;
  readonly name: string;
  readonly position: Vec3;
  /** Rough size of the structure, metres. */
  readonly radiusM: number;
  /** Closer than this the ship counts as docked/alongside. */
  readonly dockingRangeM: number;
}

/** Propellant moving into a docked craft: kg per propellant line of the craft, and what it took from the store. */
export interface Transfer {
  readonly craftId: string;
  readonly loads: Readonly<Record<string, number>>;
  readonly taken: Amounts;
}

export type JobOutput =
  | { readonly kind: "materials"; readonly amounts: Amounts }
  | { readonly kind: "part"; readonly partId: string }
  | { readonly kind: "craft"; readonly craft: CraftSpec }
  | ({ readonly kind: "transfer" } & Transfer);

/** A craft that takes propellant at the end of a transfer. False if it cannot now (it undocked). */
export type TransferReceiver = (loads: Readonly<Record<string, number>>) => boolean;

/** Work queued on a machine. Inputs are taken when it is queued; the output arrives when it ends. */
export interface Job {
  readonly id: number;
  readonly machine: MachineId;
  readonly label: string;
  readonly hoursTotal: number;
  hoursLeft: number;
  readonly output: JobOutput;
}

export type StationEvent = { readonly type: "job-done"; readonly job: Job };

/**
 * A space station with a materials store, its machines (refinery, foundry, metal printer, propellant
 * plant and refuelling line) and a hangar. Raw rock from a hold is refined into metals, oxygen,
 * ceramics and propellants; blueprints turn those into parts and probes that wait in the hangar
 * until a ship fits them, and docked craft take propellant from the store.
 */
export class Station {
  private readonly jobs: Job[] = [];
  private nextId = 1;
  private events: StationEvent[] = [];
  private readonly receivers = new Map<string, TransferReceiver>();

  constructor(
    readonly site: StationSite,
    readonly stock: MaterialStock,
    readonly hangar: Hangar,
  ) {}

  /** Raw cargo into the store. Materials the station has no use for stay out and are returned. */
  unload(cargo: readonly { material: string; kg: number }[], toMaterial: (cargoMaterial: string) => MaterialId | undefined): { stored: Amounts; ignored: string[] } {
    const stored: Record<MaterialId, number> = {};
    const ignored: string[] = [];
    for (const c of cargo) {
      const id = toMaterial(c.material);
      if (!id) ignored.push(c.material);
      else stored[id] = (stored[id] ?? 0) + c.kg;
    }
    this.stock.add(stored);
    return { stored, ignored };
  }

  /** Jobs waiting or running, in order. The first per machine is the one being worked. */
  queue(machine?: MachineId): readonly Job[] {
    return machine ? this.jobs.filter((j) => j.machine === machine) : this.jobs;
  }

  /** Whether a job is the one its machine is working on now. */
  running(job: Job): boolean {
    return this.jobs.find((j) => j.machine === job.machine) === job;
  }

  canFabricate(bp: Blueprint): boolean {
    return this.stock.has(bp.inputs);
  }

  /** Take the blueprint's materials and queue it on its machine. */
  fabricate(bp: Blueprint): Job {
    this.stock.take(bp.inputs);
    const output: JobOutput = bp.product.kind === "part" ? { kind: "part", partId: bp.product.partId } : { kind: "craft", craft: bp.product.craft };
    return this.enqueue(bp.machine, bp.name, bp.hours, output);
  }

  /** Take as much of a batch as the stock allows (up to one) and queue it in the refinery. */
  refine(p: RefineProcess): Job {
    if (!canRefine(p, this.stock)) throw new Error(`Not enough raw material for ${p.id}`);
    const run = refineRun(p, batchScale(p, this.stock));
    this.stock.take(run.inputs);
    return this.enqueue(p.machine, p.name, run.hours, { kind: "materials", amounts: run.outputs });
  }

  /** Who takes the propellant of a transfer to a craft. */
  setReceiver(craftId: string, receive: TransferReceiver): void {
    this.receivers.set(craftId, receive);
  }

  /**
   * Take the propellant from the store and queue its transfer on the refuelling line. When the job
   * ends the craft receives it; if it cannot (it left), everything goes back to the store.
   */
  transfer(label: string, t: Transfer, hours: number): Job {
    this.stock.take(t.taken);
    return this.enqueue("repostaje", label, hours, { kind: "transfer", ...t });
  }

  /** Transfers waiting or running for a craft. */
  pendingTransfers(craftId: string): Transfer[] {
    return this.jobs.flatMap((j) => (j.output.kind === "transfer" && j.output.craftId === craftId ? [j.output] : []));
  }

  private enqueue(machine: MachineId, label: string, hours: number, output: JobOutput): Job {
    const job: Job = { id: this.nextId++, machine, label, hoursTotal: hours, hoursLeft: hours, output };
    this.jobs.push(job);
    return job;
  }

  /** Let the machines work for some game hours. Spare time on a machine goes to its next job. */
  tick(hours: number): void {
    const machines = new Set(this.jobs.map((j) => j.machine));
    for (const m of machines) {
      let t = hours;
      while (t > 0) {
        const job = this.jobs.find((j) => j.machine === m);
        if (!job) break;
        const used = Math.min(t, job.hoursLeft);
        job.hoursLeft -= used;
        t -= used;
        if (job.hoursLeft > 1e-9) break;
        job.hoursLeft = 0;
        this.jobs.splice(this.jobs.indexOf(job), 1);
        this.deliver(job);
      }
    }
  }

  private deliver(job: Job): void {
    const o = job.output;
    if (o.kind === "materials") this.stock.add(o.amounts);
    else if (o.kind === "part") this.hangar.put(o.partId);
    else if (o.kind === "craft") this.hangar.addCraft(o.craft);
    else if (!this.receivers.get(o.craftId)?.(o.loads)) this.stock.add(o.taken);
    this.events.push({ type: "job-done", job });
  }

  drainEvents(): StationEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Distance from a point to the station, metres. */
  distanceTo(p: Vec3): number {
    return p.sub(this.site.position).length();
  }
  isAlongside(p: Vec3): boolean {
    return this.distanceTo(p) <= this.site.dockingRangeM;
  }
}
