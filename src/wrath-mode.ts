import type * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import type { Ship } from "@modules/ship/domain/ship";
import { debrisDamageFactor } from "@modules/ship/domain/mmod";
import { equipmentOf, wallArealDensityKgM2 } from "@modules/ship/domain/equipment";
import { SHIELD_WHIPPLE_NODE } from "@modules/ship/data/equipment";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { Docking } from "@modules/mothership/application/docking";
import type { StationStructure } from "@modules/station/domain/structure";
import type { Station } from "@modules/station/domain/station";
import { POLANA_DRIVE } from "@modules/station/data/drive";
import type { Expedition } from "@modules/expedition/application/expedition";
import { AsteroidWrath, type RamView, type WrathEvent, type WrathTarget } from "@modules/asteroid-wrath/application/wrath";
import { StationEscape } from "@modules/asteroid-wrath/application/station-escape";
import { HULL_ENERGY_J, Hull, wallDebrisFactor, whippleDebrisFactor, type Protection } from "@modules/asteroid-wrath/domain/protection";
import { DOSE_MARKS } from "@modules/asteroid-wrath/domain/radiation";
import { WrathView } from "./adapters/three/wrath-view";
import { impactThud, ramAlarm, unlockAudio } from "./adapters/audio/alarm";
import { WrathPanel, timeText, type WrathPanelModel } from "./ui/wrath-panel";

/** Station hull behind ISS-node Whipple shields: 0,48 cm aluminium rear wall plus the 0,16 cm bumper, g/cm² (estimate). */
const STATION_WALL_GCM2 = (0.48 + 0.16) * 2.7;
const STATION_REAR_WALL_CM = 0.48;

const NAMES: Record<string, string> = { sonda: "sonda", aterrizador: "módulo de aterrizaje", traje: "Doménica (traje)", nodriza: "nodriza", estacion: "estación" };
const SHORT: Record<string, string> = { sonda: "sonda", aterrizador: "módulo", traje: "traje", nodriza: "nodriza", estacion: "estación" };
const KIND_WORD: Record<string, [string, string]> = { roca: ["roca", "rocas"], carga: ["carga", "cargas"], nuclear: ["carga nuclear", "cargas nucleares"] };
const pct = (x: number) => `${Math.round(x * 100)} %`;
const dec = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const kJ = (j: number) => (j >= 1e6 ? `${dec(j / 1e6)} MJ` : `${Math.round(j / 1000)} kJ`);
const metres = (m: number) => (m >= 1000 ? `${dec(m / 1000)} km` : `${Math.round(m)} m`);
const mSv = (x: number) => `${x < 10 ? x.toFixed(1).replace(".", ",") : x.toFixed(0)} mSv`;

export interface WrathDeps {
  root: HTMLElement;
  scene: THREE.Scene;
  asteroids: readonly Asteroid[];
  flight: FlightComputer;
  ship: Ship;
  expedition: Expedition;
  mothership: Mothership;
  docking: Docking;
  structure: StationStructure;
  station: Station;
  /** Moves the station's 3D model. */
  placeStation: (p: Vec3) => void;
}

/**
 * Wiring of the asteroids' wrath (docs/design/poderes-ira.md): the lander, the mothership and the
 * station as targets, the station's escape under its own engines, the 3D view and the anger card.
 * The probe (another branch) joins with `wrath.addTarget`.
 */
export class WrathMode {
  readonly wrath: AsteroidWrath;
  readonly escape: StationEscape;
  readonly mothershipHull = new Hull();
  readonly stationHull = new Hull();
  /** Doménica's dose from the asteroids' attacks, mSv. */
  crewDoseMSv = 0;
  private readonly view: WrathView;
  private readonly panel: WrathPanel;
  private alert = "";
  private alertUntil = 0;
  private clock = 0;

  constructor(private readonly d: WrathDeps) {
    this.wrath = new AsteroidWrath(d.asteroids);
    this.escape = new StationEscape(POLANA_DRIVE, d.structure.position);
    this.view = new WrathView(d.scene);
    this.panel = new WrathPanel(d.root);
    d.expedition.wrath = this.wrath;
    unlockAudio();
    for (const t of [this.landerTarget(), this.mothershipTarget(), this.stationTarget()]) this.wrath.addTarget(t);
  }

  /** Where Doménica is: with the lander unless it is docked (then aboard what it is docked to). */
  private crewIn(): "aterrizador" | "nodriza" | "estacion" {
    const on = this.d.docking.dockedTo;
    if (!on) return "aterrizador";
    return on === this.d.mothership ? "nodriza" : "estacion";
  }

