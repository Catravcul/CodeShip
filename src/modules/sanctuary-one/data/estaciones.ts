/**
 * WHERE SHE IS ON EACH MACHINE (Berón 2026-11-20: «he ido al gimnasio y he visto animaciones que no encajaban con las
 * máquinas»): until now every exercise was played standing 0,9 m in front of the machine, so the seated motions sat in
 * the air beside the seat and the lying ones floated by the bench. Each machine's station is the point under her pelvis
 * while she works on it (in the model's own frame: x across, z along, front towards −z, as gimnasio-detalle.ts draws
 * them), the way she faces (`face`, rad: 0 = towards the front, −z; π = towards the back) and the height her feet's
 * origin is lifted (`y`: the treadmill's belt, the step machine's step, a high saddle). Measured on each model's parts.
 */
export interface Station {
  readonly x: number;
  readonly z: number;
  readonly face?: number;
  readonly y?: number;
}

const PI = Math.PI;

export const STATIONS: Readonly<Record<string, Station>> = {
  // Weight-stack machines: seated on the pad, back to the back pad, facing the front.
  "gym-jalon": { x: 0, z: -0.2 },
  "gym-press-pecho": { x: 0, z: -0.08 },
  "gym-press-hombros": { x: 0, z: -0.12 },
  "gym-remo": { x: 0, z: 0.02 },
  "gym-prensa": { x: 0, z: 0.4 },
  "gym-extension": { x: 0, z: 0.04, y: 0.06 },
  // Lying face down, head at the grips (+z), ankles under the roller.
  "gym-curl-femoral": { x: 0, z: 0.1, face: PI },
  "gym-hip-thrust": { x: 0, z: -0.12 },
  "gym-gemelos": { x: 0, z: 0.15 },
  "gym-curl-biceps": { x: 0, z: 0.25, y: 0.02 },
  // Free weights: under the bar in the rack and the Smith, lying on the benches (head under the bar), on the platform.
  "gym-jaula": { x: 0, z: -0.35 },
  "gym-smith": { x: 0, z: 0.05 },
  "gym-press-banca": { x: 0, z: 0.05 },
  "gym-press-inclinado": { x: 0, z: -0.2 },
  "gym-banco-fid": { x: 0, z: -0.05, y: 0.04 },
  "gym-plataforma": { x: 0, z: 0.15 },
  // Cardio: on the belt, the pedals, the saddle, the rower's seat, the step.
  "gym-cinta": { x: 0, z: 0.05, y: 0.04 },
  "gym-eliptica": { x: 0, z: 0.05, y: 0.27 },
  "gym-escaladora": { x: 0, z: 0.05, y: 0.54 },
  "gym-bici": { x: 0, z: 0.15, y: 0.45 },
  "gym-bici-reclinada": { x: 0, z: 0.38 },
  "gym-assault-bike": { x: 0, z: 0.2, y: 0.35 },
  "gym-remo-ergometro": { x: 0, z: 0.3, y: 0.08 },
  "gym-skierg": { x: 0, z: 0.3, y: 0.06 },
  // Core: on the mat, hanging on the captain's chair, on the decline and hyperextension benches.
  "gym-esterilla": { x: 0, z: 0.25, y: 0.02 },
  "gym-silla-romana": { x: 0, z: 0.25, y: 0.12 },
  "gym-banco-declinado": { x: 0, z: 0.1, face: PI },
  "gym-hiperextensiones": { x: 0, z: 0.0 },
  "cf-ghd": { x: 0, z: 0.15 },
  // Hitting: in front of a bag, facing it.
  "gym-portico-sacos": { x: -1.5, z: -0.6, face: PI },
  "dojo-sacos": { x: 0.6, z: 0, face: -PI / 2 },
  "dojo-makiwara": { x: 0, z: -0.7, face: PI },
  // Bodyweight: under the lowest bar, between the bars, under the rungs; leaning back under the rings and the low bar.
  "cal-dominadas": { x: -1.2, z: 0 },
  "gym-espalderas-3": { x: 0, z: -0.18, y: 0.12 },
  "cal-monkey-bars": { x: -1.4, z: 0, y: 0.3 },
  "cal-anillas": { x: -0.75, z: -0.45 },
  "cal-paralelas": { x: 0, z: 0, face: PI / 2 },
  "cal-fondos-v": { x: 0, z: -0.05 },
  "cal-barras-bajas": { x: -0.6, z: -0.45 },
  "cf-rig": { x: 0, z: -4 },
  "pk-lache": { x: 0, z: 0, face: PI / 2 },
  // Ballet: side-on to the barre (left hand on it), by the mirror wall.
  "ballet-espejo-barras": { x: 0, z: 3.7, face: PI / 2 },
};

/** What a challenge is done at: its base, height, model and turn (and plan scale, for the station's offsets). */
export interface RetoAt {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sy: number;
  readonly modelId?: string;
  readonly rot?: number;
  readonly plan?: number;
}

/**
 * The station in the world (the model turned by `rot` about +y, as three.js turns it): her feet's spot, the way she
 * faces (yaw of the figure, which faces +z unturned) and where she stands to get on (0,8 m to her right of it).
 */
export function stationWorld(s: Station, at: Pick<RetoAt, "x" | "z" | "rot" | "plan">): { x: number; z: number; yaw: number; getOn: { x: number; z: number } } {
  const r = at.rot ?? 0;
  const k = at.plan ?? 1;
  const turn = (lx: number, lz: number) => ({ x: at.x + (lx * Math.cos(r) + lz * Math.sin(r)) * k, z: at.z + (-lx * Math.sin(r) + lz * Math.cos(r)) * k });
  const p = turn(s.x, s.z);
  const face = s.face ?? 0;
  // Facing −z turned by `face` (direction (−sin, −cos)): her right is (cos, −sin); she gets on from that side.
  const side = turn(s.x + 0.8 * Math.cos(face), s.z - 0.8 * Math.sin(face));
  return { ...p, yaw: r + PI + face, getOn: side };
}
