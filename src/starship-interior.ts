import * as THREE from "three";
import { WORLD_SCALE } from "@core/scale";
import { INTERACTABLE_SPACING, SPREAD_ON } from "@core/spacing";
import type { Chore } from "@modules/chores/domain/chore";
import type { ChoreSession, Habitat } from "@modules/habitat/application/habitat";
import { ISS_FOOD } from "@modules/kitchen/data/iss-food";
import { ECLSS_MODEL_OF, starshipInteriorPlan, STARSHIP_DECKS } from "@modules/mothership/data/starship-interior";
import { StationCrew } from "@modules/station/application/station-crew";
import { FACE_NORMAL, StationInterior, type CrewArea, type Fixture } from "@modules/station/domain/interior";
import { presentInteriorPlan } from "@modules/station/domain/presentation";
import type { PortUser } from "@modules/station/domain/structure";
import { WORKOUTS } from "@modules/wellness/data/exercise";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { eclssRackModel, mountOnWall, type EclssRackModel } from "./adapters/three/eclss-racks";
import { StationInteriorMode, type StationAction } from "./station-interior";
import type { DuelView, SessionText } from "./ui/duel-view";
import "./ui/starship-interior.css";

/** Where each kind of chore is done on Starship's decks (fixture ids of data/starship-interior.ts). */
const FIXTURE_OF: Readonly<Partial<Record<Chore["kind"], string>>> = { cocinar: "cocina", yoga: "esterilla", ejercicio: "t2" };
const AREA_NAME: Readonly<Record<CrewArea, string>> = {
  cocina: "Cocina (cubierta 1)",
  camarotes: "Camarotes (cubierta 2)",
  aseo: "Aseo (cubierta 2)",
  ejercicio: "Ejercicio (cubierta 3)",
  esterilla: "Esterilla (cubierta 1)",
};
const MAX_ON_CARD = 3;

