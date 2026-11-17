import type { Chore } from "@modules/chores/domain/chore";
import type { ChoreContext, ChoreSession, Habitat } from "@modules/habitat/application/habitat";
import type { Recipe } from "@modules/kitchen/data/recipes";
import type { Workout } from "@modules/wellness/data/exercise";
import type { YogaSequence } from "@modules/wellness/data/yoga";
import type { CrewArea } from "../domain/interior";
import type { Larder } from "./bio-ops";
import { sleepChore } from "@modules/chores/application/catalog";
import { SLEEP_STEPS, SLEEP_WRONG } from "@modules/wellness/data/sleep";

/** Where each kind of chore is done at the station. */
const AREA: Readonly<Partial<Record<Chore["kind"], CrewArea>>> = { cocinar: "cocina", yoga: "esterilla", ejercicio: "ejercicio", dormir: "camarotes" };

/** Going to sleep in her crew quarter: always there to do, one challenge per step. */
const SLEEP = sleepChore(SLEEP_STEPS, SLEEP_WRONG);

export const STATION_AREA_NAME: Readonly<Record<CrewArea, string>> = {
  cocina: "Cocina de la estación",
  camarotes: "Tu camarote (Harmony)",
  aseo: "Aseo de la estación",
  ejercicio: "Rincón de ejercicio de la estación (Nodo 1)",
  esterilla: "Esterilla de yoga de la estación (Nodo 1)",
};

/**
 * Port: the pantry the galley cooks from (docs/design/soporte-vital.md, «Despensa»): the vehicle's packaged
 * food in its life support. One dish takes one meal out of it.
 */
export interface Pantry {
  /** kg of packaged food one meal takes. */
  readonly mealKg: number;
  /** Whole meals left. */
  meals(): number;
  /** Take one meal out; false if there is none. */
  draw(): boolean;
}

export interface StationCrewContext {
  readonly recipes: readonly Recipe[];
  readonly yoga: readonly YogaSequence[];
  readonly workouts: readonly Workout[];
  /**
   * The vehicle's pantry, when the galley cooks from it (real ships): its packages are counted from it, a dish
   * needs a meal in it and takes it out. Left out, the galley cooks from the habitat's own larder.
   */
  readonly pantry?: () => Pantry | undefined;
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

  /** The packages of the galley's dishes, counted from the pantry's meals (one package of each per meal). */
  private syncPantry(): Pantry | undefined {
    const p = this.ctx.pantry?.();
    if (!p) return undefined;
    const meals = p.meals();
    const per = new Map<string, number>();
    for (const r of this.ctx.recipes) for (const [item, n] of Object.entries(r.ingredients)) per.set(item, Math.max(per.get(item) ?? 0, n));
    for (const [item, n] of per) this.habitat.stock(item, meals * n - this.habitat.larder(item));
    return p;
  }

  /** What can be done at the station now: dishes the larder allows, yoga, workouts. */
  chores(): Chore[] {
    this.syncPantry();
    return [...this.habitat.chores(this.ctx.recipes, this.ctx.yoga, { workouts: this.ctx.workouts }).filter((c) => AREA[c.kind]), SLEEP];
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
    const s = c && this.habitat.start(c, context);
    if (s && c.kind === "dormir") {
      // Asleep: the night does her good (CrewMember.rest), once the last step is solved.
      const answer = s.answer.bind(s);
      s.answer = (a) => {
        const was = s.run.status;
        const ok = answer(a);
        if (was !== "done" && s.run.status === "done") this.habitat.crew.rest();
        return ok;
      };
      return s;
    }
    const pantry = this.ctx.pantry?.();
    if (!s || !pantry || c.kind !== "cocinar") return s;
    // The dish is served: its meal leaves the pantry.
    const answer = s.answer.bind(s);
    s.answer = (a) => {
      const was = s.run.status;
      const ok = answer(a);
      if (was !== "done" && s.run.status === "done") {
        pantry.draw();
        this.syncPantry();
      }
      return ok;
    };
    return s;
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