  private landerTarget(): WrathTarget {
    const { flight, ship, docking } = this.d;
    return {
      id: "aterrizador",
      kind: "aterrizador",
      name: NAMES.aterrizador!,
      radiusM: 3,
      position: () => flight.state.position,
      velocity: () => flight.state.velocity,
      // Docked, it is part of the ship or station it hangs from.
      active: () => !docking.docked,
      landed: () => flight.landed,
      protection: (): Protection => {
        const wall = equipmentOf(ship.design.equipment, "cabina")?.wall;
        return {
          hullEnergyJ: HULL_ENERGY_J.aterrizador,
          debrisFactor: debrisDamageFactor(ship.design.equipment),
          radiation: { material: "aluminio", arealDensityGcm2: wall ? wallArealDensityKgM2(wall) / 10 : 0 },
        };
      },
      // The protection is already applied: "choque" keeps the ship from applying it twice.
      damage: (f) => ship.damage(f, "choque"),
      dose: (x) => this.crewIn() === "aterrizador" && (this.crewDoseMSv += x),
      pull: (dv) => {
        if (flight.landed) flight.releaseAnchor();
        flight.applyImpulse(dv);
      },
      thrustAccelMs2: () => ship.preview({ mainThrottle: 1, translation: Vec3.ZERO, rotation: Vec3.ZERO }).forceBody.length() / ship.massKg,
      massKg: () => ship.massKg,
    };
  }

  private mothershipTarget(): WrathTarget {
    const m = this.d.mothership;
    return {
      id: "nodriza",
      kind: "nodriza",
      name: NAMES.nodriza!,
      radiusM: 60,
      position: () => m.position,
      velocity: () => Vec3.ZERO,
      active: () => true,
      protection: (): Protection => {
        const s = m.equipment("blindaje")?.shield;
        return { hullEnergyJ: HULL_ENERGY_J.nodriza, debrisFactor: wallDebrisFactor(Math.max(s?.arealDensityGcm2 ?? 0, 1)), radiation: s ?? { material: "aluminio", arealDensityGcm2: 1 } };
      },
      damage: (f) => this.mothershipHull.damage(f),
      dose: (x) => this.crewIn() === "nodriza" && (this.crewDoseMSv += x),
      thrustAccelMs2: () => m.accelerationMs2,
    };
  }

  private stationTarget(): WrathTarget {
    return {
      id: "estacion",
      kind: "estacion",
      name: NAMES.estacion!,
      radiusM: 60,
      position: () => this.d.structure.position,
      velocity: () => this.escape.velocity,
      active: () => true,
      protection: () => ({
        hullEnergyJ: HULL_ENERGY_J.estacion,
        debrisFactor: whippleDebrisFactor(STATION_REAR_WALL_CM, SHIELD_WHIPPLE_NODE.bumper!),
        radiation: { material: "aluminio", arealDensityGcm2: STATION_WALL_GCM2 },
      }),
      damage: (f) => this.stationHull.damage(f),
      dose: (x) => this.crewIn() === "estacion" && (this.crewDoseMSv += x),
      pull: (dv) => this.escape.push(dv),
      thrustAccelMs2: () => this.escape.accelMs2,
    };
  }

  /** Time may run fast while nothing is flying at you and you are out of reach. */
  get allowsWarp(): boolean {
    return this.wrath.threats("aterrizador").length === 0 && !this.wrath.fleeGuidance("aterrizador") && !this.wrath.ramAt("aterrizador") && !this.wrath.ramAt("sonda");
  }

  /** The ram coming at a craft Doménica controls (the lander, or the probe), the soonest. */
  private ramOnYou(): RamView | undefined {
    const a = this.wrath.ramAt("aterrizador");
    const b = this.wrath.ramAt("sonda");
    return a && b ? (a.etaS <= b.etaS ? a : b) : (a ?? b);
  }

  /** Short banner line while an asteroid is angry with you, or "". */
  bannerText(): string {
    const a = this.wrath.angry()[0];
    if (!a) return "";
    const r = this.ramOnYou();
    if (r) return `¡${r.asteroidName} ${r.phase === "preparando" ? "va a embestir" : "embiste"} a ${SHORT[r.targetId] ?? r.targetId}! Esquiva de lado`;
    const g = this.wrath.fleeGuidance("aterrizador");
    if (g?.trapped) return `¡${a.body.data.name} te atrapa con su gravedad!`;
    if (g) return `¡${a.body.data.name} está furioso! Huye`;
    return `${a.body.data.name} sigue furioso: espera a que se calme`;
  }

