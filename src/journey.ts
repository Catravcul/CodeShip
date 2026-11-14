import { RING_ELEVATOR, RING_STATIONS } from "@modules/habitat/data/ring-module";
import { etaText, legSecondsLeft, planJourney, type CrewJoins, type Leg } from "@modules/tasks/domain/journey";
import { dockingSeconds, herePlace, journeyTransfers, taskGoal, type JourneyFlight, type JourneyHere } from "@modules/tasks/application/journey-world";
import type { Task, TaskPlace } from "@modules/tasks/application/task-list";
import type { Navigator } from "@modules/navigation/application/navigator";
import type { NavTarget } from "@modules/navigation/domain/nav-target";
import { DOCK_TRIP } from "@modules/navigation/application/dock-trip";
import type { PortUser } from "@modules/station/domain/structure";
import type { Interior } from "./interior";
import type { LanderCabin } from "./lander-cabin";
import type { BridgeRoom } from "./bridge";
import type { StationInteriorMode } from "./station-interior";
import "./ui/journey.css";

export interface JourneyDeps {
  readonly interior: Interior;
  readonly cabin: LanderCabin;
  readonly bridge: BridgeRoom;
  readonly station: StationInteriorMode;
  readonly nav: Navigator;
  readonly ringRadiusM: number;
  /** Navigation targets of the station and the travel ship. */
  readonly stationTarget: string;
  readonly mothershipTarget: string;
  /** How the vehicles are joined now. */
  joins(): CrewJoins;
  /** Seated at the lander's controls (the cockpit view). */
  seated(): boolean;
  sitDown(): void;
  /** The lander's RCS acceleration, m/s² (the docking assist's braking profile). */
  landerAccelMs2(): number;
  /** Close a screen on top of a room (a console's page, the station's screen, the bay, the mission log). */
  settle(): void;
  /** At the task's machine: use it (open the console, the screen, sit at the controls, start the chore). */
  finish(place: TaskPlace, t: Task): void;
}

/** What one leg does: start it, and whether it is done or has failed. */
interface Runner {
  /** Ready to start (she is out of the car, in the right room). */
  ready?(): boolean;
  begin(): string | void;
  done(): boolean;
  failed?(): string | undefined;
  /** Real seconds left of the leg, when the leg knows better than its plan (a flight). */
  left?(): number | undefined;
}

/** Spoke and spine landing points: the grab bar of a point of interest. */
const POI_OF = (place: string) => place.split(":")[1]!;

/**
 * The task list's «Ir» in travel mode (docs/design/viaje-a-una-tarea.md): plans the whole real way
 * to a task (task/domain/journey.ts) and drives the rooms' own controllers along it, leg by leg:
 * the ring's walk, the spoke's car, the spine's hops (ladders and launchers), the hatches, the
 * cabin and the bridge on foot, the lander's or the travel ship's flight, the station's hops. While
 * it runs the movement controls hide and one «Parar» stops her where she is; the camera stays free.
 */
export class JourneyDriver {
  private readonly bar: HTMLElement;
  private readonly text: HTMLElement;
  private readonly note: HTMLElement;
  private legs: readonly Leg[] = [];
  private index = 0;
  private elapsed = 0;
  private runner: Runner | null = null;
  private started = false;
  private task: Task | null = null;
  private noteUntil = 0;
  private textAt = 0;

  constructor(
    root: HTMLElement,
    private readonly d: JourneyDeps,
  ) {
    this.bar = document.createElement("div");
    this.bar.className = "journey-bar hidden";
    this.bar.setAttribute("role", "status");
    this.bar.innerHTML = `<span class="jb-text"></span><button class="jb-stop" aria-label="Parar el viaje">Parar</button>`;
    root.appendChild(this.bar);
    this.text = this.bar.querySelector(".jb-text")!;
    this.bar.querySelector(".jb-stop")!.addEventListener("click", () => this.stop("Parada aquí: los mandos son tuyos"));
    this.note = document.createElement("div");
    this.note.className = "journey-note";
    root.appendChild(this.note);
  }

