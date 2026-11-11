import { Vec3 } from "@core/math/vec3";
import type { ThrustCommand } from "@modules/ship/domain/ship";

type Axis = "tx" | "ty" | "tz" | "rx" | "ry" | "rz" | "main";
interface Pad {
  label: string;
  axis: Axis;
  sign: 1 | -1;
}

/** On-screen flight controls for touch screens: hold a button to fire. */
export class TouchPilot {
  private readonly held = new Map<string, Pad>();

  constructor(root: HTMLElement) {
    const left: Pad[] = [
      { label: "▲", axis: "rx", sign: -1 },
      { label: "◀", axis: "ry", sign: 1 },
      { label: "▶", axis: "ry", sign: -1 },
      { label: "▼", axis: "rx", sign: 1 },
      { label: "⟲", axis: "rz", sign: 1 },
      { label: "⟳", axis: "rz", sign: -1 },
    ];
    const right: Pad[] = [
      { label: "Avanzar", axis: "tz", sign: -1 },
      { label: "Atrás", axis: "tz", sign: 1 },
      { label: "Subir", axis: "ty", sign: 1 },
      { label: "Bajar", axis: "ty", sign: -1 },
      { label: "Izq.", axis: "tx", sign: -1 },
      { label: "Der.", axis: "tx", sign: 1 },
      { label: "Motor", axis: "main", sign: 1 },
    ];
    root.appendChild(this.group("touch-left", "Girar", left));
    root.appendChild(this.group("touch-right", "Mover", right));
  }

  private group(cls: string, title: string, pads: Pad[]): HTMLElement {
    const g = document.createElement("div");
    g.className = `touch ${cls}`;
    g.innerHTML = `<div class="touch-title">${title}</div>`;
    pads.forEach((p, i) => {
      const b = document.createElement("button");
      b.textContent = p.label;
      if (p.axis === "main") b.className = "main";
      const key = `${cls}-${i}`;
      const on = (e: Event) => {
        e.preventDefault();
        this.held.set(key, p);
      };
      const off = () => this.held.delete(key);
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("pointerleave", off);
      g.appendChild(b);
    });
    return g;
  }

  command(): ThrustCommand {
    const v = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, main: 0 };
    for (const p of this.held.values()) v[p.axis] += p.sign;
    return { mainThrottle: v.main > 0 ? 1 : 0, translation: new Vec3(v.tx, v.ty, v.tz), rotation: new Vec3(v.rx, v.ry, v.rz) };
  }
}

/** Adds two pilot commands (keyboard + touch), clamped to the valid range. */
export function mergeCommands(a: ThrustCommand, b: ThrustCommand): ThrustCommand {
  const c = (v: Vec3) => new Vec3(Math.max(-1, Math.min(1, v.x)), Math.max(-1, Math.min(1, v.y)), Math.max(-1, Math.min(1, v.z)));
  return {
    mainThrottle: Math.min(1, a.mainThrottle + b.mainThrottle),
    translation: c(a.translation.add(b.translation)),
    rotation: c(a.rotation.add(b.rotation)),
  };
}
