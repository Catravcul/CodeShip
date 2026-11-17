import { VirtualStick, curve } from "./stick";

/** Turn rates of a camera stick at full deflection (rad/s) and the zoom rate of its buttons (per second). */
export const CAMERA_RATES = { yaw: 2.0, pitch: 1.4, zoom: 1.8 } as const;

/**
 * One frame of a camera stick: the knob (−1..1 per axis, x right, y down) and the zoom buttons held
 * (+1 closer, −1 further, 0 none) turned into a yaw and pitch change (rad, + turns left / looks up) and a
 * distance factor (<1 closer). Pure: the rule every orbit and look camera shares (reglas.md §5.7).
 */
export function cameraStep(knob: { x: number; y: number }, zoomDir: -1 | 0 | 1, dt: number): { yaw: number; pitch: number; zoom: number } {
  return {
    yaw: -curve(knob.x) * CAMERA_RATES.yaw * dt,
    pitch: -curve(knob.y) * CAMERA_RATES.pitch * dt,
    zoom: Math.exp(-zoomDir * CAMERA_RATES.zoom * dt),
  };
}

/**
 * «+» and «−» buttons in `host` (a camera stick or its box): `onHold` gets +1 (closer) or −1 (further) while one is
 * held, and 0 when it is let go.
 */
export function addZoomButtons(host: HTMLElement, onHold: (dir: -1 | 0 | 1) => void): HTMLElement {
  const zoom = document.createElement("div");
  zoom.className = "cam-zoom";
  zoom.innerHTML = `<button data-z="1" aria-label="Acercar la cámara">+</button><button data-z="-1" aria-label="Alejar la cámara">−</button>`;
  host.appendChild(zoom);
  for (const b of zoom.querySelectorAll<HTMLButtonElement>("button")) {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onHold(Number(b.dataset.z) as 1 | -1);
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, () => onHold(0));
  }
  return zoom;
}

/**
 * The camera joystick (reglas.md §5.7: the camera moves only by joystick, never by dragging the screen):
 * a round stick and, if the view can zoom, «+» and «−» buttons beside it. While the stick or a button is
 * held it calls `onMove` every animation frame with that frame's yaw, pitch and zoom (cameraStep), so the
 * view that owns it needs no loop of its own. `show(on)` puts it on screen; the owner says when.
 */
export class CameraStick {
  readonly el: HTMLElement;
  readonly stick: VirtualStick;
  private zoomDir: -1 | 0 | 1 = 0;
  private looping = false;

  constructor(
    host: HTMLElement,
    className: string,
    private readonly onMove: (yaw: number, pitch: number, zoom: number) => void,
    opts: { label?: string; zoom?: boolean } = {},
  ) {
    this.el = document.createElement("div");
    this.el.className = `cam-stick ${className}`;
    host.appendChild(this.el);
    this.stick = new VirtualStick(this.el, "cam-knob", opts.label ?? "Cámara");
    this.stick.el.addEventListener("pointerdown", () => this.loop());
    if (opts.zoom)
      addZoomButtons(this.el, (dir) => {
        this.zoomDir = dir;
        if (dir) this.loop();
      });
  }

  get visible(): boolean {
    return this.el.classList.contains("on");
  }

  show(on: boolean): void {
    if (on !== this.visible) this.el.classList.toggle("on", on);
    if (!on) this.zoomDir = 0;
  }

  /** Runs while the stick or a zoom button is held. */
  private loop(): void {
    if (this.looping) return;
    this.looping = true;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!this.stick.held && this.zoomDir === 0) {
        this.looping = false;
        return;
      }
      const s = cameraStep(this.stick.value, this.zoomDir, dt);
      if (s.yaw || s.pitch || s.zoom !== 1) this.onMove(s.yaw, s.pitch, s.zoom);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
