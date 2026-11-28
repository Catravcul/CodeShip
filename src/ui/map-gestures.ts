/**
 * The finger on a 3D map (reglas.md §5.7, its one exception: the Navigation and Áreas maps): one finger drags
 * to turn it, two pinch to zoom, and a short tap without moving picks what is under it.
 */
export interface MapGestures {
  /** Turn by the finger's move, px. */
  rotate(dx: number, dy: number): void;
  /** Zoom by this factor (>1 closer). */
  zoom(factor: number): void;
  /** A tap at these client coordinates. */
  tap(x: number, y: number): void;
}

/** Moves under this many px are still a tap. */
const TAP_PX = 10;

export function mapGestures(el: HTMLElement, h: MapGestures): void {
  const down = new Map<number, { x: number; y: number; x0: number; y0: number }>();
  let moved = false;
  let pinch = 0;
  const spread = () => {
    const [a, b] = [...down.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  el.addEventListener("pointerdown", (e) => {
    down.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    el.setPointerCapture?.(e.pointerId);
    if (down.size === 1) moved = false;
    if (down.size === 2) {
      pinch = spread();
      moved = true;
    }
  });
  el.addEventListener("pointermove", (e) => {
    const p = down.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (down.size === 1) {
      if (!moved && Math.hypot(p.x - p.x0, p.y - p.y0) >= TAP_PX) moved = true;
      if (moved) h.rotate(dx, dy);
      return;
    }
    const d = spread();
    if (pinch > 0 && d > 0) h.zoom(d / pinch);
    pinch = d;
  });
  const up = (e: PointerEvent, tap: boolean) => {
    if (!down.has(e.pointerId)) return;
    if (tap && down.size === 1 && !moved) h.tap(e.clientX, e.clientY);
    down.delete(e.pointerId);
    if (down.size < 2) pinch = 0;
  };
  el.addEventListener("pointerup", (e) => up(e, true));
  el.addEventListener("pointercancel", (e) => up(e, false));
}
