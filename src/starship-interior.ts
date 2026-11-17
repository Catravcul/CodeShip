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
import { SLEEP_ACTS } from "@modules/wellness/data/sleep";
import { OWN_BUNK } from "@modules/station/data/compartments";
import { AquariumOps, isAquariumChore } from "@modules/sanctuary/application/aquarium-ops";
import { RingAquarium } from "@modules/sanctuary/domain/aquarium";
import { AquariumModel } from "./adapters/three/interior/aquarium-model";
import { CatalogCorner } from "./adapters/three/interior/catalog-corner";
import type { RackSlotId } from "./adapters/three/interior/rack-slots";
import type { SanctuaryChores } from "./interior";
import { aquariumEventText } from "./ui/aquarium-text";
import { YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { eclssRackModel, mountOnWall, type EclssRackModel } from "./adapters/three/eclss-racks";
import type { LifeSupportGame } from "./life-support-game";
import { StationInteriorMode, type StationAction } from "./station-interior";
import type { DuelView, SessionText } from "./ui/duel-view";
import { crewStepVisual } from "./station-steps";
import "./ui/starship-interior.css";

/** Where each kind of chore is done on Starship's decks (fixture ids of data/starship-interior.ts). */
const FIXTURE_OF: Readonly<Partial<Record<Chore["kind"], string>>> = { cocinar: "cocina", yoga: "esterilla", ejercicio: "t2", dormir: OWN_BUNK };
const AREA_NAME: Readonly<Record<CrewArea, string>> = {
  cocina: "Cocina (cubierta 1)",
  camarotes: "Tu camarote (cubierta 2)",
  aseo: "Aseo (cubierta 2)",
  ejercicio: "Ejercicio (cubierta 3)",
  esterilla: "Esterilla (cubierta 1)",
};
const MAX_ON_CARD = 3;
/** The machine of each workout's device (data/exercise.ts): the T2, the CEVIS and the ARED of deck 3. */
const DEVICE_FIXTURE: Readonly<Record<string, string>> = { cinta: "t2", bicicleta: "cevis", fuerza: "ared" };
/** The fixtures that host the sanctuary's rack slots (data/starship-interior.ts). */
const RACK_FIXTURE: Readonly<Record<RackSlotId, string>> = { "rack-catalogo": "catalogo", "rack-acuatico": "habitat-acuatico" };
/** The aquatic habitat is a rack bay (JAXA AQH), not the ring's 1,6 m tank: its model drawn at this fraction. */
const AQH_MODEL_SCALE = 0.6;

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
  /** The aquatic habitat (species catalogue): its use cases and its 3D tank, in a rack bay of deck 3. */
  readonly aquarium: AquariumOps;
  readonly tank: AquariumModel;
  /** The catalogue terminal with the rodent habitat and the colonies' shelf, on deck 2. */
  readonly catalogCorner: CatalogCorner;
  /** Where the sanctuary's rack hardware goes here (the ring's `RING_RACK_HOST` counterpart). */
  readonly rack: { slot(id: RackSlotId): THREE.Vector3; station(id: RackSlotId): string };
  /** The colonies adopted from the catalogue: their chores (set by sanctuary-life.ts). */
  sanctuary?: SanctuaryChores;
  openCatalog?: () => void;
  /** The ship's own life support (set by main.ts): its racks' cards and its repairs as chores. */
  lifeSupport?: LifeSupportGame;
  /** Colours of adopted animals (sanctuary-life.ts); no animal walks in 0 g here. */
  readonly animalColor = new Map<string, number>();
  private readonly viewer = new THREE.Vector3();

  constructor(
    root: HTMLElement,
    private readonly d: StarshipInteriorDeps,
  ) {
    // The galley cooks from the ship's pantry, its life support's packaged food (docs/design/soporte-vital.md, «Despensa»).
    this.crew = new StationCrew(d.habitat, { recipes: ISS_FOOD, yoga: YOGA_SEQUENCES, workouts: WORKOUTS, pantry: () => this.lifeSupport?.pantry });
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
        actions: (f) => (f.action.kind === "soporte-vital" ? (this.lifeSupport?.actions(f) ?? []) : this.actions(f)),
        act: (f, a) => (f.action.kind === "soporte-vital" ? this.lifeSupport?.act(f, a) : this.act(f, a)),
        readout: (f) => this.lifeSupport?.readout(f),
        rackState: (f) => this.lifeSupport?.rackState(f) ?? { state: "ok" },
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
    // The galley's and the work laptop's ECLSS models (the life-support racks are the mode's own fixtures).
    for (const f of plan.fixtures) {
      const kind = ECLSS_MODEL_OF[f.id];
      if (!kind) continue;
      const m = eclssRackModel(kind, { scale: plan.scale ?? WORLD_SCALE, fixtureId: f.id });
      const n = FACE_NORMAL[f.face];
      this.mode.scene.add(mountOnWall(m, new THREE.Vector3(f.at.x, f.at.y, f.at.z), new THREE.Vector3(-n.x, -n.y, -n.z)));
      this.racks.push(m);
    }
    // The species catalogue's rack slots: the hardware stands on the deck's floor against its wall, facing the aisle.
    const scale = plan.scale ?? WORLD_SCALE;
    const floorAt = (fixtureId: string) => {
      const f = plan.fixtures.find((x) => x.id === fixtureId)!;
      const v = plan.volumes.find((x) => x.id === f.volume)!;
      const aisle = FACE_NORMAL[f.face];
      return { f, point: new THREE.Vector3(f.at.x, v.centre.y - v.half.y, f.at.z), yaw: Math.atan2(-aisle.x, -aisle.z), aisle: new THREE.Vector3(-aisle.x, 0, -aisle.z) };
    };
    this.rack = { slot: (id) => floorAt(RACK_FIXTURE[id]).point, station: (id) => RACK_FIXTURE[id] };
    this.aquarium = new AquariumOps(new RingAquarium({ fish: 0, snails: 0 }), d.habitat.crew);
    const place = (root: THREE.Object3D, id: RackSlotId, k: number, standoff: number) => {
      const at = floorAt(RACK_FIXTURE[id]);
      root.position.copy(at.point).addScaledVector(at.aisle, standoff * scale);
      root.rotation.y = at.yaw;
      root.scale.setScalar(k * scale);
      this.mode.scene.add(root);
    };
    this.tank = new AquariumModel(new THREE.Vector3());
    place(this.tank.root, "rack-acuatico", AQH_MODEL_SCALE, 0.3);
    this.catalogCorner = new CatalogCorner(new THREE.Vector3());
    place(this.catalogCorner.root, "rack-catalogo", 1, 0.25);
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
  /** A notice; sanctuary-life.ts passes the ring's level («alerta» / «jugador») instead of seconds. */
  say(text: string, seconds: number | string = 4): void {
    this.mode.say(text, typeof seconds === "number" ? seconds : seconds === "alerta" ? 6 : 4);
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
    if (!this.session) {
      h.tick(days);
      this.aquarium.tick(days);
    }
    h.drainEvents();
    for (const e of this.aquarium.drainEvents()) if (this.active) this.say(aquariumEventText(e), e.type === "aviso" ? 6 : 4);
    for (const l of h.mailbox?.drainNew() ?? []) if (this.active) this.say(l.channel === "llamada" ? `Llamada de ${l.from}` : `Carta de ${l.from}: ${l.subject}`, 5);
    if (!this.active) return;
    this.mode.update(dt);
    for (const r of this.racks) r.tick(dt);
    this.catalogCorner.update(dt);
    this.viewer.copy(this.mode.camera.position);
    this.tank.update(dt, this.aquarium.tank, this.viewer);
  }

  // --- Tasks ------------------------------------------------------------------

  /** The board's chores aboard, with the fixture where each is done. */
  choreFacts(): { id: string; title: string; detail: string; category: "comida" | "salud" | "animales" | "nave"; station: string }[] {
    const crew = this.crew.chores().map((c) => {
      const area = this.crew.areaOf(c);
      return { id: c.id, title: c.title, detail: `${AREA_NAME[area]} · ${c.exercises.length} retos`, category: c.kind === "cocinar" ? ("comida" as const) : ("salud" as const), station: this.fixtureOf(c) };
    });
    const animals = this.animalChores().map((c) => ({ id: c.id, title: c.title, detail: `${this.sanctuary?.owns(c) ? "Catálogo (cubierta 2)" : "Hábitat acuático (cubierta 3)"} · ${c.exercises.length} retos`, category: "animales" as const, station: this.animalFixture(c) }));
    const eclss = (this.lifeSupport?.taskFacts() ?? []).map((t) => ({ id: t.id, title: t.title, detail: `Starship · ${t.detail}`, category: "nave" as const, station: t.area }));
    return [...crew, ...animals, ...eclss];
  }

  /** The aquatic habitat's chores and the adopted colonies'. */
  private animalChores(): Chore[] {
    return [...this.aquarium.chores(), ...(this.sanctuary?.chores() ?? [])];
  }
  private animalFixture(c: Chore): string {
    return this.sanctuary?.owns(c) ? RACK_FIXTURE["rack-catalogo"] : RACK_FIXTURE["rack-acuatico"];
  }
  private findChore(id: string): Chore | undefined {
    return this.crew.chore(id) ?? this.animalChores().find((c) => c.id === id);
  }

  /** «Ir» to a chore: hop to its machine and start it there. */
  doChore(id: string): boolean {
    const repair = this.lifeSupport?.taskFacts().find((t) => t.id === id);
    if (repair) {
      if (!this.mode.goToFixture(repair.area, () => this.lifeSupport!.startChore(id))) this.lifeSupport!.startChore(id);
      return true;
    }
    const c = this.findChore(id);
    if (!c) return false;
    const at = this.fixtureOf(c);
    if (!this.mode.goToFixture(at, () => this.startChore(id))) this.startChore(id);
    return true;
  }

  // --- Machines' cards --------------------------------------------------------

  private actions(f: Fixture): StationAction[] {
    const a = f.action;
    if (a.kind === "consola") {
      if (a.id === "cubierta-vuelo") return [{ id: "subir", label: "Subir a la cubierta de vuelo", enabled: true }];
      if (a.id === "trabajo") return [{ id: "tareas", label: "Tareas", enabled: true }, { id: "misiones", label: "Registro de misiones", enabled: true }];
      const animal = (pick: (c: Chore) => boolean) =>
        this.animalChores()
          .filter(pick)
          .slice(0, MAX_ON_CARD)
          .map((c) => ({ id: `chore:${c.id}`, label: c.title, enabled: true }));
      if (a.id === "catalogo") return [{ id: "catalogo", label: "Abrir el catálogo de especies", enabled: !!this.openCatalog }, ...animal((c) => !!this.sanctuary?.owns(c))];
      if (a.id === "acuatico") {
        const care = animal((c) => isAquariumChore(c));
        return care.length ? care : [{ id: "nada", label: "Cuidar el hábitat", enabled: false, why: "Está vacío: adopta medakas o caracoles en el catálogo de especies (cubierta 2)" }];
      }
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
        return dishes.length ? dishes : [{ id: "nada", label: "Preparar comida", enabled: false, why: "La despensa está vacía: cárgala en la estación (cocina de Unity, «Víveres para la nodriza»), adonde llegan los cargueros" }];
      }
      case "esterilla":
        return [{ id: "ajustes", label: "Sentarse en loto: ajustes", enabled: true }, ...chores("esterilla")];
      case "ejercicio":
        // Each machine its own workouts (the T2 runs, the CEVIS pedals, the ARED lifts).
        return this.crew
          .choresAt("ejercicio")
          .filter((c) => this.fixtureOf(c) === f.id)
          .slice(0, MAX_ON_CARD)
          .map((c) => ({ id: `chore:${c.id}`, label: c.title, enabled: true }));
      case "camarotes":
        return f.id === OWN_BUNK ? chores("camarotes") : [{ id: "nada", label: "Dormir aquí", enabled: false, why: "Camarote libre: el tuyo es el 1" }];
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
      case "catalogo":
        return this.openCatalog?.();
      case "ajustes":
        this.mode.sitLotus(true);
        return this.openSettings?.();
      case "asearse":
        return this.say("Aseo con toallitas, champú sin aclarado y el WHC: en 0 g el aire arrastra lo que en la Tierra cae", 5);
    }
  }

  /** A chore in the shared challenge sheet. */
  startChore(id: string): void {
    if (this.lifeSupport?.taskFacts().some((t) => t.id === id)) return void this.lifeSupport.startChore(id);
    const chore = this.findChore(id);
    const session = chore && (this.crew.chore(id) ? this.crew.start(id) : isAquariumChore(chore) ? this.aquarium.start(chore) : this.sanctuary?.owns(chore) ? this.sanctuary.start(chore) : undefined);
    if (!chore || !session || this.d.duel.visible) return;
    const run = session.run;
    this.session = session;
    // Each right step acted out where it is done (reglas.md §4.2): the galley, the mat, the machine, the rack;
    // going to sleep, in her crew quarter (the bag, the zip, the light).
    const visual = chore.kind === "dormir" ? this.mode.stepVisual(OWN_BUNK, (i) => SLEEP_ACTS[i] ?? []) : crewStepVisual(this.mode, chore, this.fixtureOf(chore));
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.d.duel.onRightPick = undefined;
      visual?.clear();
      this.session = null;
      if (run.status === "done" && chore.kind === "dormir") {
        this.say("Duermes en tu camarote, con la puerta plegable cerrada: el ventilador sopla y la luz está apagada", 5);
        this.mode.sleep(OWN_BUNK, undefined, () => this.say("Despiertas a las 06:00 GMT, más tranquila: la puerta se abre", 5));
      }
      else if (run.status === "done") this.say(chore.kind === "cocinar" ? `${chore.title.replace(/^Cocinar /, "")}: listo, como en la ISS` : "Hecho", 5);
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
      (ans) => {
        const index = run.step;
        const ok = session.answer(ans);
        if (ok) visual?.stepDone(index);
        return { ok };
      },
    );
    // «Paso a paso»: each right pick is acted out at once.
    if (visual)
      this.d.duel.onRightPick = (pick, slot) => {
        if (run.current?.id === pick) visual.partDone?.(run.step, slot);
      };
  }

  /** Where a chore is done aboard: its crew area's fixture (a workout at its own machine) or its rack. */
  private fixtureOf(c: Chore): string {
    if (!this.crew.chore(c.id)) return this.animalFixture(c);
    if (c.kind === "ejercicio") {
      const device = WORKOUTS.find((w) => w.id === c.targetId)?.device;
      return (device && DEVICE_FIXTURE[device]) ?? "t2";
    }
    return FIXTURE_OF[c.kind] ?? "cocina";
  }

  /** Which deck she is on (for checks). */
  where(): string | undefined {
    const at = this.mode.where?.();
    return at && STARSHIP_DECKS.some((d) => d.id === at) ? at : at;
  }
}
