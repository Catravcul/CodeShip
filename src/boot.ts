import { LEVELS } from "@modules/levels/data/levels";
import { parseSave } from "@modules/levels/domain/level";
import { StartScreen } from "./ui/start-screen";

/**
 * The page's entry: the start screen first, on every load (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md
 * §5), and the game (main.ts) only once a level is chosen. Today only the space sanctuary (6) starts: it is the
 * game as it was. A kept game (`codeship.partida`) shows «Continuar»; nothing writes one yet (docs/qa HC-06).
 */
const SAVE_KEY = "codeship.partida";

function stored(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

const start = new StartScreen(document.body, LEVELS, parseSave(stored(), LEVELS), (level) => {
  if (level.id !== "espacio") return;
  // How long the player looked at the start screen is not loading time (tools/experiencia measures from here).
  performance.mark("codeship-inicio-elegido");
  start.close();
  void import("./main");
});
start.open();
performance.mark("codeship-inicio");
// Test hook, only in dev builds or with `?prueba` (tools/experiencia/inicio.mjs reads the map's view).
if (import.meta.env.DEV || new URLSearchParams(location.search).has("prueba")) (window as unknown as { codeshipInicio: StartScreen }).codeshipInicio = start;
