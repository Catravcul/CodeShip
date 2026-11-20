import { Vec3 } from "@core/math/vec3";

/**
 * Notices on screen (docs/design/ingravidez.md, «Avisos»): what the player's own action caused comes
 * first. Alerts (an injury, a breakdown, a letter) wait their turn behind it; life-aboard notices
 * («Pepa le ladra a Nube») never take the toast: they float where they happen, only while that spot
 * is in view (`ambientVisible`).
 */
export type NoticeLevel = "jugador" | "alerta";

export interface Notice {
  readonly text: string;
  readonly level: NoticeLevel;
  /** When it shows and until when, in the caller's clock (s). */
  readonly from: number;
  readonly until: number;
}

export const NOTICE = {
  /** Default time on screen, s. */
  seconds: 3,
  /** Alerts kept waiting at most (older ones drop). */
  maxQueued: 3,
} as const;

/**
 * The toast's queue: a player's notice shows at once (replacing whatever was there); an alert shows
 * at once only if no player's notice is up, else it waits; the same text is not queued twice.
 */
export class NoticeQueue {
  private shown: Notice | undefined;
  private readonly waiting: { text: string; level: NoticeLevel; seconds: number }[] = [];

  push(text: string, level: NoticeLevel, now: number, seconds: number = NOTICE.seconds): void {
    const cur = this.current(now);
    if (level === "jugador" || !cur || cur.level === "alerta") {
      this.shown = { text, level, from: now, until: now + seconds };
      return;
    }
    if (cur.text === text || this.waiting.some((w) => w.text === text)) return;
    this.waiting.push({ text, level, seconds });
    if (this.waiting.length > NOTICE.maxQueued) this.waiting.shift();
  }

  /** What shows now (moving on to the next waiting notice when one ends). */
  current(now: number): Notice | undefined {
    while (this.shown && now >= this.shown.until) {
      const next = this.waiting.shift();
      this.shown = next ? { ...next, from: this.shown.until, until: this.shown.until + next.seconds } : undefined;
    }
    return this.shown;
  }

  get queued(): number {
    return this.waiting.length;
  }
}

/** The camera, for the visibility rule. */
export interface ViewCone {
  readonly position: Vec3;
  /** Unit forward. */
  readonly forward: Vec3;
  readonly up: Vec3;
  /** Vertical field of view, rad, and width / height. */
  readonly fovY: number;
  readonly aspect: number;
}

export const AMBIENT = {
  /** Further than this it is not «where she looks», m (game value: across the module and the farm deck). */
  maxM: 14,
  /** Closer than this the label would sit on the camera, m. */
  minM: 0.4,
  /** Share of the half-field of view the spot must be inside (keeps labels off the screen's edges). */
  edge: 0.92,
  /** A life-aboard notice lasts this long, s, seen or not. */
  seconds: 5,
  /** And fades out over its last part, s. */
  fadeS: 1,
} as const;

/**
 * Whether a life-aboard notice at `p` shows: in front of the camera, inside its field of view, not
 * too far, and (occlusion-lite) in the same space as the camera — the caller says so with `sameSpace`.
 */
export function ambientVisible(view: ViewCone, p: Vec3, sameSpace = true): boolean {
  if (!sameSpace) return false;
  const rel = p.sub(view.position);
  const d = rel.length();
  if (d < AMBIENT.minM || d > AMBIENT.maxM) return false;
  const f = view.forward.normalize();
  const z = rel.dot(f);
  if (z <= 0) return false;
  const right = f.cross(view.up).normalize();
  const up = right.cross(f);
  const tanY = Math.tan(view.fovY / 2) * AMBIENT.edge;
  const tanX = tanY * view.aspect;
  return Math.abs(rel.dot(up) / z) <= tanY && Math.abs(rel.dot(right) / z) <= tanX;
}

/** Opacity of an ambient label `age` seconds after it happened (1, then fading to 0 at the end). */
export function ambientOpacity(age: number): number {
  if (age < 0 || age >= AMBIENT.seconds) return 0;
  return Math.min(1, (AMBIENT.seconds - age) / AMBIENT.fadeS);
}
