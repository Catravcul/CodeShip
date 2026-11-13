import type { GameSettings, StartCamera } from "@modules/settings/domain/settings";
import { START_CAMERAS } from "@modules/settings/domain/settings";
import { settings } from "./settings-store";
import "./settings.css";

const CAMERA_LABEL: Readonly<Record<StartCamera, string>> = { cabina: "Cabina (1ª persona)", exterior: "Exterior (3ª persona)", ventral: "Ventral", trasera: "Trasera" };

interface Row {
  key: keyof GameSettings;
  label: string;
  help: string;
  value(s: GameSettings): string;
  next(s: GameSettings): GameSettings[keyof GameSettings];
}

/**
 * A setting kept by another module (e.g. the answer mode of order challenges, kept by duel-view.ts like
 * the challenge view): it adds its own row with `SettingsPanel.addRow`.
 */
export interface ExtraRow {
  id: string;
  label: string;
  help: string;
  value(): string;
  /** Change to the next value. */
  next(): void;
  /** For on/off settings: read as a switch. */
  on?(): boolean;
}

const yes = (b: boolean) => (b ? "Sí" : "No");
const ROWS: readonly Row[] = [
  { key: "names", label: "Nombres", help: "Nombres del Sol, los planetas y los asteroides sobre la vista de vuelo", value: (s) => yes(s.names), next: (s) => !s.names },
  { key: "keyboardHelp", label: "Ayuda de teclado", help: "Las teclas de cada acción («K desacopla») y la tarjeta de controles", value: (s) => yes(s.keyboardHelp), next: (s) => !s.keyboardHelp },
  { key: "challengeView", label: "Vista de retos", help: "Retos en panel o flotando sobre la escena (HUD)", value: (s) => (s.challengeView === "hud" ? "HUD" : "Panel"), next: (s) => (s.challengeView === "hud" ? "panel" : "hud") },
  { key: "camera", label: "Cámara al pilotar", help: "La cámara con la que empieza el vuelo al sentarse", value: (s) => CAMERA_LABEL[s.camera], next: (s) => START_CAMERAS[(START_CAMERAS.indexOf(s.camera) + 1) % START_CAMERAS.length]! },
  { key: "sound", label: "Sonido", help: "Alarmas de embestida e impactos", value: (s) => yes(s.sound), next: (s) => !s.sound },
];

/**
 * The general settings, shown only while Doménica sits in lotus on a yoga mat (docs/design/habitaculo.md
 * §Ajustes). Same look as the challenge screens: a bottom sheet (panel) or floating over the scene (HUD),
 * with the same «Vista» toggle.
 */
export class SettingsPanel {
  private readonly el: HTMLElement;
  private readonly extras: ExtraRow[] = [];
  onClose?: () => void;

  constructor(root: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "settings-sheet hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Ajustes generales");
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-close]")) return this.close();
      const x = t.closest<HTMLElement>("[data-extra]");
      if (x) {
        this.extras.find((r) => r.id === x.dataset.extra)?.next();
        return this.render();
      }
      const b = t.closest<HTMLElement>("[data-key]");
      if (!b) return;
      const row = ROWS.find((r) => r.key === b.dataset.key);
      if (row) settings.set(row.key, row.next(settings.value) as never);
      this.render();
    });
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
  }

  /** A row for a setting another module keeps (shown after the general ones). */
  addRow(row: ExtraRow): void {
    this.extras.push(row);
    if (this.visible) this.render();
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(where: string): void {
    this.where = where;
    this.render();
    this.el.classList.remove("hidden");
    document.body.classList.add("in-settings");
  }

  close(): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    document.body.classList.remove("in-settings");
    this.onClose?.();
  }

  private where = "";

  private render(): void {
    const s = settings.value;
    this.el.classList.toggle("hud", s.challengeView === "hud");
    this.el.innerHTML = `<div class="set-top"><div class="set-title">Ajustes generales</div><div class="set-where">${this.where}</div>
      <div class="set-tools"><button data-key="challengeView">${s.challengeView === "hud" ? "Vista panel" : "Vista HUD"}</button><button class="x" data-close aria-label="Levantarse y cerrar los ajustes">×</button></div></div>
      ${ROWS.map((r) => {
        const on = typeof s[r.key] === "boolean" ? String(s[r.key]) : undefined;
        return `<button class="set-row" data-key="${r.key}" ${on ? `role="switch" aria-checked="${on}"` : ""} aria-label="${r.label}: ${r.value(s)}"><span><b>${r.label}</b><small>${r.help}</small></span><em class="${on === "false" ? "off" : ""}">${r.value(s)}</em></button>`;
      }).join("")}
      ${this.extras
        .map((r) => {
          const on = r.on ? String(r.on()) : undefined;
          return `<button class="set-row" data-extra="${r.id}" ${on ? `role="switch" aria-checked="${on}"` : ""} aria-label="${r.label}: ${r.value()}"><span><b>${r.label}</b><small>${r.help}</small></span><em>${r.value()}</em></button>`;
        })
        .join("")}
      <p class="set-note">Los ajustes se guardan en este navegador. Solo se cambian sentada en una esterilla: la del habitáculo del módulo o la del rincón de ejercicio de la nodriza.</p>`;
  }
}
