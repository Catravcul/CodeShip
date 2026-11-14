/**
 * The task list's «Ir» in travel mode (docs/design/viaje-a-una-tarea.md): the whole real way to a
 * task, across rooms and vehicles, as a graph of places and transfers with real durations. A place
 * is "room:spot" ("anillo:ascensor", "eje:atraque", "modulo:asiento", "estacion:<fixture>"); a
 * transfer is a walk, the spoke's elevator, a chain of zero-g hops, a hatch or a flight. Hatches open
 * only with the vehicles joined; flights change how they are joined. The quickest way wins; if
 * there is none, the reason of the first leg that cannot be done now.
 */

/** How the vehicles are joined: where the lander is docked, and whether the travel ship is berthed at the station. */
export interface CrewJoins {
  readonly lander: "nodriza" | "estacion" | null;
  readonly mothershipAtStation: boolean;
}

export type LegKind = "andar" | "ascensor" | "saltos" | "escotilla" | "vuelo";

export interface Transfer {
  readonly from: string;
  readonly to: string;
  readonly kind: LegKind;
  /** Real seconds it takes (the walking speed, the car, the hops' physics, the flight's compressed time). */
  readonly seconds: number;
  /** What the HUD says while she does it. */
  readonly label: string;
  /** Only with the vehicles joined like this (a hatch, a flight from a port); `shut` says why not. */
  readonly open?: (j: CrewJoins) => boolean;
  readonly shut?: string;
  /** How the vehicles are joined after it (a flight). */
  readonly then?: (j: CrewJoins) => CrewJoins;
  /** Why it cannot be done now (no fuel, landed), if so. */
  readonly blocked?: string;
}

/** One leg of a planned journey: a transfer and how the vehicles are joined after it. */
export interface Leg {
  readonly from: string;
  readonly to: string;
  readonly kind: LegKind;
  readonly seconds: number;
  readonly label: string;
  readonly joins: CrewJoins;
}

export type JourneyPlan = { readonly kind: "ruta"; readonly legs: readonly Leg[]; readonly seconds: number } | { readonly kind: "bloqueado"; readonly why: string; readonly at: string };

/**
 * Cost of a leg that cannot be done, s: any real way is cheaper; it only finds where and why it is
 * blocked. A shut hatch costs more than a flight that cannot go now (no fuel, the lander away): a
 * flight could open the hatch, so the flight's own reason is the one worth saying.
 */
const BLOCKED_S = 1e7;
const SHUT_S = 2 * BLOCKED_S;

const key = (place: string, j: CrewJoins) => `${place}|${j.lander ?? "-"}|${j.mothershipAtStation ? 1 : 0}`;

interface Node {
  readonly place: string;
  readonly joins: CrewJoins;
}

/** The quickest way from where she is to a place (Dijkstra over place and joins). */
export function planJourney(transfers: readonly Transfer[], from: { place: string; joins: CrewJoins }, to: string): JourneyPlan {
  if (from.place === to) return { kind: "ruta", legs: [], seconds: 0 };
  const out = new Map<string, Transfer[]>();
  for (const t of transfers) out.set(t.from, [...(out.get(t.from) ?? []), t]);
  const start: Node = { place: from.place, joins: from.joins };
  const best = new Map<string, number>([[key(start.place, start.joins), 0]]);
  const prev = new Map<string, { at: Node; t: Transfer; why?: string }>();
  const nodes = new Map<string, Node>([[key(start.place, start.joins), start]]);
  const open = new Set<string>([key(start.place, start.joins)]);
  const done = new Set<string>();
  let goal: string | undefined;
  while (open.size) {
    let k = "";
    for (const c of open) if (!k || best.get(c)! < best.get(k)!) k = c;
    open.delete(k);
    done.add(k);
    const n = nodes.get(k)!;
    if (n.place === to) {
      goal = k;
      break;
    }
    for (const t of out.get(n.place) ?? []) {
      const shut = t.open && !t.open(n.joins);
      const why = t.blocked ?? (shut ? (t.shut ?? `${t.label}: ahora no se puede`) : undefined);
      // A leg blocked now is planned as if done, so the reason found is its own and not a hatch it leaves shut.
      const joins = t.then ? t.then(n.joins) : n.joins;
      const nk = key(t.to, joins);
      if (done.has(nk)) continue;
      const cost = best.get(k)! + t.seconds + (t.blocked || (shut && t.then) ? BLOCKED_S : why ? SHUT_S : 0);
      if (cost < (best.get(nk) ?? Infinity)) {
        best.set(nk, cost);
        nodes.set(nk, { place: t.to, joins });
        prev.set(nk, { at: n, t, ...(why ? { why } : {}) });
        open.add(nk);
      }
    }
  }
  if (!goal) return { kind: "bloqueado", why: "No hay camino hasta allí", at: from.place };
  const steps: { at: Node; t: Transfer; why?: string; joins: CrewJoins }[] = [];
  for (let k = goal; k !== key(start.place, start.joins); ) {
    const s = prev.get(k)!;
    steps.unshift({ ...s, joins: nodes.get(k)!.joins });
    k = key(s.at.place, s.at.joins);
  }
  const stop = steps.find((s) => s.why);
  if (stop) return { kind: "bloqueado", why: stop.why!, at: stop.at.place };
  const legs = steps.map(({ t, joins }) => ({ from: t.from, to: t.to, kind: t.kind, seconds: t.seconds, label: t.label, joins }));
  return { kind: "ruta", legs, seconds: legs.reduce((s, l) => s + l.seconds, 0) };
}

/** Seconds left: what is left of leg `index` after `elapsed` seconds in it (never below zero), plus the legs after it. */
export function legSecondsLeft(legs: readonly Leg[], index: number, elapsed: number): number {
  let s = Math.max(0, (legs[index]?.seconds ?? 0) - elapsed);
  for (let i = index + 1; i < legs.length; i++) s += legs[i]!.seconds;
  return s;
}

/** «9 s», «1 min 35 s», «2 min». */
export function etaText(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}
