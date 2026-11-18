import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { CarrierPort } from "@modules/navigation/application/carrier-trip";
import { FreeCarrierRun, portGuidance, type GuidancePort, type PortGuidance } from "@modules/navigation/application/free-carrier";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";

/**
 * The Dragon simulator's docking practice (post 8): the same hand flight as Starship's «Manual» (FreeCarrierRun:
 * Crew Dragon's touchscreen, each tap a fixed step) from 12 m out on a port's axis, a little off it and turned, to
 * contact. At contact the IDSS limits say whether it docks: closing 0,05–0,10 m/s, at most 0,10 m off the axis,
 * 4° and 0,2 °/s. The simulator's Dragon has propellant to spare (it is a simulator).
 */
export interface DockPractice {
  readonly run: FreeCarrierRun;
  readonly port: GuidancePort;
  contact?: DockContact;
}

export interface DockContact {
  readonly ok: boolean;
  /** What was out of its limit («cierre 0,20 m/s», «0,14 m fuera del eje»), if anything. */
  readonly out: readonly string[];
}

/** From the craft's centre to its docking ring's face, m (Crew Dragon: about half its 4 m diameter's height; ours). */
const FACE_M = 2;
const n = (v: number, d = 2) => v.toFixed(d).replace(".", ",");

export function dockPractice(): DockPractice {
  let pos = new Vec3(0.35, -0.25, 12 + FACE_M);
  let att = Quat.fromAxisAngle(Vec3.Y, (2 * Math.PI) / 180);
  // Only what the hand flight uses of a carrier: where it is, its turn, its tanks (never empty) and its move.
  const sim = {
    name: "Dragon (simulador)",
    get position() {
      return pos;
    },
    get orientation() {
      return att;
    },
    burn: () => true,
    moveTo: (p: Vec3, q?: Quat) => {
      pos = p;
      if (q) att = q;
    },
  };
  const port: GuidancePort = { name: "IDA (simulador)", position: Vec3.ZERO, normal: new Vec3(0, 0, 1), orientation: Quat.fromAxisAngle(Vec3.X, Math.PI / 2), attitude: Quat.IDENTITY, faceM: FACE_M };
  return { run: new FreeCarrierRun(sim as unknown as CarrierPort), port };
}

export function dockGuidance(p: DockPractice): PortGuidance {
  return portGuidance(p.run.position, p.run.orientation, p.run.velocity, p.port);
}

/** At contact (the ring's face at the port's), the IDSS's verdict. */
export function dockVerdict(g: PortGuidance, rates: { x: number; y: number; z: number }): DockContact {
  const L = IDSS_CONTACT_LIMITS;
  const out: string[] = [];
  if (g.closingMs < L.closingMinMs - 1e-9 || g.closingMs > L.closingMaxMs + 1e-9) out.push(`cierre ${n(g.closingMs)} m/s (${n(L.closingMinMs)}–${n(L.closingMaxMs)})`);
  const off = Math.hypot(g.right, g.up);
  if (off > L.lateralMisalignM + 1e-9) out.push(`${n(off)} m fuera del eje (máx. ${n(L.lateralMisalignM)})`);
  if (Math.abs(g.errDeg.x) > L.angularMisalignDeg || Math.abs(g.errDeg.y) > L.angularMisalignDeg || Math.abs(g.errDeg.z) > L.rollMisalignDeg) out.push(`desalineado más de ${L.angularMisalignDeg}°`);
  if ([rates.x, rates.y, rates.z].some((r) => Math.abs(r) > L.angularRateDegS + 1e-9)) out.push(`girando a más de ${n(L.angularRateDegS, 1)} °/s`);
  return { ok: out.length === 0, out };
}

/** Let `dt` seconds pass; at contact it says how it went (and stops there). */
export function dockTick(p: DockPractice, dt: number): PortGuidance {
  if (!p.contact) p.run.advance(dt);
  const g = dockGuidance(p);
  if (!p.contact && g.rangeM <= 0) {
    p.contact = dockVerdict(g, p.run.ratesDegS);
    p.run.stop();
  }
  return g;
}
