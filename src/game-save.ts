import { Vec3 } from "@core/math/vec3";
import { Quat } from "@core/math/quat";
import { isRecord, numbers } from "@core/snapshot";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import type { Ship } from "@modules/ship/domain/ship";
import type { Docking } from "@modules/mothership/application/docking";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { DockingTarget } from "@modules/mothership/domain/docking";
import type { StationStructure } from "@modules/station/domain/structure";
import type { Expedition } from "@modules/expedition/application/expedition";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import type { Habitat } from "@modules/habitat/application/habitat";
import type { LifeSupport } from "@modules/life-support/domain/life-support";
import type { OpenLoopEcs } from "@modules/life-support/domain/open-loop";
import type { Wallet } from "@modules/imports/domain/wallet";
import type { Mailbox } from "@modules/story/domain/mailbox";
import type { MissionLog } from "@modules/missions/domain/mission";
import type { MaterialStock } from "@modules/station/domain/materials";
import type { RingAquarium } from "@modules/sanctuary/domain/aquarium";
import { AutoSave } from "@modules/saves/application/auto-save";
import type { SaveBook } from "@modules/saves/application/save-book";
import { boardDayOf, SPACE_LEVEL, VEHICLE_NAME, type BodyState, type CrewPlace, type PoseState, type SpaceState, type V3 } from "@modules/saves/domain/space-state";
import { isHandover, type LaunchHandover } from "@modules/saves/domain/launch-handover";
import { CruiseClock, type CruiseSnapshot } from "@modules/navigation/domain/cruise";
import { playSession, savedGames } from "./adapters/storage/saved-games";
import type { LanderCabin } from "./lander-cabin";
import type { BridgeRoom } from "./bridge";
import type { StarshipInterior } from "./starship-interior";
import type { StationInteriorMode } from "./station-interior";
import { settings } from "./ui/settings-store";
import { setStepByStep, stepByStep } from "./ui/duel-view";
import { landingMode, setLandingMode, type LandingMode } from "./ui/landing-readout";

/** What the space game (main.ts) hands to its saving: the objects whose state is kept, and where she is. */
export interface SpaceGame {
  readonly flight: FlightComputer;
  readonly ship: Ship;
  readonly docking: Docking;
  readonly mothership: Mothership;
  readonly structure: StationStructure;
  readonly expedition: Expedition;
  readonly asteroids: readonly Asteroid[];
  /** The Starship's galley and Doménica (her needs). */
  readonly habitat: Habitat;
  readonly stationHabitat: Habitat;
  readonly lifeSupport: { readonly estacion: LifeSupport; readonly nodriza?: LifeSupport; readonly modulo: OpenLoopEcs };
  readonly wallet: Wallet;
  /** Nevaeh's letters. */
  readonly mailbox: Mailbox | undefined;
  readonly missions: MissionLog;
  readonly stationStock: MaterialStock;
  readonly aquariums: { readonly nodriza?: RingAquarium; readonly estacion: RingAquarium };
  /** Where she is: the LM's seat, its cabin, Starship's flight deck or decks, the station. */
  readonly seated: () => boolean;
  readonly cabin: LanderCabin;
  readonly bridge: BridgeRoom;
  readonly starship: StarshipInterior | undefined;
  readonly station: StationInteriorMode;
  readonly crewIn: () => CrewPlace["vehicle"];
  /** The lander is at a station port (she enters the station through it). */
  readonly atStationPort: () => boolean;
  /** Something she must know (a slot full, a game that could not be read back). */
  readonly say: (text: string) => void;
  /** What is happening now, read each frame for the key moments: a challenge open, a trip flying, her asleep. */
  readonly challengeOpen: () => boolean;
  readonly travelling: () => boolean;
  /** The Starship's cruise to Bennu under way (src/bennu-cruise.ts), if any. */
  readonly cruise: () => CruiseSnapshot | undefined;
  /** The mothership's programmed hop: saved, and resumed at the same point (Navigator). */
  readonly nav: { tripSnapshot(): unknown; resumeTrip(s: unknown): boolean };
}

const v3 = (v: Vec3): V3 => [v.x, v.y, v.z];
const vec = (a: readonly number[]): Vec3 => new Vec3(a[0]!, a[1]!, a[2]!);
const quat = (q: readonly number[]): Quat => new Quat(q[0]!, q[1]!, q[2]!, q[3]!);
const pose = (p: Vec3, q: Quat): PoseState => ({ p: v3(p), q: [q.w, q.x, q.y, q.z] });

