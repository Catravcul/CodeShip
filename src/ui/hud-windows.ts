/**
 * Windows opened from the root menu (docs/design/reglas.md §5.8): a window says when it opens or closes, and
 * the menu's icon that opened it turns into an X that asks it to close. Plain DOM events, so the menu and the
 * windows need not know each other.
 */
export type HudWindow = "tareas" | "areas" | "trayecto" | "panel" | "misiones" | "alfombras";

const STATE = "codeship:ventana";
const CLOSE = "codeship:cerrar-ventana";

/** A window tells the menus it is open or closed. */
export function windowState(id: HudWindow, open: boolean): void {
  document.dispatchEvent(new CustomEvent(STATE, { detail: { id, open } }));
}

export function onWindowState(fn: (id: HudWindow, open: boolean) => void): void {
  document.addEventListener(STATE, (e) => {
    const d = (e as CustomEvent<{ id: HudWindow; open: boolean }>).detail;
    fn(d.id, d.open);
  });
}

/** The menu's X asks the window to close. */
export function requestClose(id: HudWindow): void {
  document.dispatchEvent(new CustomEvent(CLOSE, { detail: { id } }));
}

export function onCloseRequest(id: HudWindow, fn: () => void): void {
  document.addEventListener(CLOSE, (e) => (e as CustomEvent<{ id: HudWindow }>).detail.id === id && fn());
}
