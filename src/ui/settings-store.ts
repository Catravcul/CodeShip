import { changeSetting, noteFirstInput, parseSettings, serializeSettings, type FirstInput, type GameSettings } from "@modules/settings/domain/settings";
import { compactUi, setCompactUi } from "./duel-view";

/**
 * The general settings (docs/design/habitaculo.md §Ajustes), kept in localStorage. Applies them to
 * the page: `kbd-help` on <body> shows the keyboard hints, the challenge view is the duel screen's.
 * The domain guesses keyboard help from the device until the first input of the session (or the player) decides.
 */
const KEY = "codeship.ajustes";
type Listener = (s: GameSettings) => void;

const storage = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: kept for this session only */
    }
  },
};

const touchCapable = () => "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;

class SettingsStore {
  private s: GameSettings;
  private readonly listeners: Listener[] = [];

  constructor() {
    this.s = parseSettings(storage.get(KEY), { touchCapable: touchCapable(), legacyChallengeView: storage.get("codeship.retos-ui") });
    const first = (input: FirstInput) => {
      if (this.s.firstInputSeen) return;
      this.s = noteFirstInput(this.s, input);
      this.apply();
    };
    window.addEventListener("keydown", () => first("tecla"), { capture: true, once: true });
    window.addEventListener("pointerdown", (e) => first(e.pointerType === "mouse" ? "raton" : "toque"), { capture: true, once: true });
    this.apply();
  }

  get value(): GameSettings {
    // The duel screen's own HUD/panel toggle writes the same preference.
    return { ...this.s, challengeView: compactUi() ? "hud" : "panel" };
  }

  set<K extends keyof GameSettings>(key: K, v: GameSettings[K]): void {
    this.s = changeSetting(this.value, key, v);
    if (key === "challengeView") setCompactUi(v === "hud");
    storage.set(KEY, serializeSettings(this.s));
    this.apply();
  }

  onChange(fn: Listener): void {
    this.listeners.push(fn);
    fn(this.value);
  }

  /** A keyboard hint («K desacopla»), or "" when the player has keyboard help off. */
  key(text: string): string {
    return this.s.keyboardHelp ? text : "";
  }

  private apply(): void {
    document.body.classList.toggle("kbd-help", this.s.keyboardHelp);
    for (const l of this.listeners) l(this.value);
  }
}

export const settings = new SettingsStore();
