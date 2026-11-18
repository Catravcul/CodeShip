import { LEVELS } from "@modules/levels/data/levels";
import type { SaveSlot } from "@modules/saves/domain/save-slot";
import { isRecord } from "@core/snapshot";
import { cannotResume, savedGames, startSession } from "./adapters/storage/saved-games";
import { StartScreen } from "./ui/start-screen";

/**
 * The page's entry: the start screen first, on every load (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md
 * §5), and the game only once a level is chosen: the space sanctuary (6, main.ts) or the aerial one (3,
 * aerial-sanctuary.ts, docs/design/santuario3-escena.md). The games
 * are saved on this device (docs/design/partidas.md): «Continuar» resumes the newest one, and the screen's gear
 * lists them (choose, delete) with «Jugar sin partida guardada».
 */
const book = savedGames();

/** A kept game's settings go back to their keys before the game reads them (scale and spacing build the interiors). */
function restoreSettings(slot: SaveSlot): void {
  const s = isRecord(slot.state) ? slot.state.settings : undefined;
  if (!isRecord(s)) return;
  try {
    if (typeof s.ajustes === "string") {
      localStorage.setItem("codeship.ajustes", s.ajustes);
      // The challenge view (HUD or panel) keeps its own key too (duel-view.ts).
      const view = (JSON.parse(s.ajustes) as { challengeView?: unknown }).challengeView;
      if (view === "hud" || view === "panel") localStorage.setItem("codeship.retos-ui", view === "hud" ? "compacta" : "panel");
    }
    if (typeof s.pasoAPaso === "boolean") localStorage.setItem("codeship.retos-ordenar", s.pasoAPaso ? "pasos" : "todo");
    if (typeof s.aterrizaje === "string") localStorage.setItem("codeship.aterrizaje", s.aterrizaje);
  } catch {
    /* private mode: the game applies them itself */
  }
}

const start = new StartScreen(
  document.body,
  LEVELS,
  { list: () => book.list(), why: cannotResume, remove: (id) => book.remove(id), freeSlot: () => book.newSlot() },
  (level, choice) => {
    if (level.id !== "espacio" && level.id !== "aereo") return;
    // How long the player looked at the start screen is not loading time (tools/experiencia measures from here).
    performance.mark("codeship-inicio-elegido");
    if (choice.kind === "continuar") {
      restoreSettings(choice.slot);
      startSession({ slotId: choice.slot.id, resume: choice.slot });
    } else startSession({ slotId: book.newSlot(), resume: undefined });
    start.close();
    void (level.id === "aereo" ? import("./aerial-sanctuary") : import("./main"));
  },
);
start.open();
performance.mark("codeship-inicio");
// Test hook, only in dev builds or with `?prueba` (tools/experiencia/inicio.mjs reads the map's view).
if (import.meta.env.DEV || new URLSearchParams(location.search).has("prueba")) (window as unknown as { codeshipInicio: StartScreen }).codeshipInicio = start;