  /** One frame: `gameDt` is game seconds (time warp included), `dt` real seconds for the effects. */
  update(gameDt: number, dt: number, camera: THREE.Camera, inCockpit: boolean): void {
    this.clock += dt;
    this.wrath.update(gameDt);
    this.moveStation(gameDt);
    const events = this.wrath.drainEvents();
    for (const e of events) this.react(e);
    this.sayBurst(events);
    const shells = this.wrath.angry().map((a) => ({ id: a.body.data.id, centre: a.body.position, radiusM: a.body.meanRadiusM + this.wrath.reachM(a.body.data.id), level: a.level }));
    this.view.update(dt, camera, this.wrath.projectiles, events, shells, this.wrath.rams());
    this.panel.render(inCockpit ? this.model() : null);
  }

  private moveStation(gameDt: number): void {
    const { structure, station, mothership } = this.d;
    const before = this.escape.position;
    const flee = this.wrath.survival ? this.wrath.fleeGuidance("estacion") : null;
    const after = this.escape.update(gameDt, flee);
    const delta = after.sub(before);
    if (delta.length() === 0) return;
    structure.moveTo(after);
    station.moveTo(after);
    this.d.placeStation(after);
    // The mothership docked at the station rides along; a craft docked to either follows its port.
    if (mothership.dockedTo) mothership.moveTo(mothership.position.add(delta));
  }

  /** A burst outranks the hits it causes: one line with the burst and what its fragments took. */
  private sayBurst(events: readonly WrathEvent[]): void {
    const b = events.find((e) => e.type === "burst");
    if (!b || b.type !== "burst") return;
    const hits = events.filter((e) => e.type === "hit" && e.kind === b.kind);
    const parts = hits.map((h) => (h.type === "hit" ? `${SHORT[this.wrath.target(h.targetId)?.kind ?? ""] ?? h.targetId} −${(h.fraction * 100).toFixed(h.fraction < 0.01 ? 1 : 0).replace(".", ",")} %` : ""));
    this.alert = `${b.kind === "nuclear" ? "¡Detonación nuclear!" : "¡Una carga revienta: nube de fragmentos!"}${parts.length ? ` ${parts.join(" · ")}` : ""}`;
    this.alertUntil = this.clock + 4;
  }

  private react(e: WrathEvent): void {
    const say = (text: string) => {
      this.alert = text;
      this.alertUntil = this.clock + 4;
    };
    if (e.type === "hit") say(`¡Impacto en ${NAMES[this.wrath.target(e.targetId)?.kind ?? ""] ?? e.targetId}! −${(e.fraction * 100).toFixed(e.fraction < 0.01 ? 1 : 0).replace(".", ",")} % de casco`);
    if (e.type === "jet") say(`¡Chorro de gas y polvo sobre ${NAMES[this.wrath.target(e.targetId)?.kind ?? ""] ?? e.targetId}! ${e.interceptedKg < 1 ? e.interceptedKg.toFixed(2).replace(".", ",") : Math.round(e.interceptedKg)} kg de polvo${e.deltaVMs > 0.001 ? ` · empuje de ${e.deltaVMs < 0.1 ? (e.deltaVMs * 100).toFixed(1).replace(".", ",") + " cm/s" : e.deltaVMs.toFixed(2).replace(".", ",") + " m/s"}` : ""}`);
    if (e.type === "pulse") say(`Pulso de radiación sobre ${NAMES[this.wrath.target(e.targetId)?.kind ?? ""]}: ${mSv(e.doseMSv)} tras el blindaje`);
    if (e.type === "escaped") say(`${NAMES[this.wrath.target(e.targetId)?.kind ?? ""]} fuera de su alcance`);
    if (e.type === "calmed") say("Se ha calmado: puedes volver a intentarlo");
    const who = (id: string) => NAMES[this.wrath.target(id)?.kind ?? ""] ?? id;
    const rock = (id: string) => this.d.asteroids.find((x) => x.data.id === id)?.data.name ?? id;
    if (e.type === "ram-windup") {
      say(`¡${rock(e.asteroidId)} se lanza contra ${who(e.targetId)}! Esquiva de lado ${metres(e.dodgeM)}`);
      ramAlarm();
    }
    if (e.type === "ram-charge") say(`¡${rock(e.asteroidId)} embiste! Hasta ${dec(this.wrath.ram(e.asteroidId)?.topSpeedMs ?? 0)} m/s`);
    if (e.type === "ram-hit") {
      say(`¡Embestida a ${dec(e.closingMs)} m/s sobre ${who(e.targetId)}! ${kJ(e.absorbedJ)} · −${pct(e.fraction)} de casco · empujón de ${dec(e.deltaVMs)} m/s`);
      impactThud();
      // Felt in the cockpit of the craft that took it.
      if (e.targetId === "aterrizador" || e.targetId === "sonda") this.panel.impact(e.fraction);
    }
    if (e.type === "ram-miss") say(`Esquivado: ${rock(e.asteroidId)} se pasa ${metres(e.stopM)} de largo y tarda ${timeText(e.turnaroundS)} en volver`);
    if (e.type === "shaken") say(`${rock(e.asteroidId)} se sacude y te despega de su superficie`);
  }

