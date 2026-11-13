/**
 * The lander's crew cabin as a small walkable place (docs/design/habitaculo.md): its machines replace
 * HUD buttons. Pure rules: where she can stand, which machine she is at, and what each machine offers
 * given the state of the craft.
 */

/** A point on the cabin floor, m (x to starboard, z aft; the pilot's eye is over x = 0, z = 0). */
export interface FloorPoint {
  readonly x: number;
  readonly z: number;
}

export interface FloorRect {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** The floor she can stand on: a rectangle inside the walls minus what is fixed on it (seats, the hygiene bay). */
export interface CabinFloor extends FloorRect {
  readonly blocked: readonly FloorRect[];
}

export type CabinStationId = "asiento" | "acople" | "mente" | "escotilla" | "esterilla";

export interface CabinStation {
  readonly id: CabinStationId;
  readonly label: string;
  /** Where she stands to use it. */
  readonly stand: FloorPoint;
  /** What she looks at, m above the floor. */
  readonly look: { readonly x: number; readonly y: number; readonly z: number };
  /** One line on what it is, for its sign and the task board. */
  readonly what: string;
}

export interface CabinLayout {
  readonly floor: CabinFloor;
  readonly stations: readonly CabinStation[];
  /** How close she must stand to a machine to use it, m. */
  readonly reachM: number;
  readonly heightM: number;
  readonly habitableM3: number;
}

/** What the cabin's machines need to know about the craft. */
export interface CabinState {
  readonly dockedTo: "nodriza" | "estacion" | null;
  /** Free and close enough to a port for the docking assist. */
  readonly dockInRange: boolean;
  readonly dockAssist: boolean;
  /** Anchored on an asteroid. */
  readonly landed: boolean;
  /** The suit can go out now (anchored, nothing in the way). */
  readonly canLeaveEva: boolean;
  /** The asteroid's mind: the duel the stage allows here, if any (label and whether it can start). */
  readonly mind: { readonly label: string; readonly enabled: boolean; readonly why?: string } | null;
}

export type CabinActionId = "pilotar" | "desacoplar" | "asistente-acople" | "entrar-nodriza" | "entrar-estacion" | "salir-eva" | "mente" | "ajustes";

export interface CabinAction {
  readonly id: CabinActionId;
  readonly label: string;
  readonly enabled: boolean;
  /** Why it cannot be done now. */
  readonly why?: string;
}

const inside = (r: FloorRect, p: FloorPoint) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;

/**
 * Keep a point on the floor: inside the walls and off the fixed furniture. With `prev` (where she was), a
 * blocked step slides along the obstacle like the habitat's walking; without it, the point goes to the
 * nearest edge of the obstacle.
 */
export function clampToFloor(f: CabinFloor, p: FloorPoint, prev?: FloorPoint): FloorPoint {
  const clamp = (q: FloorPoint) => ({ x: Math.min(f.maxX, Math.max(f.minX, q.x)), z: Math.min(f.maxZ, Math.max(f.minZ, q.z)) });
  const free = (q: FloorPoint) => !f.blocked.some((b) => inside(b, q));
  const q = clamp(p);
  if (free(q)) return q;
  if (prev) {
    const a = clamp({ x: q.x, z: prev.z });
    if (free(a)) return a;
    const b = clamp({ x: prev.x, z: q.z });
    if (free(b)) return b;
    if (free(prev)) return clamp(prev);
  }
  const b = f.blocked.find((r) => inside(r, q))!;
  const exits = [
    { x: b.minX - 1e-3, z: q.z },
    { x: b.maxX + 1e-3, z: q.z },
    { x: q.x, z: b.minZ - 1e-3 },
    { x: q.x, z: b.maxZ + 1e-3 },
  ]
    .map(clamp)
    .filter(free)
    .sort((m, n) => Math.hypot(m.x - q.x, m.z - q.z) - Math.hypot(n.x - q.x, n.z - q.z));
  return exits[0] ?? q;
}

/** The machine she is standing at, if any (the nearest within reach). */
export function nearestStation(layout: CabinLayout, p: FloorPoint): CabinStation | undefined {
  let best: CabinStation | undefined;
  let bestD = layout.reachM;
  for (const s of layout.stations) {
    const d = Math.hypot(s.stand.x - p.x, s.stand.z - p.z);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** What a machine offers now. The first action is the main one. */
export function cabinActions(id: CabinStationId, s: CabinState): CabinAction[] {
  switch (id) {
    case "asiento":
      return [{ id: "pilotar", label: "Sentarse a pilotar", enabled: true }];
    case "esterilla":
      return [{ id: "ajustes", label: "Sentarse en loto: ajustes", enabled: true }];
    case "escotilla":
      return [
        s.canLeaveEva
          ? { id: "salir-eva", label: "Ponerse el traje y salir", enabled: true }
          : { id: "salir-eva", label: "Ponerse el traje y salir", enabled: false, why: s.landed ? "Ahora no se puede despresurizar la cabina" : "Solo con el módulo anclado en un asteroide" },
      ];
    case "mente":
      if (!s.mind) return [{ id: "mente", label: "Entrar en su mente", enabled: false, why: s.landed ? "Este asteroide no tiene nada que hablar ahora" : "Posa el módulo sobre el asteroide para conectar con su mente" }];
      return [{ id: "mente", label: s.mind.label, enabled: s.mind.enabled, ...(s.mind.why ? { why: s.mind.why } : {}) }];
    case "acople":
      if (s.dockedTo === "nodriza") return [{ id: "entrar-nodriza", label: "Entrar en la nave de viaje", enabled: true }, { id: "desacoplar", label: "Desacoplar", enabled: true }];
      if (s.dockedTo === "estacion") return [{ id: "entrar-estacion", label: "Entrar en la estación", enabled: true }, { id: "desacoplar", label: "Desacoplar", enabled: true }];
      if (s.dockInRange) return [{ id: "asistente-acople", label: s.dockAssist ? "Apagar el asistente de acople" : "Asistente de acople", enabled: true }];
      return [{ id: "asistente-acople", label: "Asistente de acople", enabled: false, why: "Acércate a menos de 3 km de un puerto (nodriza o estación)" }];
  }
}
