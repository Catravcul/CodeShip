import type { AreaMap, AreaNode } from "@modules/tasks/application/areas";
import type { Vehicle } from "@modules/tasks/application/task-list";
import { carpetDestinations, stationAt, type CarpetStation } from "@modules/sanctuary-one/data/alfombras";
import type { MapView } from "./map-window-model";
import { AreasWindow } from "./areas-window";
import { carpetTravel } from "./carpet-travel";
import { ICON } from "./icons";
import type { Interaction } from "./root-menu";

/** What a level says of each station on the carpets' map (its name, its line and its chip). */
export interface CarpetNode {
  readonly label: string;
  readonly desc: string;
  readonly category: string;
}

export interface CarpetStationsDeps {
  /** The map's vehicle (the level or island: «santuario-1», «entrenamiento»). */
  readonly vehicle: Vehicle;
  readonly stations: readonly CarpetStation[];
  /** How a station reads on the map seen from `from`. */
  node(s: CarpetStation, from: CarpetStation): CarpetNode;
  /** The place's own shape drawn faint under the stations (sanctuary 1: the trunks of the buildings shown). */
  structure?(shown: readonly CarpetStation[]): AreaMap["structure"];
  /** Where a station's carpets go (by default sanctuary 1's rule: its building; from a foot or crown, the others too). */
  destinations?(from: CarpetStation): CarpetStation[];
  /** Fly there on a carpet (automatic, no challenge: the level flies its route), from the station she stands on. */
  fly(from: CarpetStation, to: CarpetStation): void;
  /** Appear there (the station's own setting says «teletransporte»). */
  teleport(to: CarpetStation): void;
  readonly view?: MapView;
  readonly whole?: string;
}

/**
 * THE CARPET STATIONS of every sanctuary (Berón 2026-11-20 in sanctuary 1, santuario1.md #47 and #56; 2026-11-26 for the
 * hollow mountain of sanctuary 3: «reutiliza el código de S1»): standing on a station's pad, the orange button (Y on the
 * pad) says «Volar» and opens the same map window as Áreas with only that station's destinations; each station keeps
 * its own «viaje o teletransporte» (ui/carpet-travel.ts). One window for all the stations: it is given the one she is on.
 * The pads, their two floating carpets and the orrery are drawn by adapters/three/carpet-stations.ts.
 */
export class CarpetStations {
  /** The station she stands on (or the one whose window is open). */
  station: CarpetStation | undefined;
  readonly window: AreasWindow;
  private readonly byId: Map<string, CarpetStation>;

  constructor(
    root: HTMLElement,
    private readonly deps: CarpetStationsDeps,
  ) {
    this.byId = new Map(deps.stations.map((s) => [s.id, s]));
    this.window = new AreasWindow(root, {
      kind: { title: "Alfombras", window: "alfombras", bodyClass: "in-carpets", className: "carpets-window" },
      here: () => deps.vehicle,
      map: () => (this.station ? this.map(this.station) : undefined),
      ...(deps.whole ? { whole: deps.whole } : {}),
      ...(deps.view ? { view: deps.view } : {}),
      at: () => this.station?.id,
      row: (n) => (n.id === this.station?.id ? { locked: "Estás aquí" } : { action: "Volar", actionLabel: `Volar a ${n.label}` }),
      travel: { get: () => carpetTravel.get(this.station?.id ?? ""), set: (v) => this.station && carpetTravel.set(this.station.id, v), heading: "Desde esta estación", help: "Ajuste propio de esta estación de alfombras: cada una guarda el suyo." },
      go: (n) => this.go(n.id),
    });
  }

  /** The station on whose pad (x, y, z) is, if any. */
  at(x: number, y: number, z: number): CarpetStation | undefined {
    return stationAt(this.deps.stations, x, y, z);
  }

  /** Where a station's carpets go. */
  destinations(from: CarpetStation): CarpetStation[] {
    return this.deps.destinations ? this.deps.destinations(from) : carpetDestinations(this.deps.stations, from);
  }

  /** What its carpets reach, on the same map as Áreas. */
  map(st: CarpetStation): AreaMap {
    const shown = [st, ...this.destinations(st)];
    const structure = this.deps.structure?.(shown);
    return {
      vehicle: this.deps.vehicle,
      nodes: shown.map((s): AreaNode => ({ id: s.id, ...this.deps.node(s, st), goal: s.area, fixture: s.area, centre: { x: s.x, y: s.y, z: s.z }, half: { x: 1, y: 1, z: 1 }, scope: { edificio: s.tower } })),
      links: [],
      ...(structure ? { structure } : {}),
    };
  }

  /** The orange button on a station: «Volar» (its label names the station). */
  button(st: CarpetStation, onClick: () => void = () => this.open(st)): Interaction {
    return { icon: ICON.carpet, label: `Volar: ${st.kind === "piso" ? "estación de alfombras" : st.label === st.building ? st.label.toLowerCase() : `${st.label.toLowerCase()} de ${st.building}`}`, word: "Volar", onClick };
  }

  /** Opens its carpets' window. */
  open(st: CarpetStation | undefined = this.station): void {
    if (!st) return;
    this.station = st;
    this.window.open();
  }

  /** Fly (automatic, no challenge) or appear there, as the station she leaves from is set. */
  go(id: string): void {
    const from = this.station;
    const to = this.byId.get(id);
    if (!from || !to || from.id === to.id) return;
    if (carpetTravel.get(from.id) === "teletransporte") this.deps.teleport(to);
    else this.deps.fly(from, to);
  }
}
