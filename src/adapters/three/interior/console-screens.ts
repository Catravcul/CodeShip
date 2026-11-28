/**
 * What each bridge screen shows, painted on its cell of the room's atlas (docs/design/puente.md §Pantallas):
 * a title bar and the shape of its page (the plot table's trajectory display, the thrusters' grid, the
 * probe's camera…), plus the page's lines (its alerts, the mind's phase). Text sizes are chosen for the
 * phone: see docs/design/escala.md.
 */
export type ScreenKind = "plot" | "prop" | "attitude" | "power" | "life" | "dock" | "comms" | "nano" | "probeCam" | "probeMap" | "mind" | "hatch" | "systems";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Font sizes in atlas pixels (a cell is 320 px tall): the scale study measures these on screen. */
export const SCREEN_FONT_PX = { title: 30, body: 22 } as const;

const C = { bg: "#06111d", grid: "#14324a", line: "#7fdcff", text: "#c6f0ff", ok: "#37e07a", warn: "#ffb347", red: "#ff3b30", dim: "#4c7590", title: "#0d2236" };

export function paintScreen(x: CanvasRenderingContext2D, r: Rect, kind: ScreenKind, title: string, lines: readonly string[]): void {
  x.save();
  x.beginPath();
  x.rect(r.x, r.y, r.w, r.h);
  x.clip();
  x.fillStyle = C.bg;
  x.fillRect(r.x, r.y, r.w, r.h);
  // Title bar, like an FCR display's header.
  x.fillStyle = C.title;
  x.fillRect(r.x, r.y, r.w, 46);
  x.fillStyle = C.line;
  x.font = `bold ${SCREEN_FONT_PX.title}px monospace`;
  x.fillText(title, r.x + 16, r.y + 34);
  const body = { x: r.x + 12, y: r.y + 56, w: r.w - 24, h: r.h - 68 };
  PAINT[kind](x, body);
  // The page's lines (alerts, phase) at the bottom.
  x.font = `${SCREEN_FONT_PX.body}px monospace`;
  lines.slice(0, 3).forEach((l, i) => {
    const warn = l.startsWith("!");
    const good = l.startsWith("+");
    x.fillStyle = warn ? C.warn : good ? C.ok : C.text;
    x.fillText(warn || good ? l.slice(1) : l, r.x + 16, r.y + r.h - 16 - (Math.min(3, lines.length) - 1 - i) * 28);
  });
  x.restore();
}

const grid = (x: CanvasRenderingContext2D, b: Rect, step: number) => {
  x.strokeStyle = C.grid;
  x.lineWidth = 1;
  for (let i = b.x; i <= b.x + b.w; i += step) {
    x.beginPath();
    x.moveTo(i, b.y);
    x.lineTo(i, b.y + b.h);
    x.stroke();
  }
  for (let j = b.y; j <= b.y + b.h; j += step) {
    x.beginPath();
    x.moveTo(b.x, j);
    x.lineTo(b.x + b.w, j);
    x.stroke();
  }
};

const bar = (x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, f: number, label: string, color = C.ok) => {
  x.strokeStyle = C.dim;
  x.strokeRect(px, py, w, h);
  x.fillStyle = color;
  x.fillRect(px + 2, py + 2, (w - 4) * Math.max(0, Math.min(1, f)), h - 4);
  x.fillStyle = C.text;
  x.font = `${SCREEN_FONT_PX.body}px monospace`;
  x.fillText(label, px, py - 6);
};

