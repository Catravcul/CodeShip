import { Vec3 } from "@core/math/vec3";
import { FACE_NORMAL, type Face, type Fixture, type InteriorVolume } from "../domain/interior";

/**
 * Walk-in compartments off an aisle (docs/design/compartimentos.md): the ISS crew quarters in Harmony's rack
 * bays, the Cupola and the Bishop. Every real compartment is a room she floats into; its opening is a
 * doorway («escotilla» volume, so she hops through it) with no door to tap: doors only give passage, and
 * the ones of these rooms are open (a crew quarter's folding door, the Cupola's and the Bishop's CBM).
 */
export const COMPARTMENT_SOURCES = {
  crewQuarters:
    "NASA, ISS Crew Quarters (Broyan, Borrego y Bahr, 2008): cuatro camarotes en Harmony, uno en cada cara (cubierta, techo, babor y estribor) de un hueco de bastidor; 2,1 m³ dentro cada uno, saco de dormir sujeto a la pared, luz regulable, portátil y ventilación propia (el CO₂ se acumula sin ella): https://ntrs.nasa.gov/citations/20080013462",
  referenceGuide: "NASA, Reference Guide to the International Space Station (NP-2015-05-022-JSC): módulo a módulo, sus bastidores y sus puertos: https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf",
  rws: "Cupola: puesto robótico (Robotics Work Station, RWS) con los dos mandos de Canadarm2, portátiles y las imágenes de las cámaras de fuera; hay otro RWS en Destiny: https://en.wikipedia.org/wiki/Cupola_(ISS_module)",
  sleep: "NASA, dormir en la ISS: saco sujeto a la pared del camarote, cremallera hasta el pecho, luz apagada y ventilador en marcha; despertar hacia las 06:00 GMT: https://www.nasa.gov/image-article/sleeping-space/",
} as const;

/** A crew quarter inside, m: a rack bay 1,05 m wide and 2 m tall, 1 m deep, 2,1 m³ (NASA: 2,1 m³; depth derived). */
export const CREW_QUARTER = { widthM: 1.05, heightM: 2.0, depthM: 1.0, doorWidthM: 0.8, doorHeightM: 1.8 } as const;

/** Doménica's own crew quarter (the others are free: she starts alone). Same id at the station and in Starship. */
export const OWN_BUNK = "saco-1";

export const crewQuarterVolumeM3 = (): number => CREW_QUARTER.widthM * CREW_QUARTER.heightM * CREW_QUARTER.depthM;

type Axis = "x" | "y" | "z";
const axisOfFace = (f: Face): Axis => (f === "babor" || f === "estribor" ? "x" : f === "suelo" || f === "techo" ? "y" : "z");
const set = (v: Vec3, k: Axis, value: number) => new Vec3(k === "x" ? value : v.x, k === "y" ? value : v.y, k === "z" ? value : v.z);

/**
 * A compartment that opens off `aisle`'s `face`, centred at `along` on the aisle's long axis: `size` is
 * (width along the aisle, height across it, depth out from the wall). On the overhead or the deck the
 * height runs across the aisle (like a rack there). Returns its room and the doorway into it.
 */
export function wallCompartment(o: {
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly aisle: InteriorVolume;
  readonly face: Face;
  readonly along: number;
  readonly size: { readonly w: number; readonly h: number; readonly d: number };
  readonly door: { readonly w: number; readonly h: number };
  readonly basis: string;
  readonly source: string;
}): { room: InteriorVolume; doorway: InteriorVolume } {
  const a = o.aisle;
  const out = axisOfFace(o.face);
  const sign = Math.sign(FACE_NORMAL[o.face][out]) || 1; // outward from the aisle
  let run: Axis = a.half.x > a.half.z ? "x" : "z";
  // On an end bulkhead (the Bishop on Tranquility's end) its width runs across the aisle.
  if (run === out) run = out === "x" ? "z" : "x";
  const cross: Axis = (["x", "y", "z"] as const).find((k) => k !== out && k !== run)!;
  const wall = a.centre[out] + sign * a.half[out];
  let centre = set(set(a.centre, run, o.along), out, wall + (sign * o.size.d) / 2);
  centre = set(centre, cross, a.centre[cross]);
  const half = set(set(set(Vec3.ZERO, run, o.size.w / 2), out, o.size.d / 2), cross, o.size.h / 2);
  const room: InteriorVolume = { id: o.id, code: o.code, label: o.label, kind: "compartimento", centre, half, pressurised: true, basis: o.basis, source: o.source };
  // The doorway: through the wall, 0,3 m into the aisle and 0,3 m into the room (so a floating body passes).
  const dc = set(centre, out, wall);
  const dh = set(set(set(Vec3.ZERO, run, o.door.w / 2), out, 0.3), cross, o.door.h / 2);
  const doorway: InteriorVolume = { id: `paso-${o.id}`, code: "PASO", label: `Paso a ${o.label}`, kind: "escotilla", centre: dc, half: dh, through: out, pressurised: true, basis: `Abertura de ${o.label}: sin puerta que tocar, se entra flotando`, source: o.source };
  return { room, doorway };
}

/** A fixture on a compartment's back wall (opposite its doorway), centred: `size` as (w, h, d) like the room's. */
export function backWallFixture(room: InteriorVolume, face: Face, f: Omit<Fixture, "volume" | "face" | "at" | "size"> & { size: { w: number; h: number; d: number } }): Fixture {
  const out = axisOfFace(face);
  const sign = Math.sign(FACE_NORMAL[face][out]) || 1; // outward from the aisle
  const at = set(room.centre, out, room.centre[out] + sign * room.half[out]);
  const run: Axis = out === "x" ? "z" : out === "z" ? "x" : room.half.x > room.half.z ? "x" : "z";
  const cross: Axis = (["x", "y", "z"] as const).find((k) => k !== out && k !== run)!;
  const size = set(set(set(Vec3.ZERO, run, f.size.w), cross, f.size.h), out, f.size.d);
  return { ...f, volume: room.id, face, at, size };
}