/**
 * The space game's saved games (docs/design/partidas.md): it reads the kept game back when one was chosen at
 * the start screen, then saves into its slot on its own (every minute, at an arrival, at the end of a challenge,
 * on waking, and when the page is hidden). A game that cannot be read back fully is played on, unsaved, so its
 * slot is not spoilt; a new game with no free slot is played unsaved too, and she is told so.
 */
export class GameSave {
  private readonly book: SaveBook = savedGames();
  private readonly auto = new AutoSave();
  private slotId: string | undefined;
  private days = 0;
  private lastKey = "";
  private lastSeen = { challenge: false, asleep: false, travelling: false };
  /** Why saving is off for this game, once said. */
  private off: string | undefined;
  /** The last save's result, for the experience suite. */
  lastSaved: { reason: string; at: string; ok: boolean; why?: string } | undefined;
  /** A game that comes from level 3's launch (launch-handover.ts): a new game whose cruise to Bennu is still to fly. */
  readonly fromLaunch: LaunchHandover["fromLaunch"] | undefined;
  /** The cruise to Bennu to fly now: from the launch (just started) or a kept game's (where it was), if any. */
  cruiseToFly: CruiseClock | undefined;

  constructor(private readonly g: SpaceGame) {
    const s = playSession();
    this.slotId = s.slotId;
    const handover = s.resume && isHandover(s.resume.state) ? s.resume.state : undefined;
    this.fromLaunch = handover?.fromLaunch;
    if (handover) {
      // From the launch: a new game, her days going on, on the Starship's flight deck (she came in through its port).
      this.days = handover.boardDays;
      this.cruiseToFly = CruiseClock.start(handover.fromLaunch.cruiseDays);
      this.place({ vehicle: "nodriza", spot: "cubierta-vuelo" });
      g.say("Acoplada a la Starship en órbita baja: empieza el crucero a Bennu");
    } else if (s.resume) {
      try {
        this.restore(s.resume.state as SpaceState);
        g.say(`Partida ${s.resume.id} recuperada: día ${s.resume.boardDay}, ${s.resume.summary.vehicle} · ${s.resume.summary.place}`);
      } catch {
        this.off = `No se pudo recuperar del todo la partida ${s.resume.id}: sigues jugando, sin guardar, para no estropearla`;
        g.say(this.off);
      }
    } else if (!this.slotId) {
      this.off = "Las ranuras de partidas están llenas: esta partida no se guarda (borra una en el engranaje del inicio)";
      g.say(this.off);
    }
    this.lastKey = this.placeKey();
    const hide = () => this.saveNow("ocultar");
    // On a phone a page is often just hidden, never unloaded: save then too.
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && hide());
    window.addEventListener("pagehide", hide);
  }

  /** The slot this game saves into (none: it plays unsaved). */
  get slot(): string | undefined {
    return this.off ? undefined : this.slotId;
  }

  /** Days on board since the game began. */
  get boardDays(): number {
    return this.days;
  }

  /** Each frame: the days on board pass, the key moments are noticed, and it saves when due. */
  frame(lifeDays: number): void {
    this.days += lifeDays;
    const g = this.g;
    const now = { challenge: g.challengeOpen(), asleep: this.asleep(), travelling: g.travelling() };
    if (this.lastSeen.challenge && !now.challenge) this.auto.mark("reto");
    if (this.lastSeen.asleep && !now.asleep) this.auto.mark("sueño");
    if (this.lastSeen.travelling && !now.travelling) this.auto.mark("llegada");
    this.lastSeen = now;
    const key = this.placeKey();
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.auto.mark("llegada");
    }
    const why = this.auto.due(performance.now() / 1000);
    if (why) this.saveNow(why);
  }

  /** Save now into this game's slot. */
  saveNow(reason: string): boolean {
    this.auto.saved(performance.now() / 1000);
    if (!this.slot) return false;
    let state: SpaceState;
    try {
      state = this.capture();
    } catch {
      return false;
    }
    const place = `${state.trips?.crucero ? "Crucero a Bennu · " : ""}${this.placeLabel(state.crew)}`;
    const r = this.book.save(this.slot, { level: SPACE_LEVEL, boardDay: boardDayOf(state.boardDays), summary: { vehicle: VEHICLE_NAME[state.crew.vehicle], place }, state });
    this.lastSaved = { reason, at: new Date().toISOString(), ok: r.ok, ...(r.ok ? {} : { why: r.why }) };
    if (!r.ok && this.lastSaved.why) this.g.say(this.lastSaved.why);
    return r.ok;
  }

  private asleep(): boolean {
    return this.g.station.asleep || !!this.g.starship?.mode.asleep;
  }

  /** What changes when she arrives somewhere: the vehicle, the docking, the berthing and the landing. */
  private placeKey(): string {
    const g = this.g;
    return `${g.crewIn()}|${g.docking.dockedTo?.id ?? "-"}|${g.mothership.dockedTo ?? "-"}|${g.flight.landed}`;
  }

  // --- Where she is ---------------------------------------------------------

  private where(): CrewPlace {
    const g = this.g;
    if (g.seated()) return { vehicle: "modulo", spot: "asiento" };
    if (g.cabin.active) return { vehicle: "modulo", spot: "cabina", ...opt(g.cabin.near()) };
    if (g.bridge.active) return { vehicle: "nodriza", spot: "cubierta-vuelo", ...opt(g.bridge.near()) };
    const v = g.crewIn();
    if (v === "nodriza") return { vehicle: "nodriza", spot: "interior", ...opt(g.starship?.mode.nearestFixture()) };
    if (v === "estacion") return { vehicle: "estacion", spot: "interior", ...opt(g.station.nearestFixture()) };
    return { vehicle: "modulo", spot: "cabina" };
  }

  private placeLabel(c: CrewPlace): string {
    const g = this.g;
    if (c.spot === "asiento") return "Puesto de pilotaje";
    if (c.spot === "cabina") return `Habitáculo${c.at && g.cabin.stationLabel(c.at) ? ` · ${g.cabin.stationLabel(c.at)}` : ""}`;
    if (c.spot === "cubierta-vuelo") return "Cubierta de vuelo";
    const mode = c.vehicle === "nodriza" ? g.starship?.mode : g.station;
    const f = c.at ? mode?.interior.fixture(c.at) : undefined;
    return (f && mode?.interior.volume(f.volume)?.label) || (c.vehicle === "nodriza" ? "Cubiertas" : "Estación");
  }

  /** Put her back where she was (the game starts at the LM's controls). */
  private place(c: CrewPlace): void {
    const g = this.g;
    if (c.spot === "asiento") return;
    if (c.spot === "cabina") return g.cabin.enter((c.at && g.cabin.stationLabel(c.at) ? c.at : "asiento") as Parameters<LanderCabin["enter"]>[0]);
    if (c.spot === "cubierta-vuelo") return g.bridge.enter((c.at && g.bridge.stationLabel(c.at) ? c.at : "salida") as Parameters<BridgeRoom["enter"]>[0]);
    if (c.vehicle === "nodriza" && g.starship) {
      g.starship.enter();
      if (c.at) g.starship.mode.placeAt(c.at);
      return;
    }
    if (c.vehicle === "estacion") {
      g.station.enter(g.atStationPort() ? "sonda" : "nodriza");
      if (c.at) g.station.placeAt(c.at);
    }
  }

  // --- Snapshot ---------------------------------------------------------------

  private capture(): SpaceState {
    const g = this.g;
    const s = g.flight.state;
    const crucero = g.cruise();
    const nodriza = g.nav.tripSnapshot();
    const body: BodyState = { ...pose(s.position, s.orientation), v: v3(s.velocity), w: v3(s.angularVelocityBody) };
    return {
      boardDays: this.days,
      crew: { ...this.where(), member: g.habitat.crew.snapshot() },
      lander: { body, simTimeS: g.flight.simTimeS, dockedTo: g.docking.dockedTo?.id ?? null, target: g.expedition.asteroid.data.id, landed: g.flight.landed, ship: g.ship.snapshot() },
      mothership: { pose: pose(g.mothership.position, g.mothership.orientation), dockedTo: g.mothership.dockedTo ?? null, propellantKg: g.mothership.propellantKg },
      lifeSupport: { estacion: g.lifeSupport.estacion.snapshot(), ...(g.lifeSupport.nodriza ? { nodriza: g.lifeSupport.nodriza.snapshot() } : {}), modulo: g.lifeSupport.modulo.snapshot() },
      larders: { nodriza: Object.fromEntries(g.habitat.larderItems()), estacion: Object.fromEntries(g.stationHabitat.larderItems()) },
      wallet: g.wallet.snapshot(),
      missions: g.missions.snapshot(),
      ...(g.mailbox ? { mailbox: g.mailbox.snapshot() } : {}),
      rapport: g.expedition.rapport.snapshot(),
      stationStock: g.stationStock.snapshot(),
      aquariums: { estacion: g.aquariums.estacion.snapshot(), ...(g.aquariums.nodriza ? { nodriza: g.aquariums.nodriza.snapshot() } : {}) },
      settings: { ajustes: settings.serialized(), pasoAPaso: stepByStep(), aterrizaje: landingMode() },
      ...(crucero || nodriza ? { trips: { ...(crucero ? { crucero } : {}), ...(nodriza ? { nodriza } : {}) } } : {}),
    };
  }

  /** Back to a kept game. The parts it cannot do without were checked (cannotResume); the rest keep a new game's values when missing. */
  private restore(s: SpaceState): void {
    const g = this.g;
    this.days = s.boardDays;
    if (s.settings) {
      if (typeof s.settings.ajustes === "string") settings.load(s.settings.ajustes);
      if (typeof s.settings.pasoAPaso === "boolean") setStepByStep(s.settings.pasoAPaso);
      if (["preguntar", "manual", "programa"].includes(s.settings.aterrizaje ?? "")) setLandingMode(s.settings.aterrizaje as LandingMode);
    }
    // The Starship first: a lander docked to it rides its port.
    const m = s.mothership;
    g.mothership.moveTo(vec(m.pose.p), quat(m.pose.q));
    if (typeof m.propellantKg === "number") g.mothership.propellantKg = m.propellantKg;
    g.mothership.dockedTo = m.dockedTo && g.structure.ports.some((p) => p.id === m.dockedTo) ? m.dockedTo : undefined;
    // The LM: its load, its target, its state and its clock, then its docking.
    const l = s.lander;
    if (l.ship !== undefined) g.ship.restore(l.ship);
    const target = g.asteroids.find((a) => a.data.id === l.target);
    if (target) g.expedition.retarget(target);
    g.flight.restore(new RigidBodyState(vec(l.body.p), vec(l.body.v), quat(l.body.q), vec(l.body.w)), l.simTimeS);
    const port: DockingTarget | undefined = l.dockedTo === g.mothership.id ? g.mothership : g.structure.ports.find((p) => p.id === l.dockedTo);
    if (port) g.docking.dockNow(port);
    g.docking.drainEvents();
    g.flight.drainEvents();
    // Trips under way go on where they were (docs/design/partidas.md, «Viajes en marcha»): the game's time
    // does not run while the page is closed.
    if (isRecord(s.trips)) {
      this.cruiseToFly = CruiseClock.restore(s.trips.crucero);
      if (s.trips.nodriza !== undefined) g.nav.resumeTrip(s.trips.nodriza);
    }
    // Life on board.
    const ls = s.lifeSupport;
    if (ls) {
      g.lifeSupport.estacion.restore(ls.estacion);
      g.lifeSupport.nodriza?.restore(ls.nodriza);
      g.lifeSupport.modulo.restore(ls.modulo);
    }
    if (isRecord(s.larders)) {
      if (isRecord(s.larders.nodriza)) g.habitat.setLarder(numbers(s.larders.nodriza));
      if (isRecord(s.larders.estacion)) g.stationHabitat.setLarder(numbers(s.larders.estacion));
    }
    g.habitat.crew.restore(s.crew.member);
    g.wallet.restore(s.wallet);
    g.missions.restore(s.missions);
    g.mailbox?.restore(s.mailbox);
    g.expedition.rapport.restore(s.rapport);
    g.stationStock.restore(s.stationStock);
    if (s.aquariums) {
      g.aquariums.estacion.restore(s.aquariums.estacion);
      g.aquariums.nodriza?.restore(s.aquariums.nodriza);
    }
    // Last, she goes back where she was.
    this.place(s.crew);
  }
}

const opt = (at: string | undefined): { at?: string } => (at ? { at } : {});