const PAINT: Record<ScreenKind, (x: CanvasRenderingContext2D, b: Rect) => void> = {
  // The plot table: a heliocentric trajectory plot (Mercury to Mars at their real radii in AU, a transfer arc, the ship) with a ground-track strip, like an FDO's plots and the MOCR's sine-wave track.
  plot(x, b) {
    grid(x, b, 40);
    const cx = b.x + b.w * 0.38;
    const cy = b.y + b.h * 0.45;
    const au = Math.min(b.w, b.h) * 0.24;
    x.fillStyle = "#ffd36b";
    x.beginPath();
    x.arc(cx, cy, 8, 0, Math.PI * 2);
    x.fill();
    for (const [a, col] of [
      [0.387, "#8a8f98"],
      [0.723, "#e9c27a"],
      [1.0, "#5fa8ff"],
      [1.524, "#e0704a"],
    ] as const) {
      x.strokeStyle = col;
      x.lineWidth = 2;
      x.beginPath();
      x.arc(cx, cy, a * au, 0, Math.PI * 2);
      x.stroke();
    }
    // A transfer arc from Earth outwards (dashed, illustrative), the ship on it; the real one is on the NAV page.
    x.strokeStyle = C.ok;
    x.setLineDash([10, 8]);
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(cx + 0.05 * au, cy, 1.07 * au, 1.03 * au, 0, Math.PI * 0.15, Math.PI * 0.95);
    x.stroke();
    x.setLineDash([]);
    x.fillStyle = C.ok;
    x.beginPath();
    x.arc(cx + Math.cos(Math.PI * 0.5) * 1.07 * au, cy + Math.sin(Math.PI * 0.5) * 1.03 * au, 7, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    x.fillText("Sol · Mercurio–Marte (UA)", b.x + 8, b.y + 26);
    // Ground track strip: a Mercator box with a sine track.
    const g = { x: b.x + b.w * 0.7, y: b.y + 40, w: b.w * 0.28, h: b.h * 0.45 };
    x.strokeStyle = C.dim;
    x.strokeRect(g.x, g.y, g.w, g.h);
    x.strokeStyle = C.line;
    x.lineWidth = 2;
    x.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const yy = g.y + g.h / 2 - Math.sin(t * Math.PI * 4) * g.h * 0.35;
      if (i) x.lineTo(g.x + t * g.w, yy);
      else x.moveTo(g.x, yy);
    }
    x.stroke();
  },
  prop(x, b) {
    // The 18 thrusters as a 6 × 3 grid, xenon and Δv left.
    const s = Math.min((b.w * 0.55) / 6, (b.h * 0.55) / 3);
    for (let i = 0; i < 18; i++) {
      x.fillStyle = i === 7 ? C.warn : C.ok;
      x.fillRect(b.x + (i % 6) * s + 4, b.y + Math.floor(i / 6) * s + 4, s - 8, s - 8);
    }
    bar(x, b.x + b.w * 0.62, b.y + 34, b.w * 0.36, 22, 0.72, "Xenón");
    bar(x, b.x + b.w * 0.62, b.y + 96, b.w * 0.36, 22, 0.55, "Δv", C.line);
  },
  attitude(x, b) {
    // An attitude ball and rate tapes (Orion-style primary flight display).
    const cx = b.x + b.w * 0.35;
    const cy = b.y + b.h * 0.42;
    const r = Math.min(b.w, b.h) * 0.36;
    x.fillStyle = "#1d4f7a";
    x.beginPath();
    x.arc(cx, cy, r, Math.PI, 0);
    x.fill();
    x.fillStyle = "#5a3a1e";
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI);
    x.fill();
    x.strokeStyle = C.warn;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(cx - r * 0.6, cy);
    x.lineTo(cx + r * 0.6, cy);
    x.stroke();
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    ["Alabeo", "Cabeceo", "Guiñada"].forEach((t, i) => x.fillText(t, b.x + b.w * 0.68, b.y + 30 + i * 32));
  },
  power(x, b) {
    bar(x, b.x + 4, b.y + 34, b.w * 0.45, 22, 0.86, "Baterías");
    bar(x, b.x + 4, b.y + 96, b.w * 0.45, 22, 0.4, "Radiadores", C.line);
    // Reactor: a ring with its power.
    x.strokeStyle = C.ok;
    x.lineWidth = 8;
    const cx = b.x + b.w * 0.76;
    const cy = b.y + b.h * 0.35;
    x.beginPath();
    x.arc(cx, cy, b.h * 0.25, -Math.PI / 2, Math.PI);
    x.stroke();
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    x.fillText("Reactor", cx - 44, cy + 8);
  },
  life(x, b) {
    bar(x, b.x + 4, b.y + 30, b.w * 0.44, 20, 0.21 / 0.3, "O₂");
    bar(x, b.x + 4, b.y + 84, b.w * 0.44, 20, 0.15, "CO₂", C.line);
    bar(x, b.x + b.w * 0.52, b.y + 30, b.w * 0.44, 20, 0.64, "Agua", C.line);
    bar(x, b.x + b.w * 0.52, b.y + 84, b.w * 0.44, 20, 0.8, "Despensa");
  },
  dock(x, b) {
    // The ports seen from above: the spine and its docking ports.
    x.strokeStyle = C.line;
    x.lineWidth = 3;
    const cy = b.y + b.h * 0.35;
    x.strokeRect(b.x + 20, cy - 14, b.w - 40, 28);
    [0.2, 0.5, 0.8].forEach((f, i) => {
      x.fillStyle = i === 0 ? C.ok : C.dim;
      x.fillRect(b.x + 20 + f * (b.w - 40) - 16, cy - 46, 32, 30);
    });
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    x.fillText("Puerto 1: módulo", b.x + 16, cy + 50);
  },
  comms(x, b) {
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    ["▸ Cartas", "▸ Llamadas", "▸ Misiones"].forEach((t, i) => x.fillText(t, b.x + 8, b.y + 28 + i * 34));
  },
  nano(x, b) {
    // Nodes and links of the nano_net.
    const pts = [0.15, 0.4, 0.62, 0.85].map((f, i) => [b.x + f * b.w, b.y + b.h * (i % 2 ? 0.25 : 0.5)] as const);
    x.strokeStyle = C.line;
    x.lineWidth = 2;
    x.beginPath();
    pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.stroke();
    pts.forEach(([px, py], i) => {
      x.fillStyle = i === 2 ? C.warn : C.ok;
      x.beginPath();
      x.arc(px, py, 12, 0, Math.PI * 2);
      x.fill();
    });
  },
  probeCam(x, b) {
    // The probe's camera: an asteroid limb under a reticle, range and rate.
    x.fillStyle = "#020509";
    x.fillRect(b.x, b.y, b.w, b.h);
    x.fillStyle = "#6b625a";
    x.beginPath();
    x.ellipse(b.x + b.w * 0.55, b.y + b.h * 1.05, b.w * 0.6, b.h * 0.6, 0, Math.PI, 0);
    x.fill();
    x.strokeStyle = C.ok;
    x.lineWidth = 2;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h * 0.42;
    x.strokeRect(cx - 30, cy - 30, 60, 60);
    x.beginPath();
    x.moveTo(cx - 60, cy);
    x.lineTo(cx + 60, cy);
    x.moveTo(cx, cy - 60);
    x.lineTo(cx, cy + 60);
    x.stroke();
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    x.fillText("Cámara · retícula", b.x + 8, b.y + 26);
  },
  probeMap(x, b) {
    grid(x, b, 32);
    x.strokeStyle = C.line;
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.35, b.h * 0.3, 0.3, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = C.ok;
    x.beginPath();
    x.arc(b.x + b.w * 0.78, b.y + b.h * 0.38, 8, 0, Math.PI * 2);
    x.fill();
  },
  mind(x, b) {
    x.strokeStyle = "#b07fff";
    x.lineWidth = 3;
    x.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const yy = b.y + b.h * 0.3 - Math.sin(t * 20) * Math.sin(t * 3.1) * b.h * 0.15;
      if (i) x.lineTo(b.x + t * b.w, yy);
      else x.moveTo(b.x, yy);
    }
    x.stroke();
  },
  hatch(x, b) {
    x.fillStyle = C.text;
    x.font = `${SCREEN_FONT_PX.body}px monospace`;
    x.fillText("Presión igualada", b.x + 8, b.y + 30);
    x.fillStyle = C.ok;
    x.fillText("ESPINA ▸ ABIERTA", b.x + 8, b.y + 66);
  },
  systems(x, b) {
    grid(x, b, 40);
  },
};
