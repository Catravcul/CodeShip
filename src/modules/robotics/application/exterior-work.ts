import type { StationSlot } from "@modules/station/domain/outfit";
import { EVA_JOBS, type EvaSite, type VehicleSite } from "@modules/eva/data/station-eva";
import { CAMERA_ORU } from "../data/robotics";

/**
 * Work outside the station, routed as the ISS does it (docs/design/brazo-robotico.md, «Qué se cambia
 * dónde»): parts inside are swapped at Unity's cargo laptop; the station's own outside parts (arrays,
 * radiators, shields) are spacewalks from Quest with Canadarm2 bringing the part; small ORUs such as an
 * external camera are Dextre's, from the Cupola's RWS. A job waits here until it is done where it belongs.
 */
export type ExteriorKind = "eva" | "dextre";

export interface ExteriorJob {
  readonly id: string;
  readonly kind: ExteriorKind;
  readonly title: string;
  /** Where outside (spacewalks). */
  readonly site?: EvaSite;
  /** The station component to fit (from the hangar) when it is done. */
  readonly componentId?: string;
  /** Why it is needed, said on the task. */
  readonly why: string;
  /** A vehicle's part: the swap itself, done when the spacewalk ends (what to say). */
  readonly apply?: () => string;
}

/** How each of the station's own outside components is changed on the ISS. */
export const EXTERIOR_ROUTE: Readonly<Record<StationSlot, { readonly kind: "eva"; readonly site: EvaSite; readonly how: string; readonly source: string }>> = {
  alas: { kind: "eva", site: "alas", how: EVA_JOBS.alas.how, source: EVA_JOBS.alas.source },
  radiadores: { kind: "eva", site: "radiadores", how: EVA_JOBS.radiadores.how, source: EVA_JOBS.radiadores.source },
  escudo: { kind: "eva", site: "escudo", how: EVA_JOBS.escudo.how, source: EVA_JOBS.escudo.source },
};

export type ExteriorEvent = { readonly kind: "averia-camara"; readonly job: ExteriorJob };

export class ExteriorWork {
  private readonly jobs = new Map<string, ExteriorJob>();
  private events: ExteriorEvent[] = [];
  /** Board hours the camera has been in the radiation (starts near its end: it was fitted long ago, game value). */
  cameraHours: number;

  constructor(cameraHoursLeft = 6) {
    this.cameraHours = CAMERA_ORU.lifeH.value - cameraHoursLeft;
  }

  list(): readonly ExteriorJob[] {
    return [...this.jobs.values()];
  }
  job(id: string): ExteriorJob | undefined {
    return this.jobs.get(id);
  }
  /** The spacewalk waiting, if any (one at a time, like an EVA plan). */
  get evaJob(): ExteriorJob | undefined {
    return this.list().find((j) => j.kind === "eva");
  }

  /** Plan the swap of a station component outside: a spacewalk. Why not, if one is already planned. */
  planComponent(slot: StationSlot, componentId: string, name: string): ExteriorJob | string {
    const r = EXTERIOR_ROUTE[slot];
    const planned = this.evaJob;
    if (planned) return `Ya hay un paseo planeado: ${planned.title}`;
    const job: ExteriorJob = { id: `eva:${r.site}`, kind: r.kind, title: `Paseo espacial: montar ${name}`, site: r.site, componentId, why: r.how };
    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Plan the swap of a vehicle's outside part (the lander's engines, tanks, panels…; the Starship's engines and
   * power): a spacewalk too, never at the bay (docs/design/paseo-espacial.md, «Piezas de fuera de las naves»).
   */
  planVehicle(site: VehicleSite, name: string, apply: () => string): ExteriorJob | string {
    const planned = this.evaJob;
    if (planned) return `Ya hay un paseo planeado: ${planned.title}`;
    const job: ExteriorJob = { id: `eva:${site}`, kind: "eva", title: `Paseo espacial: montar ${name}`, site, why: EVA_JOBS[site].how, apply };
    this.jobs.set(job.id, job);
    return job;
  }

  /** Done: off the list (the caller fits the component or resets the camera). */
  complete(id: string): ExteriorJob | undefined {
    const j = this.jobs.get(id);
    this.jobs.delete(id);
    if (j?.kind === "dextre") this.cameraHours = 0;
    return j;
  }

  /** Board hours pass: the camera wears out in the radiation and Dextre's job appears. */
  tick(hours: number): void {
    if (hours <= 0) return;
    this.cameraHours += hours;
    const id = "brazo:dextre-camara";
    if (this.cameraHours >= CAMERA_ORU.lifeH.value && !this.jobs.has(id)) {
      const job: ExteriorJob = { id, kind: "dextre", title: "Dextre: cambiar la cámara de P1", why: "La radiación ha quemado píxeles de la cámara exterior de S1: se ve con puntos blancos" };
      this.jobs.set(id, job);
      this.events.push({ kind: "averia-camara", job });
    }
  }

  drainEvents(): ExteriorEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
