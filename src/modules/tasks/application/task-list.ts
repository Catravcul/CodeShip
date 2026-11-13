/**
 * Every task of the game in one list (docs/design/habitaculo.md §Tareas): the chores on board, the
 * flight work (subjugation phases and levels, trips, Nevaeh's mission, the nano_net), the station's
 * work, imports, biosystems, refuelling and repairs. Each task says where it is done so the board can
 * take her there. Pure: main.ts reads the facts from each module.
 */
import type { Stage } from "@modules/subjugation/domain/rapport";

export type Vehicle = "modulo" | "nodriza" | "estacion";

/** Where a task is done. */
export type TaskPlace =
  | { readonly vehicle: "nodriza"; readonly spot: "anillo"; readonly station: string }
  | { readonly vehicle: "nodriza"; readonly spot: "puente"; readonly page: "nav" | "sonda" | "mente" | "misiones"; readonly target?: string }
  | { readonly vehicle: "modulo"; readonly spot: "asiento" | "acople" | "mente" | "escotilla" | "esterilla" }
  | { readonly vehicle: "estacion"; readonly spot: "pantalla"; readonly tab: "materiales" | "planos" | "fabricacion" | "hangar" | "importar" | "vida" }
  | { readonly vehicle: "estacion"; readonly spot: "bahia" };

export type TaskGroupId = "vuelo" | "viajes" | "misiones" | "estacion" | "nave" | "comida" | "plantas" | "animales" | "salud";

export const TASK_GROUPS: readonly { readonly id: TaskGroupId; readonly label: string }[] = [
  { id: "vuelo", label: "Vuelo y asteroides" },
  { id: "viajes", label: "Viajes" },
  { id: "misiones", label: "Misiones" },
  { id: "estacion", label: "Estación" },
  { id: "nave", label: "Nave" },
  { id: "comida", label: "Comida" },
  { id: "plantas", label: "Plantas" },
  { id: "animales", label: "Animales" },
  { id: "salud", label: "Salud" },
];

export interface Task {
  readonly id: string;
  readonly group: TaskGroupId;
  readonly title: string;
  readonly detail: string;
  readonly place: TaskPlace;
  /** A chore of the board: the ring's machine runs it. */
  readonly chore?: string;
}

export interface TaskFacts {
  /** The board's chores on the travel ship, with the machine of the ring where each is done. */
  readonly chores: readonly { id: string; title: string; detail: string; category: "comida" | "plantas" | "animales" | "salud" | "nave" | "misiones"; station: string }[];
  /** Every catalogued asteroid with its rapport. */
  readonly asteroids: readonly { id: string; name: string; persuaded: boolean; next: Stage | undefined; subjugated: boolean; level: number; nextLevel: number | undefined }[];
  /** The asteroid the lander and the probe work on now. */
  readonly expeditionTarget: string;
  /** Asteroid the lander is anchored on, if any. */
  readonly landedOn: string | null;
  /** Asteroid the probe is parked on, if any: its mind is reached from the bridge's mind console. */
  readonly probeParkedOn?: string | null;
  readonly mission: { title: string; targetId: string; targetName: string } | null;
  readonly nanoFaults: readonly { id: string; what: string; coreName: string }[];
  /** nano_net work the lander can do where it is anchored. */
  readonly nanoActions: readonly { id: string; title: string }[];
  readonly fabricable: readonly { id: string; name: string }[];
  readonly refinable: readonly { id: string; name: string }[];
  readonly bioToTune: readonly { id: string; name: string }[];
  readonly credits: number;
  /** The lander or the travel ship needs propellant (refuelled at the station). */
  readonly refuel: boolean;
  /** Parts the ship bay flags. */
  readonly repairs: readonly { id: string; name: string; critical: boolean }[];
}

const PHASE: Readonly<Record<Stage, number>> = { sonda: 1, nave: 2, traje: 3 };

