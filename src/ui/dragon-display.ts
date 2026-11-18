import type { FreeCarrierRun, PortGuidance } from "@modules/navigation/application/free-carrier";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";
import { MANUAL_BERTH, PROXIMITY } from "@modules/mothership/application/berthing";
import type { RcsCell, RcsRead } from "./rcs-pad";

const n = (v: number, d: number) => `${v < -0.5 * 10 ** -d ? "−" : "+"}${Math.abs(v).toFixed(d).replace(".", ",")}`;
const L = IDSS_CONTACT_LIMITS;
/** Per-axis body rate inside the IDSS contact limit (0,2 °/s), the green of Dragon's display. */
const rateCell = (v: number): RcsCell => ({ text: n(v, 1), ok: Math.abs(v) <= L.angularRateDegS + 1e-9 });

/**
 * Starship's «Manual» display on Crew Dragon's (Berón, 2026-11-18: «¿cómo sabían qué botón tocar?»): in free flight
 * the attitude and the rate on each axis; near a station's port, the attitude error against its axis, the range
 * and the range rate, and the offset across the axis. Each value is green with ✓ inside its limit and amber with ▲
 * out of it (reglas.md §5.6). The limits are the IDSS contact conditions (0,2 °/s, 4°, 0,10 m, 0,05–0,10 m/s at
 * contact); farther than Waypoint 2 the closing rate only has to be under the hand approach's top (0,5 m/s).
 */
export function dragonRead(m: FreeCarrierRun, g: PortGuidance | undefined, title: string): RcsRead {
  const r = m.ratesDegS;
  const v = m.velocityBody;
  const rows = g
    ? [
        { label: "Error", cells: [g.errDeg.x, g.errDeg.y, g.errDeg.z].map((e, i): RcsCell => ({ text: `${n(e, 1)}°`, ok: Math.abs(e) <= (i === 2 ? L.rollMisalignDeg : L.angularMisalignDeg) })) },
        { label: "°/s", cells: [rateCell(r.x), rateCell(r.y), rateCell(r.z)] },
      ]
    : [
        { label: "Actitud", cells: [m.attitude.pitch, m.attitude.yaw, m.attitude.roll].map((a): RcsCell => ({ text: `${n(a, 1)}°` })) },
        { label: "°/s", cells: [rateCell(r.x), rateCell(r.y), rateCell(r.z)] },
      ];
  const near = g && g.rangeM <= PROXIMITY.waypoint2M;
  const closingOk = g ? (near ? g.closingMs >= L.closingMinMs - 1e-9 && g.closingMs <= L.closingMaxMs + 1e-9 : g.closingMs >= -1e-9 && g.closingMs <= MANUAL_BERTH.closingMaxMs + 1e-9) : true;
  const off = g ? Math.hypot(g.right, g.up) : 0;
  return {
    title,
    head: ["cab.", "guiñ.", "alab."],
    rows,
    lines: [
      `Vel. adel. ${n(-v.z, 2)} · arr. ${n(v.y, 2)} · der. ${n(v.x, 2)} m/s`,
      ...(g
        ? [
            { label: `${g.name}:`, cells: [{ text: `${g.rangeM < 100 ? n(g.rangeM, 1).slice(1) : Math.round(g.rangeM)} m` }, { text: `cierre ${n(g.closingMs, 2)} m/s`, ok: closingOk }, { text: `fuera del eje ${off.toFixed(2).replace(".", ",")} m`, ok: off <= L.lateralMisalignM + 1e-9 }] },
          ]
        : []),
      `Δv gastado ${m.spentMs.toFixed(2).replace(".", ",")} m/s`,
    ],
  };
}

/**
 * The centreline docking camera (Dragon's, on the same screen as the controls): the port's plate and its cross
 * seen along the axis, growing as the range closes; the cross moves off the green centre box with the offset
 * across the axis and with the attitude error (yaw sideways, pitch up and down).
 */
export function drawDockCamera(c: CanvasRenderingContext2D, w: number, h: number, g: PortGuidance): void {
  c.fillStyle = "#04080c";
  c.fillRect(0, 0, w, h);
  // A 30° camera: focal length in px for its half-width.
  const f = w / 2 / Math.tan((15 * Math.PI) / 180);
  const R = Math.max(0.6, g.rangeM + 1);
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const cx = w / 2 + f * (g.right / R) - f * Math.tan(rad(g.errDeg.y));
  const cy = h / 2 - f * (g.up / R) - f * Math.tan(rad(g.errDeg.x));
  const disc = (m: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(cx, cy, Math.min(400, (m * f) / R), 0, Math.PI * 2);
    c.fill();
  };
  disc(2.2, "#c9ccc6");
  disc(0.8, "#3a414b");
  // The target's cross, turned by the roll error.
  const arm = Math.max(6, Math.min(80, (0.25 * f) / R));
  const a = rad(g.errDeg.z);
  c.strokeStyle = "#ffffff";
  c.lineWidth = 2;
  c.beginPath();
  for (const t of [a, a + Math.PI / 2]) {
    c.moveTo(cx - arm * Math.cos(t), cy - arm * Math.sin(t));
    c.lineTo(cx + arm * Math.cos(t), cy + arm * Math.sin(t));
  }
  c.stroke();
  // The camera's fixed reticle: the centre box and its ticks.
  c.strokeStyle = "#37e07a";
  c.lineWidth = 1.5;
  c.strokeRect(w / 2 - 9, h / 2 - 9, 18, 18);
  c.beginPath();
  c.moveTo(w / 2 - 22, h / 2);
  c.lineTo(w / 2 - 12, h / 2);
  c.moveTo(w / 2 + 12, h / 2);
  c.lineTo(w / 2 + 22, h / 2);
  c.moveTo(w / 2, h / 2 - 22);
  c.lineTo(w / 2, h / 2 - 12);
  c.moveTo(w / 2, h / 2 + 12);
  c.lineTo(w / 2, h / 2 + 22);
  c.stroke();
  c.font = "bold 11px monospace";
  c.fillStyle = "#7fdcff";
  c.fillText(`${g.rangeM < 100 ? g.rangeM.toFixed(1).replace(".", ",") : Math.round(g.rangeM)} m`, 5, 13);
  c.fillText(`${n(g.closingMs, 2)} m/s`, 5, h - 5);
}