  get active(): boolean {
    return this.legs.length > 0;
  }

  /** The legs of the journey under way (for the HUD and the experience suite). */
  get plan(): readonly Leg[] {
    return this.legs;
  }

  get legIndex(): number {
    return this.index;
  }

  /** A short line at the top of the screen (the teleport notice, why a journey cannot start). */
  say(text: string, seconds = 4): void {
    this.note.textContent = text;
    this.note.classList.add("on");
    this.noteUntil = performance.now() + seconds * 1000;
  }

  /** Plan the way to a task and set off; says why not if she cannot get there. */
  start(t: Task): boolean {
    if (this.active) this.stop();
    this.d.settle();
    const here = this.here();
    if (!here) {
      this.say("Desde aquí no hay camino a pie: termina lo que estás haciendo");
      return false;
    }
    const goal = taskGoal(t.place, this.d.station.interior);
    if (!goal) {
      this.say("Esa tarea no tiene una máquina a la que ir");
      return false;
    }
    const joins = this.d.joins();
    const interior = this.d.interior;
    const plan = planJourney(journeyTransfers({ here, joins, ringRadiusM: this.d.ringRadiusM, station: this.d.station.interior, flights: this.flights(joins) }), { place: herePlace(here), joins }, goal);
    if (plan.kind === "bloqueado") {
      this.say(`No puedes llegar: ${plan.why}`, 7);
      return false;
    }
    if (!plan.legs.length) {
      this.d.finish(t.place, t);
      return true;
    }
    // From the hub or the spine down to a ring chore: the spoke takes half a minute; say so, or the tap looks ignored.
    if (interior.active && interior.zones?.zone !== "anillo" && plan.legs.some((l) => l.kind === "ascensor" && l.to.startsWith("anillo:")))
      interior.say(`Bajas al anillo para «${t.title}»: el ascensor del radio tarda medio minuto`);
    this.task = t;
    this.legs = plan.legs;
    this.index = 0;
    this.begin();
    document.body.classList.add("in-journey");
    this.bar.classList.remove("hidden");
    this.render(true);
    return true;
  }

  /** Stop where she is and give the controls back. */
  stop(why?: string): void {
    if (!this.active) return;
    const leg = this.legs[this.index];
    this.d.interior.stopAuto();
    this.d.cabin.stopWalk();
    this.d.bridge.stopWalk();
    this.d.station.stopHops();
    if (leg?.kind === "vuelo" && this.started) this.d.nav.cancel();
    this.end();
    if (why) this.say(why, 6);
  }

  update(dt: number): void {
    if (performance.now() > this.noteUntil) this.note.classList.remove("on");
    if (!this.active || !this.runner) return;
    if (!this.started) {
      if (this.runner.ready && !this.runner.ready()) return;
      this.started = true;
      const why = this.runner.begin();
      if (why) return this.stop(why);
    }
    this.elapsed += dt;
    const failed = this.runner.failed?.();
    if (failed) return this.stop(failed);
    const leg = this.legs[this.index]!;
    if (this.elapsed > Math.max(40, 4 * leg.seconds)) return this.stop(`No he podido: ${leg.label}`);
    if (this.runner.done()) {
      this.index++;
      if (this.index >= this.legs.length) {
        const t = this.task!;
        this.end();
        this.d.finish(t.place, t);
        return;
      }
      this.begin();
    }
    this.render();
  }

  private begin(): void {
    this.elapsed = 0;
    this.started = false;
    this.runner = this.runnerFor(this.legs[this.index]!);
  }

  private end(): void {
    this.legs = [];
    this.runner = null;
    this.task = null;
    document.body.classList.remove("in-journey");
    this.bar.classList.add("hidden");
  }