function phaseTask(a: TaskFacts["asteroids"][number], f: TaskFacts): Task | undefined {
  const here = a.id === f.expeditionTarget;
  const landed = f.landedOn === a.id;
  const parked = f.probeParkedOn === a.id;
  const id = `fase-${a.id}`;
  const bridgeMind = { vehicle: "nodriza", spot: "puente", page: "mente" } as const;
  if (a.subjugated) {
    if (!a.nextLevel) return undefined;
    if (parked && !landed) return { id, group: "vuelo", title: `Convencer a ${a.name} del nivel ${a.nextLevel}`, detail: "Consola de la mente, en el puente de la nodriza (por la sonda aparcada)", place: bridgeMind };
    return {
      id,
      group: "vuelo",
      title: `Convencer a ${a.name} del nivel ${a.nextLevel}`,
      detail: landed ? "Consola de la mente, en el habitáculo del módulo" : "Posa el módulo (o la sonda) sobre él y entra en su mente",
      place: { vehicle: "modulo", spot: landed ? "mente" : "asiento" },
    };
  }
  if (a.persuaded || !a.next) return undefined;
  const n = PHASE[a.next];
  const where = here ? "" : " (primero, el viaje)";
  switch (a.next) {
    case "sonda":
      if (parked) return { id, group: "vuelo", title: `Entrar en la mente de ${a.name} · fase ${n} de 3`, detail: "Consola de la mente, en el puente de la nodriza (por la sonda aparcada)", place: bridgeMind };
      return { id, group: "vuelo", title: `Lanzar la sonda a ${a.name} · fase ${n} de 3`, detail: `Consola de la sonda, en el puente de la nodriza${where}`, place: { vehicle: "nodriza", spot: "puente", page: "sonda" } };
    case "nave":
      return landed
        ? { id, group: "vuelo", title: `Entrar en la mente de ${a.name} · fase ${n} de 3`, detail: "Consola de la mente, en el habitáculo del módulo", place: { vehicle: "modulo", spot: "mente" } }
        : { id, group: "vuelo", title: `Aterriza el módulo en ${a.name} · fase ${n} de 3`, detail: `Asiento del piloto${where}`, place: { vehicle: "modulo", spot: "asiento" } };
    case "traje":
      return landed
        ? { id, group: "vuelo", title: `Salir con el traje sobre ${a.name} · fase ${n} de 3`, detail: "Escotilla EVA del módulo", place: { vehicle: "modulo", spot: "escotilla" } }
        : { id, group: "vuelo", title: `Posa el módulo en ${a.name} y sal con el traje · fase ${n} de 3`, detail: `Asiento del piloto${where}`, place: { vehicle: "modulo", spot: "asiento" } };
  }
}

/** Every task, from every source, in source order (group them with `groupTasks`). */
export function collectTasks(f: TaskFacts): Task[] {
  const out: Task[] = [];
  for (const a of f.asteroids) {
    const t = phaseTask(a, f);
    if (t) out.push(t);
  }
  for (const a of f.asteroids) {
    if (a.id === f.expeditionTarget || !phaseTask(a, f)) continue;
    out.push({ id: `viaje-${a.id}`, group: "viajes", title: `Programar viaje a ${a.name}`, detail: "Mapa del puente de la nodriza: una cadena de retos", place: { vehicle: "nodriza", spot: "puente", page: "nav", target: a.id } });
  }
  if (f.mission) out.push({ id: `mision-${f.mission.targetId}`, group: "misiones", title: `Misión de Nevaeh: ${f.mission.title}`, detail: `Registro de misiones (objetivo: ${f.mission.targetName})`, place: { vehicle: "nodriza", spot: "puente", page: "misiones" } });
  for (const x of f.nanoFaults) out.push({ id: `nano-${x.id}`, group: "misiones", title: `Reparar ${x.what} de ${x.coreName}`, detail: "nano_net: vuela allí, aterriza y repara desde la cabina", place: { vehicle: "modulo", spot: "asiento" } });
  for (const x of f.nanoActions) out.push({ id: `nano-${x.id}`, group: "misiones", title: x.title, detail: "nano_net: desde la cabina, anclada en el núcleo", place: { vehicle: "modulo", spot: "asiento" } });
  for (const x of f.fabricable) out.push({ id: `fabricar-${x.id}`, group: "estacion", title: `Fabricar ${x.name}`, detail: "Estación, pestaña Planos", place: { vehicle: "estacion", spot: "pantalla", tab: "planos" } });
  for (const x of f.refinable) out.push({ id: `refinar-${x.id}`, group: "estacion", title: `Refinar: ${x.name}`, detail: "Estación, pestaña Materiales", place: { vehicle: "estacion", spot: "pantalla", tab: "materiales" } });
  for (const x of f.bioToTune) out.push({ id: `bio-${x.id}`, group: "estacion", title: `Ajustar ${x.name}`, detail: "Estación, pestaña Vida", place: { vehicle: "estacion", spot: "pantalla", tab: "vida" } });
  if (f.credits > 0) out.push({ id: "importar", group: "estacion", title: "Importar del Santuario", detail: `${f.credits.toLocaleString("es-ES")} créditos · estación, pestaña Importar`, place: { vehicle: "estacion", spot: "pantalla", tab: "importar" } });
  if (f.refuel) out.push({ id: "repostar", group: "nave", title: "Repostar", detail: "Estación, pestaña Materiales (con el módulo o la nodriza en su puerto)", place: { vehicle: "estacion", spot: "pantalla", tab: "materiales" } });
  for (const x of f.repairs) out.push({ id: `reparar-${x.id}`, group: "nave", title: `Revisar ${x.name}${x.critical ? " (crítico)" : ""}`, detail: "Bahía de la nave, en la estación", place: { vehicle: "estacion", spot: "bahia" } });
  for (const c of f.chores) out.push({ id: c.id, group: c.category, title: c.title, detail: c.detail, place: { vehicle: "nodriza", spot: "anillo", station: c.station }, chore: c.id });
  return out;
}