const choreText = (c: Chore): SessionText => ({
  title: c.title,
  progress: c.kind === "yoga" ? "Posturas" : "Pasos",
  lives: "Intentos",
  order: "Ordena los pasos",
  submit: "Hacerlo",
  ok: c.kind === "yoga" ? "Entras en la postura" : "Paso hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

export interface StarshipInteriorDeps {
  /** The mothership's habitat: its larder (ISS-type food) and Doménica. */
  readonly habitat: Habitat;
  readonly duel: DuelView;
  openTasks(): void;
  /** Up the hatch to the flight deck (the bridge's consoles). */
  openFlightDeck(): void;
  /** Through a docking hatch: to the lander («sonda») or to the station («nodriza» side). */
  leave(to: PortUser): void;
  /** Why a docking hatch is closed now, or undefined if it opens. */
  cannotLeave(to: PortUser): string | undefined;
}

/**
 * Starship's crewed decks (docs/design/nodriza-starship.md): the station's 0 g engine (rails, hops,
 * hatches, machines' cards) on a plan of our own inside the real 614 m³, drawn as the presentation
 * layer says (src/core/presentation.ts). Life on board is the station's crew engine with the ship's
 * larder: rehydrate and heat, the T2/ARED/CEVIS, the mat, a crew quarter, the WHC. The ECLSS racks of
 * branch eclss-real stand on the walls.
 *
 * It answers the same calls main.ts and the journey make of the ring ship's `Interior`, so the wiring
 * picks one or the other with the real-only switch (src/core/realism.ts).
 */
export class StarshipInterior {
  readonly mode: StationInteriorMode;
  readonly crew: StationCrew;
  /** The ring's zones: none on a ship without rings. */
  readonly zones = undefined;
  readonly autoWalking = false;
  /** The chore open in the sheet (for the experience suite's answer key). */
  session: ChoreSession | null = null;
  openSettings?: () => void;
  openNavConsole?: () => void;
  openMissions?: () => void;
  openAllTasks?: () => void;
  private readonly racks: EclssRackModel[] = [];

  constructor(
    root: HTMLElement,
    private readonly d: StarshipInteriorDeps,
  ) {
    this.crew = new StationCrew(d.habitat, { recipes: ISS_FOOD, yoga: YOGA_SEQUENCES, workouts: WORKOUTS });
    const plan = presentInteriorPlan(starshipInteriorPlan(), { scale: WORLD_SCALE, spreadM: SPREAD_ON ? INTERACTABLE_SPACING.minM : 0 });
    this.mode = new StationInteriorMode(
      root,
      new StationInterior(plan),
      {
        busy: () => new Set(),
        store: () => ({ parts: [], crafts: [] }),
        partName: (id) => id,
        openPanel: () => undefined,
        openBay: () => undefined,
        leave: (to) => {
          const why = d.cannotLeave(to);
          if (why) return why;
          this.mode.suspend();
          d.leave(to);
        },
        cannotLeave: (to) => d.cannotLeave(to),
        openTasks: () => d.openTasks(),
        actions: (f) => this.actions(f),
        act: (f, a) => this.act(f, a),
        landerInHangar: () => false,
      },
      {
        prefix: "sts",
        place: "Starship",
        entered: (from) =>
          from === "sonda"
            ? "Entras desde el módulo de aterrizaje a la cubierta 3 de la Starship. 0 g: la proa es «arriba» en las tres cubiertas"
            : "Entras por el túnel de proa a la cubierta 1 de la Starship. 0 g: la proa es «arriba»",
      },
    );
    // The life-support racks (eclss-real), on their walls, facing the aisle.
    for (const f of plan.fixtures) {
      const kind = ECLSS_MODEL_OF[f.id];
      if (!kind) continue;
      const m = eclssRackModel(kind, { scale: plan.scale ?? WORLD_SCALE, fixtureId: f.id });
      const n = FACE_NORMAL[f.face];
      this.mode.scene.add(mountOnWall(m, new THREE.Vector3(f.at.x, f.at.y, f.at.z), new THREE.Vector3(-n.x, -n.y, -n.z)));
      this.racks.push(m);
    }
  }

  get active(): boolean {
    return this.mode.active;
  }
  get scene(): THREE.Scene {
    return this.mode.scene;
  }
  get camera(): THREE.Camera {
    return this.mode.camera;
  }

  /** From the lander's hatch («escotilla»), or back down from the flight deck (no argument). */
  enter(at?: "escotilla"): void {
    if (at === "escotilla") return this.mode.enter("sonda");
    this.mode.enter("nodriza");
    this.mode.placeAt("subir-cubierta-vuelo");
  }
  /** Through the nose tunnel, from the station. */
  enterFromStation(): void {
    this.mode.enter("nodriza");
  }
  exit(): void {
    this.mode.suspend();
  }
  resize(): void {
    this.mode.resize();
  }
  /** Up from the mat after the settings. */
  standUp(): void {
    this.mode.sitLotus(false);
  }
  stopAuto(): void {}
  say(text: string, seconds = 4): void {
    this.mode.say(text, seconds);
  }
  /** For the journey's ring legs (none here). */
  floorAt(): { x: number; z: number } {
    return { x: 0, z: 0 };
  }
  rideUp(): void {}
  autoWalkTo(_stand: unknown, _look: unknown, then: () => void = () => undefined): void {
    then();
  }

  update(dt: number, days: number): void {
    const h = this.d.habitat;
    // Always weightless aboard: no rings (docs/pendientes.md).
    h.crewGravityG = 0;
    if (!this.session) h.tick(days);
    h.drainEvents();
    for (const l of h.mailbox?.drainNew() ?? []) if (this.active) this.say(l.channel === "llamada" ? `Llamada de ${l.from}` : `Carta de ${l.from}: ${l.subject}`, 5);
    if (!this.active) return;
    this.mode.update(dt);
    for (const r of this.racks) r.tick(dt);
  }

  // --- Tasks ------------------------------------------------------------------

  /** The board's chores aboard, with the fixture where each is done. */
  choreFacts(): { id: string; title: string; detail: string; category: "comida" | "salud"; station: string }[] {
    return this.crew.chores().map((c) => {
      const area = this.crew.areaOf(c);
      return { id: c.id, title: c.title, detail: `${AREA_NAME[area]} · ${c.exercises.length} retos`, category: c.kind === "cocinar" ? "comida" : "salud", station: FIXTURE_OF[c.kind] ?? "cocina" };
    });
  }

  /** «Ir» to a chore: hop to its machine and start it there. */
  doChore(id: string): boolean {
    const c = this.crew.chore(id);
    if (!c) return false;
    const at = FIXTURE_OF[c.kind] ?? "cocina";
    if (!this.mode.goToFixture(at, () => this.startChore(id))) this.startChore(id);
    return true;
  }

  // --- Machines' cards --------------------------------------------------------

  private actions(f: Fixture): StationAction[] {
    const a = f.action;
    if (a.kind === "consola") {
      if (a.id === "cubierta-vuelo") return [{ id: "subir", label: "Subir a la cubierta de vuelo", enabled: true }];
      if (a.id === "trabajo") return [{ id: "tareas", label: "Tareas", enabled: true }, { id: "misiones", label: "Registro de misiones", enabled: true }];
      return [];
    }
    if (a.kind !== "tripulacion") return [];
    const chores = (area: CrewArea) =>
      this.crew
        .choresAt(area)
        .slice(0, MAX_ON_CARD)
        .map((c) => ({ id: `chore:${c.id}`, label: c.title, enabled: true }));
    switch (a.area) {
      case "cocina": {
        const dishes = chores("cocina");
        return dishes.length ? dishes : [{ id: "nada", label: "Preparar comida", enabled: false, why: "No quedan envases: llegan con el reabastecimiento en la estación" }];
      }
      case "esterilla":
        return [{ id: "ajustes", label: "Sentarse en loto: ajustes", enabled: true }, ...chores("esterilla")];
      case "ejercicio":
        return chores("ejercicio");
      case "camarotes":
        return [{ id: "dormir", label: "Dormir en un camarote", enabled: true }];
      case "aseo":
        return [{ id: "asearse", label: "Asearse", enabled: true }];
    }
  }

  private act(_f: Fixture, id: string): void {
    if (id.startsWith("chore:")) return this.startChore(id.slice(6));
    switch (id) {
      case "subir":
        return this.d.openFlightDeck();
      case "tareas":
        return this.d.openTasks();
      case "misiones":
        return this.openMissions?.();
      case "ajustes":
        this.mode.sitLotus(true);
        return this.openSettings?.();
      case "dormir":
        return this.say(this.crew.rest(), 6);
      case "asearse":
        return this.say("Aseo con toallitas, champú sin aclarado y el WHC: en 0 g el aire arrastra lo que en la Tierra cae", 5);
    }
  }

  /** A chore in the shared challenge sheet. */
  startChore(id: string): void {
    const chore = this.crew.chore(id);
    const session = chore && this.crew.start(id);
    if (!chore || !session || this.d.duel.visible) return;
    const run = session.run;
    this.session = session;
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.session = null;
      if (run.status === "done") this.say(chore.kind === "cocinar" ? `${chore.title.replace(/^Cocinar /, "")}: listo, como en la ISS` : "Hecho", 5);
    };
    this.d.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      choreText(chore),
      (ans) => ({ ok: session.answer(ans) }),
    );
  }

  /** Which deck she is on (for checks). */
  where(): string | undefined {
    const at = this.mode.where?.();
    return at && STARSHIP_DECKS.some((d) => d.id === at) ? at : at;
  }
}