  private render(now = false): void {
    const t = performance.now();
    if (!now && t - this.textAt < 250) return;
    this.textAt = t;
    const leg = this.legs[this.index];
    if (!leg) return;
    const own = this.runner?.left?.();
    const left = own !== undefined ? own + legSecondsLeft(this.legs, this.index, Infinity) : legSecondsLeft(this.legs, this.index, this.elapsed);
    this.text.innerHTML = `<b></b><small></small>`;
    this.text.querySelector("b")!.textContent = `Viaje · ${this.index + 1}/${this.legs.length}: ${leg.label}`;
    this.text.querySelector("small")!.textContent = `Llegada en ~${etaText(left)}`;
  }

  /** Where she is now, as the journey sees it; undefined where there is no walking route (a suit, a duel). */
  private here(): JourneyHere | undefined {
    const { interior, cabin, bridge, station } = this.d;
    if (interior.active && interior.zones) {
      const z = interior.zones;
      if (z.zone === "anillo") return { room: "anillo", at: interior.floorAt() };
      if (z.zone === "radio") return { room: "radio", up: z.carGoingUp };
      const p = z.pointNow();
      return p ? { room: "eje", point: p } : undefined;
    }
    if (bridge.active) return { room: "puente", at: bridge.position };
    if (cabin.active) return { room: "modulo", at: cabin.position };
    if (station.active) {
      const p = station.pointNow();
      return p && !station.suited ? { room: "estacion", point: p } : undefined;
    }
    if (this.d.seated()) return { room: "modulo", at: "asiento" };
    return undefined;
  }

  private target(id: string): NavTarget | undefined {
    return this.d.nav.targets.find((x) => x.id === id);
  }

  /** What each flight would take now, in real seconds, or why it cannot go. */
  private flights(j: CrewJoins): { landerToStation?: JourneyFlight; landerToMothership?: JourneyFlight; carrierToStation?: JourneyFlight } {
    const nav = this.d.nav;
    const dockS = dockingSeconds(DOCK_TRIP.handoverM, this.d.landerAccelMs2());
    const lander = (id: string): JourneyFlight | undefined => {
      const t = this.target(id);
      if (!t) return undefined;
      const can = nav.canFlyLander(t);
      // Undocking: the springs push her off at a few cm/s before the autopilot turns her (about 5 s).
      return { seconds: nav.landerTrip(t).travel!.realS + dockS + 5, ...(can.ok ? {} : { blocked: can.reason! }) };
    };
    const st = this.target(this.d.stationTarget);
    let carrier: JourneyFlight | undefined;
    if (st && j.lander === "nodriza" && !j.mothershipAtStation) {
      const trip = nav.trip(st);
      const can = nav.canCarry(st);
      // The berthing at the end plays at the carrier's lapse: a few seconds.
      carrier = { seconds: (trip.travel?.realS ?? 0) + 5, ...(can.ok ? {} : { blocked: can.reason! }) };
    }
    return {
      ...(j.lander !== "estacion" ? { landerToStation: lander(this.d.stationTarget) } : {}),
      ...(j.lander !== "nodriza" ? { landerToMothership: lander(this.d.mothershipTarget) } : {}),
      ...(carrier ? { carrierToStation: carrier } : {}),
    };
  }