export interface TaskGroupView {
  readonly id: TaskGroupId;
  readonly label: string;
  readonly tasks: readonly Task[];
}

/** Tasks by group, in the board's order; empty groups are left out. */
export function groupTasks(tasks: readonly Task[]): TaskGroupView[] {
  return TASK_GROUPS.map((g) => ({ ...g, tasks: tasks.filter((t) => t.group === g.id) })).filter((g) => g.tasks.length > 0);
}

/** Which hatches are open now: the lander docked to the travel ship or the station, the travel ship berthed at the station. */
export interface VehicleLinks {
  readonly moduloNodriza: boolean;
  readonly moduloEstacion: boolean;
  readonly nodrizaEstacion: boolean;
}

export type Route = { readonly kind: "ir"; readonly through: readonly Vehicle[] } | { readonly kind: "bloqueado"; readonly via: TaskPlace; readonly why: string };

/** How she gets from the vehicle she is in to a task's place: through open hatches, or where to start. */
export function routeTo(place: TaskPlace, where: { crew: Vehicle; links: VehicleLinks }): Route {
  const edges: [Vehicle, Vehicle, boolean][] = [
    ["modulo", "nodriza", where.links.moduloNodriza],
    ["modulo", "estacion", where.links.moduloEstacion],
    ["nodriza", "estacion", where.links.nodrizaEstacion],
  ];
  const prev = new Map<Vehicle, Vehicle | null>([[where.crew, null]]);
  const queue: Vehicle[] = [where.crew];
  while (queue.length) {
    const v = queue.shift()!;
    for (const [a, b, open] of edges) {
      if (!open) continue;
      const n = a === v ? b : b === v ? a : null;
      if (n && !prev.has(n)) {
        prev.set(n, v);
        queue.push(n);
      }
    }
  }
  if (prev.has(place.vehicle)) {
    const path: Vehicle[] = [];
    for (let v: Vehicle | null = place.vehicle; v; v = prev.get(v) ?? null) path.unshift(v);
    return { kind: "ir", through: path };
  }
  const name: Record<Vehicle, string> = { modulo: "el módulo de aterrizaje", nodriza: "la nodriza", estacion: "la estación" };
  if (where.crew === "modulo") return { kind: "bloqueado", via: { vehicle: "modulo", spot: "acople" }, why: `Acopla el módulo para llegar a ${name[place.vehicle]}: consola de acople` };
  if (where.crew === "nodriza") return { kind: "bloqueado", via: { vehicle: "nodriza", spot: "puente", page: "nav" }, why: `${cap(name[place.vehicle])} no está acoplada a la nodriza: programa un viaje en el mapa del puente` };
  return { kind: "bloqueado", via: { vehicle: "estacion", spot: "pantalla", tab: "hangar" }, why: `${cap(name[place.vehicle])} no está atracada aquí` };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
