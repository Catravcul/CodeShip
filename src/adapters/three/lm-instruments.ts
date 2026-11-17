import * as THREE from "three";

/**
 * What the LM's flight instruments show (docs/design/cabina-lm.md, «Instrumentos»): the same numbers as the
 * flight HUD, on the instruments that showed them in the LM.
 */
export interface LmReading {
  /** ALT tape: gap between the legs and the ground, m. */
  readonly altitudeM: number;
  /** ALT RATE tape: positive climbing, m/s. */
  readonly altRateMs: number;
  /** X-pointer: forward and lateral (to the right) velocity over the ground, m/s. */
  readonly forwardMs: number;
  readonly lateralMs: number;
  /** FDAI: local up (away from the body) in the craft's frame (x right, y up, −z forward). */
  readonly upBody: { readonly x: number; readonly y: number; readonly z: number };
  /** Main propulsion quantity, 0–1. */
  readonly propellant: number;
  /** THRUST indicator, 0–1. */
  readonly thrust: number;
  /** MISSION TIMER, s. */
  readonly missionS: number;
  /** DSKY PROG (64: landing approach; 0: idle, «P00»). */
  readonly program: number;
  /** Caution and warning lights on (names of the panels' lights). */
  readonly warnings: readonly string[];
  /** Landed and anchored: LUNAR CONTACT light. */
  readonly contact: boolean;
}

const pad = (n: number, w: number) => String(Math.trunc(Math.abs(n))).padStart(w, "0");
const signed = (n: number) => `${n < 0 ? "−" : "+"}${pad(Math.round(Math.abs(n) * 10), 5)}`;

/** A canvas texture of `w × h` px drawn by `draw`. */
function canvasFace(w: number, h: number): { tex: THREE.CanvasTexture; g: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, g };
}

/** The 8-ball's skin: white sky, black ground, the horizon and pitch lines every 30°. */
function ballTexture(): THREE.CanvasTexture {
  const { tex, g } = canvasFace(256, 128);
  g.fillStyle = "#e9e9e4";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#1b1b1b";
  g.fillRect(0, 64, 256, 64);
  g.strokeStyle = "#ff8a2a";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 64);
  g.lineTo(256, 64);
  g.stroke();
  g.lineWidth = 1;
  for (const y of [21, 43, 85, 107]) {
    g.strokeStyle = y < 64 ? "#555" : "#bbb";
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  for (let x = 0; x < 256; x += 32) {
    g.strokeStyle = "#888";
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 128);
    g.stroke();
  }
  tex.needsUpdate = true;
  return tex;
}

export interface LmPanelFaces {
  /** Panel 1's face (the commander's flight instruments). */
  readonly p1: THREE.Mesh;
  /** Panel 2's face (the pilot's). */
  readonly p2: THREE.Mesh;
  /** Panel 4's DSKY. */
  readonly dsky: THREE.Mesh;
  /** Panel 5's mission timer. */
  readonly p5: THREE.Mesh;
  /** The FDAI balls (commander's and pilot's), turned with the attitude. */
  readonly balls: readonly THREE.Mesh[];
}

/**
 * The live instruments of the LM's panels (docs/design/cabina-lm.md): the FDAI balls turn with the attitude
 * and the panels' faces are redrawn a few times a second from the flight readings.
 */
export class LmInstruments {
  private readonly p1 = canvasFace(360, 440);
  private readonly p2 = canvasFace(360, 440);
  private readonly dsky = canvasFace(240, 220);
  private readonly p5 = canvasFace(360, 160);
  private last = -1;
  /** The last reading drawn (for checks). */
  shown: LmReading | undefined;

  constructor(private readonly faces: LmPanelFaces) {
    for (const [m, f] of [
      [faces.p1, this.p1],
      [faces.p2, this.p2],
      [faces.dsky, this.dsky],
      [faces.p5, this.p5],
    ] as const)
      m.material = new THREE.MeshBasicMaterial({ map: f.tex });
    const skin = ballTexture();
    for (const b of faces.balls) b.material = new THREE.MeshBasicMaterial({ map: skin });
    this.draw(IDLE);
  }

  /** The FDAI balls follow every frame; the faces are redrawn at 5 Hz. */
  update(r: LmReading, nowS: number): void {
    const up = new THREE.Vector3(r.upBody.x, r.upBody.y, r.upBody.z).normalize();
    // The ball's sky pole (its +y) points to local up, seen in the craft's frame.
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    for (const b of this.faces.balls) b.quaternion.copy(q);
    if (nowS - this.last < 0.2) return;
    this.last = nowS;
    this.draw(r);
  }

