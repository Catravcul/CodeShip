import type { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import type { Expedition } from "@modules/expedition/application/expedition";
import type { Mothership } from "@modules/mothership/domain/mothership";
import { CargoHold } from "@modules/mothership/domain/hold";
import type { NanoNetOps } from "@modules/nano-net/application/operations";
import type { StationInbox } from "@modules/imports/domain/delivery";
import type { Station } from "@modules/station/domain/station";
import { cargoMaterial } from "@modules/station/data/materials";
import { AsteroidServices, type PursuitPort, type ServiceEvent } from "@modules/subjugation/application/asteroid-services";
import { packageKg, shipPackage, stationPackage, type Package } from "@modules/subjugation/domain/yields";
import { LEVEL_NAME, type Level } from "@modules/subjugation/domain/levels";

/** Capacity of the travel ship's hold for asteroid packages, kg (game value: a small freighter's worth). */
export const MOTHERSHIP_HOLD_KG = 20_000;

/** What the map draws next to an asteroid: its level and what it is doing. */
export interface LevelMark {
  readonly level: number;
  readonly tone: "obedece" | "red" | "nave" | "estacion" | "viaje" | "aparcado" | "persigue" | "vuelve";
  /** A few words under its name. */
  readonly short: string;
  /** Where it is heading, if it is moving (drawn as a dashed line). */
  readonly goal?: Vec3;
}

export interface LevelsDeps {
  readonly root: HTMLElement;
  readonly asteroids: readonly Asteroid[];
  readonly expedition: Expedition;
  readonly mothership: Mothership;
  readonly station: Station;
  /** The station's delivery inbox (imports module): level 3 packages and level 4 lots land through it. */
  readonly inbox: StationInbox;
  readonly stationPosition: () => Vec3;
  readonly stationRadiusM: () => number;
  readonly wrath: PursuitPort;
  readonly nano: NanoNetOps;
  /** Lander anchored on it or the probe parked on it. */
  anchoredOn(id: string): boolean;
  readonly secondsPerDay: number;
  readonly stationHoursPerSecond: number;
}

const kg = (v: number) => (v >= 1e9 ? `${(v / 1e9).toFixed(1).replace(".", ",")} Mt` : v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} kt` : v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")} t` : `${v.toFixed(0)} kg`);
const time = (s: number) => (s < 90 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`);

/**
 * Wiring of the subjugation levels (docs/design/subyugacion.md §«Niveles»): the asteroids' services
 * (packages, the final trip, the chase), the travel ship's hold, the nano_net eligibility and the
 * radio lines. Main reads `mark`, `activity` and `say` for the map, the HUD chip and the banner.
 */
export class LevelsUi {
  readonly services: AsteroidServices;
  readonly hold = new CargoHold(MOTHERSHIP_HOLD_KG);
  /**
   * Hook for compressed travel time (branch viajes-retos): how many times faster a level-4 trip with
   * `etaGameS` game seconds left should run. 1 = plain game time.
   */
  travelTimeScale: (etaGameS: number) => number = () => 1;
  private readonly toast: HTMLElement;
  private toastTimer = 0;
  private readonly netEligible = new Set<string>();
  /** Last radio line (for checks). */
  lastRadio = "";

  constructor(private readonly d: LevelsDeps) {
    this.services = new AsteroidServices(d.asteroids, {
      rapport: d.expedition.rapport,
      station: {
        position: d.stationPosition,
        radiusM: d.stationRadiusM,
        send: (source, label, goods, hours) => d.inbox.send(source, label, goods, hours),
        goods: (p) => toStore(p),
      },
      ship: { position: () => d.mothership.position, load: (p) => this.hold.load(p) },
      wrath: d.wrath,
      anchoredOn: (id) => d.anchoredOn(id),
      secondsPerDay: d.secondsPerDay,
      stationHoursPerSecond: d.stationHoursPerSecond,
      travelTimeScale: (eta) => this.travelTimeScale(eta),
    });
    this.toast = document.createElement("div");
    this.toast.className = "radio-toast";
    d.root.appendChild(this.toast);
  }

  /** One frame of game time (`gameDt`, time warp included) and of the station clock (`stationHours`). */
  update(gameDt: number, stationHours?: number): void {
    this.services.update(gameDt, stationHours);
    // Level 1 and up: the asteroid may become a nano_net core (docs/design/nano-net.md).
    for (const a of this.d.asteroids) {
      const id = a.data.id;
      if (!this.netEligible.has(id) && (this.d.expedition.rapport.peek(id)?.level ?? 0) >= 1) {
        this.netEligible.add(id);
        this.d.nano.subjugate(id);
      }
    }
    // Berthed at the station: the travel ship's hold goes into the store.
    if (this.d.mothership.dockedTo && this.hold.loadKg > 0) {
      const load = this.hold.loadKg;
      this.d.station.unload(this.hold.unload(), cargoMaterial);
      this.radio(`<b>Bodega de la nodriza</b> descargada en la estación: ${kg(load)} de roca de asteroide`);
    }
    for (const e of this.services.drainEvents()) this.react(e);
  }

  private react(e: ServiceEvent): void {
    const name = `<b>${esc(e.name)}</b>`;
    switch (e.type) {
      case "paquete-nave":
        return this.radio(`${name} envía un paquete a la nodriza: ${kg(e.loadedKg)} en la bodega${e.loadedKg < e.kg - 1 ? ` (no cabía todo: ${kg(e.kg - e.loadedKg)} a la deriva)` : ""} · bodega ${kg(this.hold.loadKg)} de ${kg(this.hold.capacityKg)}`);
      case "paquete-estacion":
        return this.radio(`${name} lanza un paquete de ${kg(e.kg)} a la estación`);
      case "persigue":
        return this.radio(`¡${name} se mueve con su gravedad y persigue a ${esc(e.targetName)}! Huye más rápido que él o espera a que se calme`);
      case "deja-de-perseguir":
        return this.radio(`${name} deja de perseguirte y vuelve a su sitio`);
      case "sale":
        return this.radio(`${name} se pone en marcha hacia la estación: llega en ${time(e.etaS)}`);
      case "llega":
        return this.radio(`${name} aparca junto a la estación: la refinería ya recibe su roca`);
      case "agotado":
        return this.radio(`${name}: extraído entero`);
    }
  }

  /** A line on the ship's radio (toast on top of whatever is showing). */
  radio(html: string): void {
    this.lastRadio = html.replace(/<[^>]+>/g, "");
    this.toast.innerHTML = html;
    this.toast.classList.add("on");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("on"), 6000);
  }

  /** What an asteroid is doing, in a few words (map and HUD chip); "" for one that does not obey and is calm. */
  mark(id: string): LevelMark | undefined {
    const a = this.d.asteroids.find((x) => x.data.id === id);
    if (!a) return undefined;
    const r = this.d.expedition.rapport.peek(id);
    const level = r?.subjugated ? r.level : 0;
    const s = this.services;
    switch (s.mode(id)) {
      case "persigue":
        return { level, tone: "persigue", short: `persigue a ${this.d.wrath.pursuit(id)?.targetName ?? "la nave"} · ${a.velocity.length().toFixed(1).replace(".", ",")} m/s`, goal: this.d.wrath.pursuit(id)?.position() };
      case "vuelve":
        return { level, tone: "vuelve", short: "vuelve a su sitio", goal: s.home(id) };
      case "espera":
        return { level, tone: "viaje", short: "lista para ir a la estación: despega" };
      case "viaja":
        return { level, tone: "viaje", short: `viaja a la estación · ${a.velocity.length().toFixed(0)} m/s · ${time(s.etaS(id) ?? 0)}`, goal: s.destination(id) };
      case "aparcado":
      case "agotado": {
        const x = s.extraction(id);
        return { level, tone: "aparcado", short: `en la estación · extraídos ${kg(x?.takenKg ?? 0)}` };
      }
    }
    if (!r?.subjugated) return undefined;
    switch (level as 0 | Level) {
      case 0:
        return { level, tone: "obedece", short: "obedece" };
      case 1:
        return { level, tone: "red", short: this.d.nano.net.core(id) ? "núcleo de la nano_net" : "aporta a la nano_net" };
      case 2:
        return { level, tone: "nave", short: `envía ${kg(packageKg(shipPackage(a.data)))}/día a la nave` };
      case 3:
        return { level, tone: "estacion", short: `envía ${kg(packageKg(stationPackage(a.data)))}/día a la estación` };
      default:
        return { level, tone: "viaje", short: LEVEL_NAME[4] };
    }
  }

  /** One line for the map card and the HUD chip. */
  activity(id: string): string {
    const m = this.mark(id);
    if (!m) return "";
    return `${m.level > 0 ? `Nivel ${m.level} · ` : ""}${m.short.charAt(0).toUpperCase()}${m.short.slice(1)}`;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Rock of a package as the station's store materials (what has no store id is left out). */
function toStore(p: Package): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of p) {
    const id = cargoMaterial(c.material);
    if (id && c.kg > 0) out[id] = (out[id] ?? 0) + c.kg;
  }
  return out;
}
