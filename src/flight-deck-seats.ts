import { ChoreRun } from "@modules/chores/domain/chore";
import type { Navigator } from "@modules/navigation/application/navigator";
import { berthChore } from "@modules/navigation/application/berth-chore";
import { num } from "@modules/navigation/application/trip-chore";
import { targetDistance } from "@modules/navigation/domain/nav-target";
import { PROXIMITY, WAYPOINT2_HOLD_S, BERTH_STANDOFF_M } from "@modules/mothership/application/berthing";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { DuelView } from "./ui/duel-view";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import { openTripSheet, TRIP_TEXT, type NavigationMode } from "./navigation";
import type { DockDeps, PilotDeps, PilotDestination } from "./bridge";

const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

export interface SeatsWiring {
  readonly nav: Navigator;
  readonly navMode: NavigationMode;
  readonly mothership: Mothership;
  readonly duel: DuelView;
  /** The lander is latched to the Starship's belly port. */
  landerAboard(): boolean;
  /** Open the pilot's systems pages (the deck's propulsion, power and life pages, as tabs). */
  openSystems(): void;
  say(text: string): void;
  /** The docking challenge acted out at the docking seat (reglas.md §4.2). */
  dockVisual?(facts: { waypoint1M: number; waypoint2M: number; closingMs: number }): StepVisual | undefined;
}

/**
 * Starship's pilot and docking seats (docs/design/puente.md): what each offers and what it does, built from the
 * navigator. The pilot flies to any destination by hand or by challenges; the docking seat docks at the station
 * from Waypoint 1 by hand (the nose port's camera) or by challenges, and undocks.
 */
export function flightDeckSeats(w: SeatsWiring): { pilot: PilotDeps; dock: DockDeps } {
  const { nav, mothership } = w;
  let cache: { at: number; list: PilotDestination[] } | undefined;
  let chore: ChoreRun | undefined;
  const destinations = (): PilotDestination[] => {
    const now = performance.now();
    if (cache && now - cache.at < 600) return cache.list;
    const list: PilotDestination[] = [];
    for (const t of nav.targets) {
      // The probe-only ports (the Starship's own) are not destinations for the Starship.
      if (t.kind === "dock" && !t.carrierPort) continue;
      if (t.kind === "dock" && nav.berthedAt()?.id === t.id) continue;
      const can = nav.canCarry(t);
      const here = t.kind === "asteroid" && w.landerAboard() && !nav.carrierFlies(t);
      const why = can.ok ? undefined : here ? `La Starship ya está junto a ${t.name}: baja en el módulo lunar` : t.kind === "asteroid" && !w.landerAboard() ? "A un asteroide la Starship va con el módulo lunar acoplado (aterriza él)" : can.reason;
      list.push({ id: t.id, name: t.name, distance: km(t.kind === "asteroid" ? targetDistance(t, mothership.position) : t.position.sub(mothership.position).length()), ...(why ? { why } : {}) });
    }
    // The station first: it is where the trips of the tasks go.
    list.sort((a, b) => Number(nav.targets.find((t) => t.id === b.id)?.kind === "dock") - Number(nav.targets.find((t) => t.id === a.id)?.kind === "dock"));
    cache = { at: now, list };
    return list;
  };
  const busy = (): string | undefined => {
    if (nav.status === "programming") return "Programando el viaje";
    const p = nav.progress();
    if (p?.vehicle !== "carrier") return undefined;
    if (p.phase === "dock" || p.phase === "undock") return "Maniobra de acople en curso: se sigue en el puesto de acople";
    return p.manual ? "Pilotando a mano: los mandos están abajo" : "La Starship vuela sola por su programa: «Ver trayecto» en el chip";
  };
  const pilot: PilotDeps = {
    destinations,
    current: () => nav.target.id,
    busy,
    blocked: () => (mothership.dockedTo ? "Atracada en la estación: desacopla antes en el puesto de acople" : undefined),
    flyManual: (id) => {
      if (mothership.dockedTo) return { ok: false, reason: "Atracada en la estación: desacopla antes en el puesto de acople" };
      const r = nav.flyByHand(id);
      cache = undefined;
      if (r.ok) w.say(`Pilotaje manual hacia ${nav.target.name}: da el empuje con +0,1 m/s`);
      return r;
    },
    flyAuto: (id) => {
      const sel = nav.select(id);
      if (!sel.ok) return sel;
      const can = nav.canProgram();
      if (!can.ok) return can;
      cache = undefined;
      w.navMode.program();
      return { ok: true };
    },
    openSystems: w.openSystems,
  };
  const dock: DockDeps = {
    state: () => {
      const b = nav.berthedAt();
      if (b) return { kind: "atracada", where: `${b.name} (${b.carrierPort!.name})` };
      const p = nav.progress();
      if (p?.vehicle === "carrier" && (p.phase === "dock" || p.phase === "undock"))
        return { kind: "maniobra", manual: !!nav.manualBerth, what: p.phase === "undock" ? `Desacoplando: faltan ${km(p.remainingM)} hasta el punto de espera` : `${nav.manualBerth ? "Acople a mano" : "Acople automático"}: faltan ${km(p.remainingM)} hasta el puerto` };
      const h = nav.holdingAt();
      if (h) return { kind: "espera", where: h.name, rangeM: Math.max(0, h.carrierPort!.port.position.sub(mothership.position).length() - BERTH_FACE_M) };
      const fail = nav.lastBerthFailure.length ? `Último intento sin captura: ${nav.lastBerthFailure.join("; ")}. ` : "";
      return { kind: "lejos", why: nav.status === "carrier" ? "La Starship está en viaje" : `${fail}Lejos de la estación: vuela hasta su punto de espera desde el puesto de pilotaje (a mano se para allí)` };
    },
    lander: () => (w.landerAboard() ? "Puerto de la panza: el módulo lunar está acoplado (se suelta y se acopla desde su cabina)" : "Puerto de la panza: libre (el módulo se acopla desde su cabina)"),
    undock: () => nav.undockCarrier(),
    dockManual: () => nav.berthByHand(),
    dockAuto: () => {
      const h = nav.holdingAt();
      if (!h?.carrierPort) return { ok: false, reason: "La Starship no está en el punto de espera de un puerto" };
      const L = IDSS_CONTACT_LIMITS;
      const facts = { stationName: h.name, portName: h.carrierPort.name, waypoint1M: BERTH_STANDOFF_M, waypoint2M: PROXIMITY.waypoint2M, closingMs: PROXIMITY.closingMs, closingMinMs: L.closingMinMs, closingMaxMs: L.closingMaxMs, lateralMaxM: L.lateralMisalignM, holdS: WAYPOINT2_HOLD_S };
      const run = (chore = new ChoreRun(berthChore(facts)));
      const visual = w.dockVisual?.(facts);
      openTripSheet(
        w.duel,
        run,
        (a) => {
          const ok = run.submit(a);
          if (run.status === "done") nav.berthAuto();
          return ok;
        },
        () => nav.status === "carrier",
        () => {},
        { ...TRIP_TEXT, submit: "Cargar el acople en el ordenador de vuelo" },
        visual,
      );

      return { ok: true };
    },
    stop: () => nav.cancel(),
    chore: () => (chore?.status === "doing" ? chore : undefined),
  };
  return { pilot, dock };
}

/** From the Starship's centre to its nose port's face, m (STARSHIP_NOSE_PORT, 26,6 m). */
const BERTH_FACE_M = 26.6;