  private draw(r: LmReading): void {
    this.shown = r;
    this.flightPanel(this.p1.g, r, "1", "#ff4a3a");
    this.flightPanel(this.p2.g, r, "2", "#ffb347");
    this.drawDsky(r);
    this.drawTimer(r);
    for (const f of [this.p1, this.p2, this.dsky, this.p5]) f.tex.needsUpdate = true;
  }

  /** Panels 1 and 2: the FDAI's bezel (the ball is 3D in its hole), X-pointer, tapes, gauges and the lights. */
  private flightPanel(g: CanvasRenderingContext2D, r: LmReading, id: string, cw: string): void {
    g.fillStyle = "#2b2f33";
    g.fillRect(0, 0, 360, 440);
    g.fillStyle = "#c9ccce";
    g.font = "bold 13px monospace";
    g.fillText(`PANEL ${id}`, 10, 18);
    // FDAI bezel (the ball sits in the hole, drawn in 3D).
    g.fillStyle = "#101214";
    g.beginPath();
    g.arc(110, 140, 82, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c9ccce";
    g.font = "11px monospace";
    g.fillText("FDAI", 96, 238);
    // X-pointer: forward velocity vertical, lateral horizontal; scale ±2 m/s (×10 above it).
    const big = Math.max(Math.abs(r.forwardMs), Math.abs(r.lateralMs)) > 2;
    const sc = big ? 20 : 2;
    const cx = 290, cy = 80, R = 54;
    g.fillStyle = "#08090a";
    g.fillRect(cx - R - 6, cy - R - 6, 2 * R + 12, 2 * R + 12);
    g.strokeStyle = "#555";
    g.strokeRect(cx - R, cy - R, 2 * R, 2 * R);
    g.strokeStyle = "#f2f2f2";
    g.lineWidth = 3;
    const lx = cx + Math.max(-1, Math.min(1, r.lateralMs / sc)) * R;
    const fy = cy - Math.max(-1, Math.min(1, r.forwardMs / sc)) * R;
    g.beginPath();
    g.moveTo(lx, cy - R);
    g.lineTo(lx, cy + R);
    g.moveTo(cx - R, fy);
    g.lineTo(cx + R, fy);
    g.stroke();
    g.lineWidth = 1;
    g.fillStyle = "#c9ccce";
    g.fillText(`X-POINTER ${big ? "×10" : "×1"}`, cx - 52, cy + R + 20);
    // ALT and ALT RATE tapes.
    const tape = (x: number, label: string, text: string) => {
      g.fillStyle = "#08090a";
      g.fillRect(x, 170, 44, 140);
      g.fillStyle = "#e9e9e4";
      g.fillRect(x + 4, 230, 36, 22);
      g.fillStyle = "#111";
      g.font = "bold 12px monospace";
      g.fillText(text, x + 6, 246);
      g.fillStyle = "#c9ccce";
      g.font = "10px monospace";
      g.fillText(label, x, 324);
    };
    tape(236, "ALT", `${Math.min(9999, Math.round(r.altitudeM))}`);
    tape(296, "ALT RT", `${r.altRateMs >= 0 ? "+" : ""}${r.altRateMs.toFixed(1)}`);
    // THRUST and main propulsion quantity: needles on two bars.
    const bar = (x: number, label: string, v: number) => {
      g.fillStyle = "#08090a";
      g.fillRect(x, 270, 26, 110);
      g.fillStyle = "#7dffb0";
      g.fillRect(x + 4, 376 - 104 * Math.max(0, Math.min(1, v)), 18, 3);
      g.fillStyle = "#c9ccce";
      g.font = "10px monospace";
      g.fillText(label, x - 4, 396);
    };
    bar(30, id === "1" ? "THRUST" : "RCS", id === "1" ? r.thrust : r.propellant);
    bar(90, id === "1" ? "PRPLNT" : "QTY", r.propellant);
    // Caution and warning matrix: red on panel 1, amber on panel 2; lit when it says so.
    for (let i = 0; i < 12; i++) {
      const on = (id === "1" && i < r.warnings.length) || (id === "2" && i === 0 && r.warnings.length > 0);
      g.fillStyle = on ? cw : "#3a3d40";
      g.fillRect(140 + (i % 4) * 22, 270 + Math.floor(i / 4) * 18, 18, 12);
    }
    g.fillStyle = r.contact ? "#7fd0ff" : "#3a3d40";
    g.fillRect(140, 330, 84, 16);
    g.fillStyle = "#111";
    g.font = "bold 10px monospace";
    g.fillText("LUNAR CONTACT", 142, 342);
    g.fillStyle = r.warnings.length ? "#ff4a3a" : "#5a2a28";
    g.fillRect(10, 410, 110, 22);
    g.fillStyle = "#fff";
    g.fillText("MASTER ALARM", 16, 425);
  }

  /** Panel 4: the DSKY with Verb 16 Noun 60 (forward velocity, altitude rate, altitude), as in the LM's landing. */
  private drawDsky(r: LmReading): void {
    const g = this.dsky.g;
    g.fillStyle = "#3c3f42";
    g.fillRect(0, 0, 240, 220);
    g.fillStyle = "#050806";
    g.fillRect(12, 12, 216, 120);
    g.fillStyle = "#58ff7a";
    g.font = "bold 13px monospace";
    g.fillText("PROG", 150, 30);
    g.fillText("VERB", 22, 58);
    g.fillText("NOUN", 150, 58);
    g.font = "bold 22px monospace";
    g.fillText(pad(r.program, 2), 160, 50);
    g.fillText("16", 30, 80);
    g.fillText("60", 160, 80);
    g.font = "bold 16px monospace";
    g.fillText(signed(r.forwardMs), 60, 98);
    g.fillText(signed(r.altRateMs), 60, 114);
    g.fillText(signed(r.altitudeM / 10), 60, 130);
    g.fillStyle = "#2a2c2e";
    for (let i = 0; i < 19; i++) g.fillRect(14 + (i % 7) * 31, 142 + Math.floor(i / 7) * 25, 26, 20);
  }

  /** Panel 5: the mission timer (hours, minutes, seconds). */
  private drawTimer(r: LmReading): void {
    const g = this.p5.g;
    g.fillStyle = "#2b2f33";
    g.fillRect(0, 0, 360, 160);
    g.fillStyle = "#c9ccce";
    g.font = "bold 13px monospace";
    g.fillText("PANEL 5 · MISSION TIMER", 10, 20);
    g.fillStyle = "#050806";
    g.fillRect(14, 34, 220, 46);
    const s = Math.max(0, r.missionS);
    g.fillStyle = "#ff6a4a";
    g.font = "bold 30px monospace";
    g.fillText(`${pad(s / 3600, 3)}:${pad((s / 60) % 60, 2)}:${pad(s % 60, 2)}`, 22, 68);
    g.fillStyle = "#7a1a14";
    g.fillRect(250, 34, 44, 44);
    g.fillStyle = "#1f5a24";
    g.fillRect(300, 34, 44, 44);
    g.fillStyle = "#c9ccce";
    g.font = "10px monospace";
    g.fillText("STOP", 258, 96);
    g.fillText("START", 304, 96);
  }
}

const IDLE: LmReading = { altitudeM: 0, altRateMs: 0, forwardMs: 0, lateralMs: 0, upBody: { x: 0, y: 1, z: 0 }, propellant: 1, thrust: 0, missionS: 0, program: 0, warnings: [], contact: false };

/** The instruments' reading from the flight computer's telemetry and the craft's state (main feeds it each frame). */
export function lmReading(
  t: {
    readonly clearance: number;
    readonly closingSpeed: number;
    readonly relativeVelocityBody: { readonly x: number; readonly z: number };
    readonly upBody: { readonly x: number; readonly y: number; readonly z: number };
    readonly landed: boolean;
    readonly hullIntegrity: number;
    readonly tiltDeg: number;
  },
  o: { readonly propellant: number; readonly thrust: number; readonly missionS: number; readonly landingProgram: boolean },
): LmReading {
  const warnings: string[] = [];
  if (t.hullIntegrity < 0.5) warnings.push("CABIN");
  if (o.propellant < 0.1) warnings.push("DES QTY");
  if (t.clearance < 200 && !t.landed && t.tiltDeg > 30) warnings.push("ISS");
  return {
    altitudeM: Math.max(0, t.clearance),
    altRateMs: -t.closingSpeed,
    forwardMs: -t.relativeVelocityBody.z,
    lateralMs: t.relativeVelocityBody.x,
    upBody: t.upBody,
    propellant: o.propellant,
    thrust: o.thrust,
    missionS: o.missionS,
    program: o.landingProgram ? 64 : 0,
    warnings,
    contact: t.landed,
  };
}
