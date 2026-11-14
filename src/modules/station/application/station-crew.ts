import type { Chore } from "@modules/chores/domain/chore";
import type { ChoreContext, ChoreSession, Habitat } from "@modules/habitat/application/habitat";
import type { Recipe } from "@modules/kitchen/data/recipes";
import type { Workout } from "@modules/wellness/data/exercise";
import type { YogaSequence } from "@modules/wellness/data/yoga";
import type { CrewArea } from "../domain/interior";
import type { Larder } from "./bio-ops";

/** Where each kind of chore is done at the station. */
const AREA: Readonly<Partial<Record<Chore["kind"], CrewArea>>> = { cocinar: "cocina", yoga: "esterilla", ejercicio: "ejercicio" };

export const STATION_AREA_NAME: Readonly<Record<CrewArea, string>> = {
  cocina: "Cocina de la estación",
  camarotes: "Camarotes de la estación",
  aseo: "Aseo de la estación",
  ejercicio: "Rincón de ejercicio de la estación (Nodo 1)",
  esterilla: "Esterilla de yoga de la estación (Nodo 1)",
};

export interface StationCrewContext {
  readonly recipes: readonly Recipe[];
  readonly yoga: readonly YogaSequence[];
  readonly workouts: readonly Workout[];
}

/**
 * Use case: Doménica's life at the station (docs/design/estacion-tripulacion.md). The same kitchen
 * and chores engine as the mothership (`Habitat`), with the station's own larder and her one body
 * (shared `CrewMember`): cooking at the galley, yoga at the mat, a workout in node 1, sleep in a cabin.
 * The mothership keeps its own larder for the trips; when she is berthed, the galley sends trip stores aboard.
 */
export class StationCrew {
  constructor(
    /** A habitat with no plants, animals or machines: only the station's larder and her. */
    readonly habitat: Habitat,
    private readonly ctx: StationCrewContext,
  ) {}

  /** What can be done at the station now: dishes the larder allows, yoga, workouts. */
  chores(): Chore[] {
    return this.habitat.chores(this.ctx.recipes, this.ctx.yoga, { workouts: this.ctx.workouts }).filter((c) => AREA[c.kind]);
  }

  choresAt(area: CrewArea): Chore[] {
    return this.chores().filter((c) => AREA[c.kind] === area);
  }

  areaOf(c: Chore): CrewArea {
    return AREA[c.kind]!;
  }

  start(id: string): ChoreSession | undefined {
    const c = this.chores().find((x) => x.id === id);
    const context: ChoreContext = { recipes: this.ctx.recipes };
    return c && this.habitat.start(c, context);
  }

  /** The chore by id, if it can be done now. */
  chore(id: string): Chore | undefined {
    return this.chores().find((x) => x.id === id);
  }

  /** A night in a cabin. */
  rest(): string {
    this.habitat.crew.rest();
    return "Duermes en un camarote: saco sujeto a la pared, luz apagada y el ventilador en marcha. Despiertas más tranquila";
  }

  /** The station's food, by larder item. */
  larder(): [string, number][] {
    return this.habitat.larderItems();
  }

  /** Send `share` of each item aboard the mothership's larder (trip stores); returns what went. */
  sendTripStores(to: Larder, share: number): [string, number][] {
    const sent: [string, number][] = [];
    for (const [item, n] of this.larder()) {
      const k = Math.floor(n * share);
      if (k <= 0) continue;
      this.habitat.stock(item, -k);
      to.stock(item, k);
      sent.push([item, k]);
    }
    return sent;
  }
}
