import { Vec3 } from "@core/math/vec3";
import type { Chore } from "@modules/chores/domain/chore";
import { exerciseTexts } from "@modules/chores/domain/step-visual";
import type { SketchItem, SketchStep, SketchTone } from "@modules/navigation/application/plan-sketch";
import { NANO_TUNING, STAGES, type Stage } from "../domain/core";

/** Where a core is being made or taught: the lander's spot on the ground, the local vertical, a remote net. */
export interface NanoScene {
  /** The core: where the lander is anchored, on the surface. */
  readonly core: Vec3;
  /** Local vertical there (away from the asteroid's centre), unit. */
  readonly up: Vec3;
  /** The network the «enlazar» stage links to, if one is in range. */
  readonly remote?: Vec3;
}

const KIND_LABEL: Readonly<Record<string, string>> = { "nano-convertir": "Núcleo", "nano-reparar": "Arreglo" };
const STAGE_LABEL: Readonly<Record<Stage, string>> = { generar: "Nodos nuevos", mover: "Nodos a su órbita", cubrir: "Cobertura", enlazar: "Enlace" };
const MAX_CAPTION = 70;

/** The stage a «nano-programar» chore teaches (its id is nano-<stage>-<core>). */
export function choreStage(c: Chore): Stage | undefined {
  return STAGES.find((s) => c.id.startsWith(`nano-${s}-`));
}

const clip = (s: string) => (s.length > MAX_CAPTION ? `${s.slice(0, MAX_CAPTION - 1)}…` : s);

/**
 * What each solved step of a nano_net chore draws (docs/design/nano-net.md; PX-20, «cada paso se ve»):
 * pure, like the trip and landing plans (plan-sketch.ts), drawn by the same overlay in the flight view.
 * Every step marks the core under the lander (a ring that grows step by step), and adds what the chore
 * teaches, at the real sizes of NANO_TUNING:
 * - converting: the core's ring, then the first nodes rising from it to their birth height (40 m);
 * - generating: one more node rising per step;
 * - moving: the nodes climbing from their birth height to the ring around the asteroid (600 m);
 * - covering: the area a node covers (600 m) around the core;
 * - linking: the line to the other network;
 * - repairing: the core's ring in the repair tone.
 * Step i of the chain maps to sketch i; its caption is the step's right answer.
 */
export function nanoSketch(c: Chore, s: NanoScene): SketchStep[] {
  const T = NANO_TUNING;
  const stage = c.kind === "nano-programar" ? choreStage(c) : undefined;
  const label = stage ? STAGE_LABEL[stage] : (KIND_LABEL[c.kind] ?? "nano_net");
  const tone: SketchTone = c.kind === "nano-reparar" ? "brake" : stage === "enlazar" || stage === "cubrir" ? "plan" : "site";
  const up = s.up.length() > 1e-9 ? s.up.normalize() : Vec3.Y;
  const ref = Math.abs(up.y) < 0.9 ? Vec3.Y : Vec3.X;
  const u = up.cross(ref).normalize();
  const w = up.cross(u).normalize();
  /** A direction on the ground around the core, for node `i` of `n`. */
  const around = (i: number, n: number) => u.scale(Math.cos((i / n) * Math.PI * 2)).add(w.scale(Math.sin((i / n) * Math.PI * 2)));
  const n = c.exercises.length;
  return c.exercises.map((ex, i): SketchStep => {
    const items: SketchItem[] = [{ kind: "ring", centre: s.core, normal: up, radiusM: 2 + (6 * (i + 1)) / n, tone }];
    const last = i === n - 1;
    if (c.kind === "nano-convertir" && last)
      for (let k = 0; k < T.firstNodes; k++) items.push({ kind: "arrow", from: s.core, to: s.core.add(up.scale(T.bornAltitudeM)).add(around(k, T.firstNodes).scale(8)), tone: "site" });
    else if (stage === "generar") items.push({ kind: "arrow", from: s.core, to: s.core.add(up.scale(T.bornAltitudeM)).add(around(i, n).scale(8)), tone: "site" });
    else if (stage === "mover") {
      const born = s.core.add(up.scale(T.bornAltitudeM)).add(around(i, n).scale(8));
      items.push({ kind: "arrow", from: born, to: s.core.add(up.scale(T.ringAltitudeM)).add(around(i, n).scale(T.nodeRangeM * 0.5)), tone: "burn" });
    } else if (stage === "cubrir" && last) items.push({ kind: "ring", centre: s.core, normal: up, radiusM: T.nodeRangeM, tone: "plan" });
    else if (stage === "enlazar" && last && s.remote) items.push({ kind: "line", points: [s.core, s.remote], tone: "plan" });
    const text = exerciseTexts(ex)[0] ?? "";
    return { caption: `✓ ${label}: ${clip(text.replace(/\{([^}|]*)[^}]*\}/g, "$1"))}`, items };
  });
}