  private model(): WrathPanelModel | null {
    const a = this.wrath.angry()[0];
    const survival = this.wrath.survival;
    if (!a && !survival && this.clock > this.alertUntil) return null;
    const threats = new Map<string, { n: Map<string, number>; eta: number }>();
    for (const t of ["sonda", "aterrizador", "nodriza", "estacion"]) {
      for (const th of this.wrath.threats(t)) {
        const k = threats.get(t) ?? { n: new Map(), eta: Infinity };
        k.n.set(th.projectile.kind, (k.n.get(th.projectile.kind) ?? 0) + 1);
        k.eta = Math.min(k.eta, th.etaS);
        threats.set(t, k);
      }
    }
    const threatLines = [...threats].map(([t, k]) => {
      const what = [...k.n].map(([kind, n]) => `${n} ${KIND_WORD[kind]![n === 1 ? 0 : 1]}`).join(" + ");
      return `${what} → ${SHORT[t] ?? t}${Number.isFinite(k.eta) ? ` · ${timeText(k.eta)}` : ""}`;
    });
    // The craft Doménica flies: the lander, or the travel ship when the lander is docked to it (flight deck).
    const onShip = this.d.docking.dockedTo === this.d.mothership;
    const craft = onShip ? "nodriza" : this.d.docking.docked ? undefined : "aterrizador";
    const g = craft ? this.wrath.fleeGuidance(craft) : null;
    let flee: WrathPanelModel["flee"];
    const ram = this.ramOnYou();
    const ramLine = ram
      ? `¡EMBESTIDA → ${SHORT[ram.targetId] ?? ram.targetId}! ${ram.phase === "preparando" ? `sale en ${timeText(ram.windupLeftS)}` : `${dec(ram.speedMs)} m/s`} · choque en ${timeText(ram.etaS)}`
      : undefined;
    if (ram && ram.targetId === craft && !onShip) {
      const b = this.d.flight.state.toBody(ram.dodgeDirection);
      flee = { angleDeg: (Math.atan2(b.x, b.y) * 180) / Math.PI, behind: b.z > 0.3, distanceM: ram.dodgeLeftM, trapped: false, dodge: true };
    } else if (a && craft) {
      if (g) {
        const b = onShip ? this.d.mothership.orientation.conjugate().rotate(g.direction) : this.d.flight.state.toBody(g.direction);
        flee = { angleDeg: (Math.atan2(b.x, b.y) * 180) / Math.PI, behind: b.z > 0.3, distanceM: g.distanceM, trapped: g.trapped };
      } else flee = { angleDeg: 0, behind: false, distanceM: 0, trapped: false };
    }
    const st = this.wrath.fleeGuidance("estacion");
    const survivalText = survival
      ? this.escape.state === "sin-propelente"
        ? "MODO SUPERVIVENCIA · la estación se ha quedado sin propelente"
        : `MODO SUPERVIVENCIA · la estación huye con sus motores${st ? `: faltan ${(st.distanceM / 1000).toFixed(1).replace(".", ",")} km` : ""} · ${this.escape.velocity.length().toFixed(1).replace(".", ",")} m/s · Δv ${this.escape.deltaVMs.toFixed(0)} m/s`
      : undefined;
    const status = [
      `Casco: módulo ${pct(this.d.ship.hullIntegrity)} · nodriza ${pct(this.mothershipHull.integrity)} · estación ${pct(this.stationHull.integrity)}`,
      ...(this.crewDoseMSv > 0 ? [`Dosis de Doménica ${mSv(this.crewDoseMSv)}${this.crewDoseMSv > DOSE_MARKS.stormLimitMSv ? " · por encima del límite de 250 mSv" : ""}`] : []),
    ];
    return {
      asteroid: a?.body.data.name ?? "",
      tier: a?.power.tier ?? 0,
      tierName: a?.power.spec.name ?? "",
      level: a?.level ?? 0,
      calmInS: a?.timeToCalmS ?? 0,
      threats: threatLines,
      flee,
      ram: ramLine,
      status,
      survival: survivalText,
      alert: this.clock < this.alertUntil ? this.alert : undefined,
    };
  }
}