  /** How each leg is done, with the rooms' own controllers. */
  private runnerFor(leg: Leg): Runner {
    const { interior, cabin, bridge, station, nav } = this.d;
    const zones = interior.zones;
    const [fromRoom] = leg.from.split(":");
    const [toRoom, toSpot] = leg.to.split(":") as [string, string];
    switch (leg.kind) {
      case "andar":
        if (toRoom === "anillo") {
          const s = toSpot === "ascensor" ? { stand: RING_ELEVATOR.anchor, look: RING_ELEVATOR.centre } : RING_STATIONS.find((x) => x.id === toSpot)!;
          let arrived = false;
          return {
            ready: () => interior.active && zones?.zone === "anillo",
            begin: () => interior.autoWalkTo(s.stand, s.look, () => (arrived = true)),
            done: () => arrived,
            failed: () => (!arrived && !interior.autoWalking ? "Te has parado" : undefined),
          };
        }
        {
          const room = toRoom === "puente" ? bridge : cabin;
          let arrived = false;
          return {
            begin: () => {
              // Seated at the controls: up into the cabin first.
              if (room === cabin && !cabin.active) cabin.enter("asiento");
              if (toSpot === "asiento") return cabin.goTo("asiento", () => this.d.sitDown());
              room.goTo(toSpot as never, () => (arrived = true));
            },
            done: () => (toSpot === "asiento" ? !cabin.active && this.d.seated() : arrived),
            failed: () => (toSpot !== "asiento" && !arrived && !room.walking ? "Te has parado" : undefined),
          };
        }
      case "ascensor": {
        const up = toRoom === "eje";
        return {
          begin: () => (up ? interior.rideUp() : zones?.descend()),
          done: () => zones?.zone === (up ? "eje" : "anillo"),
        };
      }
      case "saltos": {
        if (toRoom === "eje") {
          const poi = POI_OF(leg.to);
          return {
            ready: () => interior.active && zones?.zone === "eje",
            begin: () => void zones?.goToPoi(poi, true),
            done: () => zones?.heldPoi()?.id === poi,
            failed: () => (this.elapsed > 0.6 && !zones?.routing && zones?.heldPoi()?.id !== poi ? "Saltos interrumpidos" : undefined),
          };
        }
        return {
          ready: () => station.active,
          begin: () => (station.goToFixture(toSpot) ? undefined : "No encuentro el asidero de esa máquina"),
          done: () => station.heldFixture() === toSpot,
          failed: () => (this.elapsed > 0.6 && !station.routing && station.heldFixture() !== toSpot ? "Saltos interrumpidos" : undefined),
        };
      }
      case "escotilla":
        return { begin: () => this.hatch(fromRoom!, leg.from, leg.to), done: () => this.elapsed > 0.8 };
      case "vuelo": {
        const carrier = fromRoom !== "modulo";
        const to = carrier || leg.joins.lander === "estacion" ? this.d.stationTarget : this.d.mothershipTarget;
        const arrived = () => (carrier ? this.d.joins().mothershipAtStation : this.d.joins().lander === leg.joins.lander);
        return {
          begin: () => {
            if (!carrier && !this.d.seated()) this.d.sitDown();
            const r = carrier ? nav.carry(to) : nav.flyLander(to);
            return r.ok ? undefined : r.reason;
          },
          done: arrived,
          failed: () => (!arrived() && (nav.status === "manual" || nav.status === "failed") ? "El vuelo automático se ha interrumpido" : undefined),
          left: () => {
            const p = nav.progress();
            if (!p) return undefined;
            // The docking assist flies at ×1: its own gap over closing speed; before it, the leg's time-lapse and then the docking.
            if (nav.status === "docking") return p.etaS;
            return p.etaRealS + (carrier ? 0 : dockingSeconds(DOCK_TRIP.handoverM, this.d.landerAccelMs2()));
          },
        };
      }
    }
  }

  /** Through a hatch: out of one room and into the next, as the hatch's own button does. */
  private hatch(fromRoom: string, from: string, to: string): string | void {
    const { interior, cabin, bridge, station } = this.d;
    if (fromRoom === "eje") {
      interior.exit();
      if (to === "modulo:acople") return cabin.enter("acople");
      if (to.startsWith("puente:")) return bridge.enter("salida");
      return station.enter("nodriza");
    }
    if (fromRoom === "modulo") {
      cabin.exit();
      if (to === "eje:atraque") return interior.enter("escotilla");
      return station.enter("sonda");
    }
    if (fromRoom === "puente") {
      bridge.exit();
      return interior.enter();
    }
    if (fromRoom === "estacion") return station.exitBy((from.endsWith("nodriza") ? "nodriza" : "sonda") as PortUser) ?? undefined;
  }
}
