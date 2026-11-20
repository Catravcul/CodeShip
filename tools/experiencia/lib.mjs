// Player-experience suite (docs/testing.md): plays Codeship the way a player can, with taps and keys on
// visible controls, on an iPhone 13 with the CPU throttled ×4, and records what the player sees (text,
// counters, colours, screenshots) and what the phone would feel (frame time, long tasks, heap, draw calls).
// Modelled on Cold Sanctuary's ExperienciaJugadorTest: each check has a sentence a designer can read.
/** The challenge buttons of a machine's card (ui/interaction.ts, RETO_ACTS). */
const RETO = '[data-act^="chore:"], [data-act^="brazo:"], [data-act="reto"], [data-act^="sim:"], [data-act="lanzar"], [data-reto]';

/**
 * The interaction button a player sees (reglas.md §5.8): the orange one under the tree menu's root, or, with the Switch
 * pad out, the pad's orange Y (ui/game-pad.ts; the root's stays hidden then). In the page: marks it with
 * data-panel-tap when `mark`, and returns its label without the key («Reto: …», «Cerrar: …»), or null.
 */
const FIND_ACT = (mark) => {
  const b =
    [...document.querySelectorAll(".rm-act:not(.hidden)")].find((x) => x.closest(".root-menu")?.checkVisibility() && x.checkVisibility()) ??
    [...document.querySelectorAll('.switch-pad .ap-btn.alert[data-letter="Y"]')].find((x) => x.checkVisibility());
  if (!b) return null;
  if (mark) b.dataset.panelTap = "1";
  return (b.getAttribute("aria-label") ?? b.textContent ?? "").replace(/ \(KeyE\)$/, "");
};
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

import { BUDGETS, TOUCH_MIN_PX } from "./presupuestos.mjs";
import { checkBudgets, journeyPasses, verdict } from "./qa.mjs";

const SAMPLER = `(() => {
  const s = (window.__exp = { frames: [], longTasks: [], since: performance.now(), stamp: 0 });
  let last = 0;
  const tick = (t) => { if (last) s.frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.longTasks.push({ at: e.startTime, ms: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch {}
})();`;

const pct = (xs, p) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};

/**
 * Into the game from the start screen (src/boot.ts), as a player. A new game by default: «Jugar» on the space
 * sanctuary (6), the only one that starts; with a kept game (its button says «Continuar», docs/design/partidas.md)
 * the gear's «Jugar sin partida guardada», which leaves the kept games alone. `{ resume: true }` taps «Continuar».
 * Waits for the game to be there.
 */
export async function enterGame(page, { resume = false } = {}) {
  await page.waitForFunction(() => window.codeship || document.querySelector(".start-screen:not(.hidden)"), null, { timeout: 120000 });
  if (!(await page.evaluate(() => !!window.codeship))) {
    const tapIt = async (btn) => {
      await btn.scrollIntoViewIfNeeded();
      await btn.tap({ timeout: 15000 }).catch(() => btn.click({ timeout: 15000 }));
    };
    const cont = page.locator(".start-screen .mw-go:not([disabled])", { hasText: "Continuar" });
    if (!(await cont.count())) await tapIt(page.locator('.start-screen .mw-go[data-go="espacio"]'));
    else if (resume) await tapIt(cont.first());
    else {
      await tapIt(page.locator(".start-screen .mw-gear"));
      await tapIt(page.locator(".start-screen .ss-fresh"));
    }
  }
  await page.waitForFunction(() => window.codeship, null, { timeout: 120000 });
}

export class Journey {
  constructor(name, title, opts) {
    this.name = name;
    this.title = title;
    this.opts = opts;
    this.checks = [];
    this.problems = [];
    this.shots = [];
    this.perf = null;
    this.n = 0;
  }

  async open(url) {
    const { outDir, mobile = true, throttle = Number(process.env.EXPERIENCIA_CPU ?? 4) } = this.opts;
    this.dir = outDir;
    mkdirSync(outDir, { recursive: true });
    this.browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const ctx = await this.browser.newContext(mobile ? { ...devices["iPhone 13"], deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(SAMPLER);
    this.page = await ctx.newPage();
    this.errors = [];
    this.page.on("pageerror", (e) => this.errors.push(e.message));
    const cdp = await ctx.newCDPSession(this.page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    const t0 = Date.now();
    await this.page.goto(url);
    // The start screen comes first on every load (PX-44 plays it; the others choose 6 or «Continuar»).
    if (this.opts.startScreen) {
      await this.page.waitForSelector(".start-screen:not(.hidden)", { timeout: 120000 });
      this.loadMs = await this.page.evaluate(() => performance.getEntriesByName("codeship-inicio")[0]?.startTime);
      this.loadMarked = typeof this.loadMs === "number";
      this.wallLoadMs = Date.now() - t0;
      await this.resetPerf();
      return this.page;
    }
    await enterGame(this.page);
    await this.page.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0, null, { timeout: 30000 }).catch(() => {});
    // The mark the game loop sets on its first frame (older builds without it: when the page had the game), less
    // the time the start screen waited for a choice (a player looking at it is not loading).
    this.loadMs = await this.page.evaluate(() => {
      const t = (n) => performance.getEntriesByName(n)[0]?.startTime;
      const first = t("codeship-primer-fotograma");
      return typeof first === "number" && typeof t("codeship-inicio-elegido") === "number" ? first - (t("codeship-inicio-elegido") - (t("codeship-inicio") ?? 0)) : first;
    });
    this.loadMarked = typeof this.loadMs === "number";
    this.wallLoadMs = Date.now() - t0;
    await this.detectGpu();
    await this.page.waitForTimeout(1500);
    await this.resetPerf();
    return this.page;
  }

  /** The renderer of the game's WebGL canvas (none yet on the start screen: looked for again when measuring). */
  async detectGpu() {
    this.gpu = await this.page.evaluate(() => {
      const c = [...document.querySelectorAll("canvas")].find((x) => !x.closest(".start-screen"));
      const gl = c?.getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "desconocida";
    });
  }

  /** Starts a fresh performance window (after loading or a setup step). */
  async resetPerf() {
    await this.page.evaluate(() => {
      window.__exp.frames = [];
      window.__exp.longTasks = [];
      window.__exp.since = performance.now();
    });
  }

  /**
   * With the Switch pad on screen (ui/game-pad.ts, reglas.md §5.7–5.8), the tree menu's Vista, Tareas or Misiones and
   * Áreas live on its capture, «+» and «−» buttons: a tap on one of those icons is the pad's button, as a player does.
   */
  async padFor(selector) {
    // A machine's card shown with the orange button hides the pad (action-pad.css): a player closes it with its X first.
    const carded = await this.page
      .evaluate((sel) => document.body.classList.contains("panel-on") && document.body.classList.contains("has-switch-pad") && [...document.querySelectorAll(sel)].some((e) => e.closest(".root-menu") && e.matches("[data-pad]")), selector)
      .catch(() => false);
    if (carded) {
      const x = [...(await this.page.locator(".rm-act.rm-open").all())];
      for (const b of x) if (await b.isVisible()) {
        await b.tap({ timeout: 5000 }).catch(() => b.click({ timeout: 5000 }));
        break;
      }
    }
    return this.page
      .evaluate((sel) => {
        if (!document.body.classList.contains("has-switch-pad")) return null;
        const el = [...document.querySelectorAll(sel)].find((e) => e.closest(".root-menu") && e.matches("[data-pad]"));
        if (!el) return null;
        const pad = document.querySelector(".switch-pad:not(.hidden)");
        if (!pad || !pad.checkVisibility()) return null;
        const c = el.className;
        const key = /areas-btn/.test(c) ? "ap-minus" : /-view\b/.test(c) ? "ap-capture" : /tasks|missions/.test(c) ? "ap-plus" : null;
        return key ? `.switch-pad .${key}` : null;
      }, selector)
      .catch(() => null);
  }

  /** A player's tap on a visible control: fails the check if it is hidden or covered. */
  async tap(selector, what = selector) {
    const onPad = await this.padFor(selector);
    if (onPad) selector = onPad;
    const loc = this.page.locator(selector).first();
    try {
      // A machine's challenge is reached with the orange button, as a player does (ui/machine-panel.ts): one opens
      // straight away, several through the choice. Then there is nothing more to tap.
      if (await this.viaReto(selector, what)) return true;
      await this.showPanel(selector);
      await this.sprout(selector);
      await loc.waitFor({ state: "visible", timeout: 15000 });
      await this.invariants(loc, what);
      // A finger on a phone, the mouse on a desktop.
      if (this.opts.mobile === false) await loc.click({ timeout: 15000 });
      else await loc.tap({ timeout: 15000 });
      // A hatch's action (in, out, up, down) starts a passage once she is at it.
      if (/data-act="(entrar|salir|subir|bajar)/.test(selector)) await this.throughHatches();
      return true;
    } catch (e) {
      // What lies on top of it, if anything (a tap that times out on a visible control is usually covered).
      const over = await this.page
        .evaluate((sel) => {
          const el = document.querySelector(sel);
          const r = el?.getBoundingClientRect();
          const top = r && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return top && top !== el && !el.contains(top) ? ` · encima: ${top.tagName.toLowerCase()}.${String(top.className).split(" ").join(".")}` : "";
        }, selector)
        .catch(() => "");
      this.check(`se puede tocar «${what}»`, false, e.message.split("\n")[0] + over);
      return false;
    }
  }

  /**
   * Áreas' gear (open window): the scope option `kind`/`id` (the shared hierarchy: «» is «Todo», "auto" where she is),
   * then back to the list. True if the option was there.
   */
  async areasScope(kind, id, what = `Mostrar: ${kind || "Todo"} ${id}`) {
    await this.tap(".areas-window .ar-view", "Ajustes de áreas");
    const sel = `.areas-window [data-scope-kind="${kind}"][data-scope-id="${id}"]`;
    const there = (await this.page.locator(sel).count()) > 0;
    if (there) await this.tap(sel, what);
    await this.tap(".areas-window .ar-view", "Volver al mapa de áreas");
    return there;
  }

  /**
   * The shared reto focus (reto-focus.ts): with the sheet open, her middle is in the strip above the sheet and her head
   * not over the screen's top. `hook` names the page's test hook with `camera` and `rig` (codeshipS3, codeship…).
   */
  async herFramed(hook) {
    return this.page.evaluate((hook) => {
      const h = window[hook];
      const cam = h?.camera;
      const rig = h?.rig;
      if (!cam || !rig) return null;
      const sheet = [...document.querySelectorAll(".duel")].find((e) => !e.classList.contains("hidden") && e.checkVisibility());
      const top = sheet ? sheet.getBoundingClientRect().top : innerHeight;
      cam.updateMatrixWorld();
      rig.updateMatrixWorld();
      const at = (dy) => {
        const v = rig.getWorldPosition(rig.position.clone());
        v.y += dy;
        v.project(cam);
        return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight, front: v.z < 1 };
      };
      const mid = at(1.2);
      const head = at(1.65);
      const ok = mid.front && mid.x >= 0 && mid.x <= innerWidth && mid.y >= 0 && mid.y <= top && head.y >= -10;
      return { ok, top: Math.round(top), mid: { x: Math.round(mid.x), y: Math.round(mid.y) }, head: { x: Math.round(head.x), y: Math.round(head.y) }, fov: Math.round(cam.fov) };
    }, hook);
  }

  /** The label of the visible orange interaction button (under the root, or the pad's Y), or "". */
  async interactionLabel() {
    return (await this.page.evaluate(FIND_ACT, false).catch(() => null)) ?? "";
  }

  /** A tap on the visible orange interaction button (under the tree menu's root, or the pad's Y); returns its label. */
  async tapInteraction(what = "Botón naranja") {
    const label = await this.page.evaluate(FIND_ACT, true);
    if (!label) return null;
    await this.tap('[data-panel-tap="1"]', what);
    await this.page.evaluate(() => document.querySelectorAll("[data-panel-tap]").forEach((b) => delete b.dataset.panelTap));
    return label;
  }

  /** The choice of challenge shown (RetoPicker): its title and options. */
  picker() {
    return this.page.evaluate(() => {
      const el = [...document.querySelectorAll(".reto-picker")].find((e) => !e.classList.contains("hidden") && e.checkVisibility());
      return el ? { title: el.querySelector(".rp-head b")?.textContent ?? "", options: [...el.querySelectorAll(".rp-opt")].map((o) => ({ title: o.querySelector("b")?.textContent ?? "", detail: o.querySelector("span")?.textContent ?? "", locked: o.disabled })) } : null;
    });
  }

  /** The card of `selector` gives challenges and has nothing else to do (no other button). */
  retoOnly(selector) {
    return this.page
      .evaluate(
        ([sel, RETO]) => {
          const card = [...document.querySelectorAll(sel)].map((e) => e.closest(".cab-machine:not(.hidden)")).find(Boolean);
          const retos = card ? [...card.querySelectorAll(RETO)] : [];
          return retos.length > 0 && [...card.querySelectorAll("button")].every((b) => b.disabled || retos.includes(b));
        },
        [selector, RETO],
      )
      .catch(() => false);
  }

  /** The card of `selector` gives challenges. */
  retoCard(selector) {
    return this.page.evaluate(([sel, RETO]) => !![...document.querySelectorAll(sel)].map((e) => e.closest(".cab-machine:not(.hidden)")).find((c) => c?.querySelector(RETO)), [selector, RETO]).catch(() => false);
  }

  /**
   * The orange button of a machine with challenges (reglas.md §5.8, the same in every level) goes through the choice of
   * challenge, not its card: a challenge button of a card is reached by tapping it and, if the choice (RetoPicker)
   * opens, the challenge's option there; any other button of such a card, by the choice's «Ver la máquina». True when
   * the challenge was started this way (nothing more to tap).
   */
  async viaReto(selector, what) {
    const at = await this.page
      .evaluate(
        ([sel, RETO]) => {
          if (document.body.classList.contains("panel-on")) return null;
          const el = [...document.querySelectorAll(sel)].find((e) => e.closest(".cab-machine:not(.hidden)"));
          const card = el?.closest(".cab-machine");
          if (!el || !card) return null;
          const retos = [...card.querySelectorAll(RETO)];
          if (!retos.length) return null;
          const i = retos.indexOf(el);
          const others = [...card.querySelectorAll("button")].filter((b) => !b.disabled && !retos.includes(b)).length;
          return { i, n: retos.length, others };
        },
        [selector, RETO],
      )
      .catch(() => null);
    if (!at) return false;
    await this.page.waitForFunction(`/^Reto: /.test((${FIND_ACT})(false) ?? "")`, null, { timeout: 8000 }).catch(() => {});
    const marked = await this.page.evaluate(FIND_ACT, true);
    if (!marked) return false;
    await this.tap('[data-panel-tap="1"]', "Reto (botón naranja)");
    await this.page.evaluate(() => document.querySelectorAll("[data-panel-tap]").forEach((b) => delete b.dataset.panelTap));
    const picker = await this.page.waitForFunction(() => document.body.classList.contains("in-reto-picker"), null, { timeout: 1500 }).then(() => true).catch(() => false);
    if (!picker) return at.i >= 0;
    // The challenge's option, or «Ver la máquina» (the last) for another button of the card.
    const k = at.i >= 0 ? at.i : at.n;
    await this.tap(`.reto-picker .rp-opt[data-i="${k}"]`, at.i >= 0 ? `${what} (en la elección de reto)` : "Ver la máquina");
    if (at.i >= 0) return true;
    await this.page.waitForFunction(() => document.body.classList.contains("panel-on"), null, { timeout: 5000 }).catch(() => {});
    return false;
  }

  /**
   * A machine's or an area's card never opens on its own (reglas.md §5.8): a player shows it with the tree
   * menu's «Panel» first. Does nothing if the target is not in a card, or the card is already shown.
   */
  async showPanel(selector) {
    if (!/cab-machine|sti-card|sts-card|cm-/.test(selector) && !(await this.page.evaluate((sel) => [...document.querySelectorAll(sel)].some((e) => e.closest(".cab-machine")), selector).catch(() => false))) return;
    // The card may be the next machine's, still to come: wait for it, and for the menu's frame that sees it.
    await this.page.locator(selector).first().waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
    await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).catch(() => {});
    const hidden = await this.page
      .evaluate((sel) => !document.body.classList.contains("panel-on") && [...document.querySelectorAll(sel)].some((e) => e.closest(".cab-machine:not(.hidden)")), selector)
      .catch(() => false);
    if (!hidden) return;
    // A machine with challenges only: its orange button goes to the challenge, there is no card to show (its text is
    // what the choice of challenge says, read by `texts`).
    if (await this.retoOnly(selector)) return;
    if (await this.retoCard(selector)) {
      await this.viaReto(selector, "Ver la máquina");
      return;
    }
    await this.page.waitForFunction(`(${FIND_ACT})(false) !== null`, null, { timeout: 8000 }).catch(() => {});
    const btn = await this.page.evaluate(FIND_ACT, true);
    if (!btn) return;
    await this.tap('[data-panel-tap="1"]', "Panel");
    await this.page.evaluate(() => document.querySelectorAll("[data-panel-tap]").forEach((b) => delete b.dataset.panelTap));
    await this.page.waitForFunction(() => document.body.classList.contains("panel-on"), null, { timeout: 5000 }).catch(() => {});
  }

  /**
   * The general tree menu (docs/design/reglas.md §5.8): an icon folded under the gear is reached as a player
   * does, with a visible tap on the gear first. Does nothing if the target is not in a folded menu.
   */
  async sprout(selector) {
    const root = await this.page
      .evaluate((sel) => {
        const shown = (el) => el && el.checkVisibility();
        const el = [...document.querySelectorAll(sel)].find((e) => e.closest(".root-menu:not(.open) .rm-shoots") && !e.classList.contains("hidden") && shown(e.closest(".root-menu")));
        const menu = el?.closest(".root-menu");
        if (!menu) return null;
        menu.dataset.sprout = "1";
        return true;
      }, selector)
      .catch(() => null);
    if (!root) return;
    const gear = this.page.locator('.root-menu[data-sprout="1"] > .rm-root').first();
    await this.invariants(gear, "⚙︎ Menú");
    if (this.opts.mobile === false) await gear.click({ timeout: 15000 });
    else await gear.tap({ timeout: 15000 });
    await this.page.evaluate(() => document.querySelectorAll(".root-menu[data-sprout]").forEach((m) => delete m.dataset.sprout));
    // The icons fade in (0,18 s, slow at the suite's few frames per second): tap them once they are visible.
    await this.page
      .waitForFunction((sel) => [...document.querySelectorAll(sel)].some((e) => e.closest(".root-menu.open") && getComputedStyle(e).visibility === "visible"), selector, { timeout: 12000, polling: 100 })
      .catch(() => {});
  }

  /**
   * With the task list open, change its settings with visible taps (docs/design/viaje-a-una-tarea.md
   * §Ajustes de tareas): the gear next to ✕, then each `[data-…="…"]` choice (e.g. `vehicle: "todos"`,
   * `travel: "teletransporte"`), then the list icon back to the list. The group chips are in the list itself.
   */
  async taskSettings(choices) {
    let ok = await this.tap('.task-board .board-head [data-view][aria-label="Ajustes de tareas"]', "⚙︎ Ajustes de tareas");
    for (const [k, v] of Object.entries(choices)) ok = (await this.tap(`.task-board .tb-settings [data-${k}="${v}"]`, `${k}: ${v}`)) && ok;
    return (await this.tap('.task-board .board-head [data-view][aria-label="Volver a la lista de tareas"]', "Lista de tareas")) && ok;
  }

  /**
   * Going through a hatch takes its time (the leaf swings open, she floats through, docs/design/viajes.md
   * «Trayectos por dentro»): after a tap on a hatch's action, wait until she is through on the other side.
   * Not during «Ir», whose journey is checked step by step.
   */
  async throughHatches() {
    const passing = () =>
      this.page.evaluate(() => {
        const c = window.codeship;
        if (!c || c.journey?.active) return false;
        return [c.cabin, c.bridge, c.starship?.active ? c.starship.mode : null, c.stationInside?.active ? c.stationInside : null].some((r) => !!r?.throughHatch);
      });
    // She may first walk to the hatch: give the passage a moment to start.
    const t0 = Date.now();
    while (!(await passing().catch(() => false))) {
      if (Date.now() - t0 > 4000) return;
      await this.page.waitForTimeout(100);
    }
    // Two quiet looks in a row: one room hands her to the next, which shows her coming through its own hatch.
    let quiet = 0;
    while (quiet < 2 && Date.now() - t0 < 20000) {
      await this.page.waitForTimeout(150);
      quiet = (await passing().catch(() => false)) ? 0 : quiet + 1;
    }
  }

  /**
   * Checked before every tap (Natuka's invariant helpers): the target is big enough for a finger
   * (44 px on phones, 24 px on desktop), nothing covers its centre and it has an accessible name.
   * Each control is reported once per journey.
   */
  async invariants(loc, what) {
    const min = this.opts.mobile === false ? TOUCH_MIN_PX.desktop : TOUCH_MIN_PX.mobile;
    // Off screen (in a list), a player scrolls to it first.
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const probe = () => loc.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim().replace(/\s+/g, " ");
      return { w: Math.round(b.width), h: Math.round(b.height), covered: !hit || !(el === hit || el.contains(hit)), coveredBy: hit ? `${hit.className || hit.tagName}`.toString().split(" ")[0] : "nada", name };
    });
    let r = await probe();
    // A menu icon still fading in on a slow machine (CI) is not covered: look again once, as a finger would wait for it.
    if (r.covered) {
      await this.page.waitForTimeout(500);
      r = await probe();
    }
    const label = what ?? r.name.slice(0, 30);
    this.invariantsSeen ??= new Set();
    if (this.invariantsSeen.has(label)) return;
    this.invariantsSeen.add(label);
    this.tapsChecked = (this.tapsChecked ?? 0) + 1;
    if (r.w < min || r.h < min) this.check(`objetivo de toque «${label}» de al menos ${min}×${min} px`, false, `${r.w}×${r.h}`);
    if (r.covered) this.check(`«${label}» no está tapado por otro elemento`, false, `tapado por ${r.coveredBy}`);
    if (!r.name) this.check(`«${label}» tiene nombre accesible`, false);
  }

  /**
   * Every block (or option) of the step on screen within the viewport, with no scrolling (docs/design/ux-acciones.md:
   * a step fits its screen). Said once per step, as a problem, naming the step and what falls outside.
   */
  async fits(ex) {
    this.fitSeen ??= new Set();
    if (!ex.id || this.fitSeen.has(ex.id)) return;
    this.fitSeen.add(ex.id);
    const r = await this.page.evaluate(() => {
      const d = [...document.querySelectorAll(".duel")].find((e) => !e.classList.contains("hidden"));
      if (!d) return null;
      const out = [...d.querySelectorAll("button.block, button.option")].filter((b) => {
        const q = b.getBoundingClientRect();
        return q.height > 0 && (q.top < 0 || q.bottom > innerHeight + 0.5);
      });
      return { idea: d.querySelector(".idea")?.textContent.trim() ?? "", out: out.map((b) => b.textContent.trim().slice(0, 30)), view: document.body.classList.contains("ui-compact") ? "HUD" : "panel" };
    });
    // The panel (reglas.md §4.4, unchanged) leaves 30 % of a phone to the scene and scrolls; the HUD must fit.
    if (r?.out.length && r.view === "HUD") this.problem(`El paso ${r.idea} (${ex.id}, vista ${r.view}) no cabe en ${this.page.viewportSize().width}×${this.page.viewportSize().height}: fuera ${r.out.length} (${r.out.slice(0, 2).map((t) => `«${t}»`).join(", ")})`);
  }

  /** A finger (or the mouse on desktop) on the centre of an element, whatever its state. */
  async tapAt(loc) {
    let b = await loc.boundingBox();
    if (!b) return false;
    const vh = this.page.viewportSize().height;
    const covered = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !hit || !(el === hit || el.contains(hit));
    });
    if (b.y < 0 || b.y + b.height > vh || covered) {
      // Off screen: a player scrolls first. Worth knowing when it is an answer to a challenge.
      const what = (await loc.textContent())?.trim().slice(0, 30);
      if (!this.scrolled) this.problem(`Hay que desplazar la pantalla para llegar a «${what}»: no cabe en ${this.page.viewportSize().width}×${vh}`);
      this.scrolled = true;
      await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await this.page.waitForTimeout(200);
      b = await loc.boundingBox();
    }
    if (!b) return false;
    await this.invariants(loc);
    if (this.opts.mobile === false) await this.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    else await this.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await this.page.waitForTimeout(450);
    return true;
  }

  /**
   * Answers the challenge on screen with taps: right, or wrong on purpose. `oracle` runs in the page
   * and returns the challenge being shown (the answer key a player who knows the code would have).
   */
  async answer(oracle, right = true) {
    const ex = await this.page.evaluate(oracle);
    if (!ex) return false;
    await this.fits(ex);
    if (ex.kind === "choice") return this.tapAt(this.page.locator(".duel .option").nth(right ? ex.correct : (ex.correct + 1) % ex.options.length));
    // After a wrong order the ✓ stay and «Reintentar» sends the ✗ back to the tray (only the missing blocks are tapped).
    const retry = this.page.locator(".duel .submit.retry");
    if (await retry.count()) await this.tapAt(retry);
    const inTray = async (id) => (await this.page.locator(`.duel .tray [data-id="${id}"]`).count()) > 0;
    const pick = (id) => this.tapAt(this.page.locator(`.duel .tray [data-id="${id}"]`));
    // «Paso a paso» (codeship.retos-ordenar): each pick is checked at once, there is no send button.
    if (await this.page.evaluate(() => localStorage.getItem("codeship.retos-ordenar") === "pasos")) {
      const next = await this.page.locator(".duel .slots .placed").count();
      if (right) {
        for (const id of ex.solution) if (await inTray(id)) await pick(id);
        return true;
      }
      const ids = await this.page.$$eval(".duel .tray [data-id]", (els) => els.map((e) => e.dataset.id));
      const wrong = ids.find((id) => id !== ex.solution[next]);
      return wrong ? pick(wrong) : false;
    }
    for (const id of right ? ex.solution : [...ex.solution].reverse()) if (await inTray(id)) await pick(id);
    return this.tapAt(this.page.locator(".duel .submit"));
  }

  /**
   * In a walkable room (the lander's cabin or the bridge, src/walk-room.ts): a tap on the machine walks her
   * there, then a tap on its card's button (none with `act` null: only walk there). `room` is the key of window.codeship ("cabin" or "bridge").
   */
  async useMachine(room, id, act, what) {
    const pt = await this.page.evaluate(([r, m]) => {
      const w = window.codeship[r];
      const c = w.screenPoint(m);
      const canvas = (x, y) => document.elementFromPoint(x, y)?.tagName === "CANVAS";
      // A finger, not a pixel: the browser snaps a touch to a button within reach (the Switch pad's «−» or capture
      // beside a console in the middle of the screen), so the player taps the console where no button is that close.
      const R = 26;
      const clear = (x, y) => canvas(x, y) && [[R, 0], [-R, 0], [0, R], [0, -R], [R, R], [-R, R], [R, -R], [-R, -R]].every(([dx, dy]) => canvas(x + dx, y + dy) || x + dx < 0 || y + dy < 0 || x + dx > innerWidth || y + dy > innerHeight);
      const box = w.measure?.().hits?.[m];
      if (!box || clear(c.x, c.y)) return { ...c, free: canvas(c.x, c.y) };
      const pts = [];
      for (let i = -4; i <= 4; i++) for (let k = -4; k <= 4; k++) pts.push({ x: c.x + (i / 10) * box.w, y: c.y + (k / 10) * box.h });
      pts.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
      const ok = pts.find((q) => clear(q.x, q.y) && (typeof w.stationAt !== "function" || w.stationAt(q.x, q.y) === m));
      return ok ? { ...ok, free: true } : { ...c, free: canvas(c.x, c.y) };
    }, [room, id]);
    const vp = this.page.viewportSize();
    if (pt.free && pt.x > 0 && pt.y > 0 && pt.x < vp.width && pt.y < vp.height) {
      if (this.opts.mobile === false) await this.page.mouse.click(pt.x, pt.y);
      else await this.page.touchscreen.tap(pt.x, pt.y);
    } else await this.setup(`camina hasta «${id}» (la máquina no se ve en pantalla)`, ([r, m]) => window.codeship[r].goTo(m), [room, id]);
    try {
      await this.page.waitForFunction(([r, m]) => window.codeship[r].near() === m, [room, id], { timeout: 20000 });
    } catch {
      // The tap did not reach the machine (behind another one): walk there the way the task list does.
      await this.setup(`camina hasta «${id}»`, ([r, m]) => window.codeship[r].goTo(m), [room, id]);
      await this.page.waitForFunction(([r, m]) => window.codeship[r].near() === m, [room, id], { timeout: 20000 }).catch(() => {});
    }
    // She stops at the machine and its card comes up.
    await this.page.waitForFunction(() => !!document.querySelector(".room-ui:not(.hidden) .cab-machine:not(.hidden)"), null, { timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    if (!act) return true;
    return this.tap(`.room-ui:not(.hidden) .cab-machine [data-act="${act}"]`, what);
  }

  /**
   * Opens a root icon menu (reglas.md §5.8) if it is folded, with a tap on its root, and waits until `item`
   * has sprouted (the shoots fade in in 0,18 s, each a full 44 px box).
   */
  async openMenu(bar, item, what = "Mandos de vuelo") {
    const p = this.page;
    if (!(await p.evaluate((b) => document.querySelector(b)?.classList.contains("open"), bar))) await this.tap(`${bar} .rm-root`, what);
    await p.waitForFunction((i) => (document.querySelector(i)?.getBoundingClientRect().width ?? 0) >= 44, item, { timeout: 5000 }).catch(() => {});
  }

  /**
   * Out of the LM's pilot station: with its hand controls on screen (rcs-pad.ts, the tree menu hidden as in any
   * challenge) by their own «Dejar el puesto», otherwise by the flight controls' menu.
   */
  async standUp(what = "Dejar el puesto: habitáculo") {
    const pad = '.rcs-pad:not(.hidden) [data-act="end"]';
    if (await this.page.locator(pad).count()) return this.tap(pad, what);
    return this.tap(".stand-btn", what);
  }

  /** A tap on an icon that sprouts from a root menu: opens the menu (it stays open until its X) and taps it. */
  async tapInMenu(bar, item, what) {
    await this.openMenu(bar, item);
    return this.tap(item, what);
  }

  /** Waits until the challenge screen is up, then checks that it is the only interface on screen. */
  async waitDuel(timeout = 30000) {
    await this.page.waitForFunction(() => [...document.querySelectorAll(".duel")].some((e) => !e.classList.contains("hidden")), null, { timeout });
    await this.page.waitForTimeout(400);
    await this.onlyChallengeVisible();
  }

  /**
   * What is on screen besides the challenge (docs/design/ux-acciones.md §Foco del reto): every element
   * outside the sheet (`.duel`, which holds the step line) and the 3D scene (the game's canvas), the rule's
   * two things with no exceptions (docs/design/reglas.md §4.3), that paints something in the viewport, grouped by its overlay root (a child of
   * #app or of body); and the points of a 12 px grid where a tap would land on one of them.
   */
  async outsideChallenge() {
    return this.page.evaluate(() => {
      const keep = (el) => !!el.closest("#app > canvas, .duel");
      const root = (el) => {
        let r = el;
        while (r.parentElement && r.parentElement !== document.body && r.parentElement.id !== "app") r = r.parentElement;
        return r;
      };
      const label = (el) => `${el.tagName.toLowerCase()}${el.classList.length ? "." + [...el.classList].filter((c) => c !== "hidden").join(".") : ""}`;
      const paints = (el, s) => {
        if (/^(IMG|SVG|VIDEO|CANVAS|INPUT|BUTTON|SELECT|TEXTAREA|svg)$/.test(el.tagName)) return true;
        if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return true;
        const clear = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
        if (!clear(s.backgroundColor) || s.backgroundImage !== "none") return true;
        return parseFloat(s.borderTopWidth) > 0 && !clear(s.borderTopColor);
      };
      const W = innerWidth;
      const H = innerHeight;
      const seen = new Map();
      for (const el of document.body.querySelectorAll("*")) {
        if (keep(el) || el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.right <= 0 || r.bottom <= 0 || r.left >= W || r.top >= H) continue;
        const s = getComputedStyle(el);
        if (!paints(el, s)) continue;
        const k = label(root(el));
        const e = seen.get(k) ?? { root: k, texts: new Set(), hit: 0 };
        const t = (el.getAttribute("aria-label") || [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")).trim().replace(/\s+/g, " ").slice(0, 40);
        if (t && e.texts.size < 4) e.texts.add(t);
        seen.set(k, e);
      }
      for (let y = 6; y < H; y += 12)
        for (let x = 6; x < W; x += 12) {
          const hit = document.elementFromPoint(x, y);
          if (!hit || keep(hit) || hit === document.documentElement || hit === document.body || hit.id === "app") continue;
          const k = label(root(hit));
          const e = seen.get(k) ?? { root: k, texts: new Set(), hit: 0 };
          e.hit++;
          seen.set(k, e);
        }
      return [...seen.values()].map((e) => ({ root: e.root, texts: [...e.texts], hitPoints: e.hit }));
    });
  }

  /**
   * Invariant while a challenge is open (designer, 2026-11-16): only the sheet, the scene and the step
   * overlay are on screen; no other interface paints or takes a tap. Also «Ver trayecto» (drawn into
   * the canvas) must not replace the scene. Returns the elements found.
   */
  async onlyChallengeVisible(where) {
    const open = await this.page.evaluate(() => [...document.querySelectorAll(".duel")].some((e) => !e.classList.contains("hidden")));
    if (!open) return [];
    const out = await this.outsideChallenge();
    const pip = await this.page.evaluate(() => !!window.codeship?.tripPreview?.visible);
    const title = where ?? ((await this.texts(".duel .duel-title"))[0] ?? "").slice(0, 50);
    const desc = out.map((o) => `${o.root}${o.hitPoints ? ` (${o.hitPoints} puntos de toque)` : ""}${o.texts.length ? ` «${o.texts.join("» «")}»` : ""}`);
    if (pip) desc.push("«Ver trayecto» ocupa la escena");
    this.check(`con el reto abierto solo se ven la hoja, la escena y el paso${title ? ` («${title}»)` : ""}`, desc.length === 0, desc.slice(0, 6).join("; "));
    return out;
  }

  async key(code, ms = 0) {
    if (!ms) return this.page.keyboard.press(code);
    await this.page.keyboard.down(code);
    await this.page.waitForTimeout(ms);
    await this.page.keyboard.up(code);
  }

  /** Drags a touch pad (virtual stick) from its centre, as a thumb would. */
  async stick(selector, dx, dy, ms) {
    const b = await this.page.locator(selector).first().boundingBox();
    if (!b) return this.check(`hay un mando «${selector}» en pantalla`, false);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    await this.page.mouse.move(cx, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(cx + dx, cy + dy, { steps: 4 });
    await this.page.waitForTimeout(ms);
    await this.page.mouse.up();
  }

  /** Holds a button down with a finger for `ms` (the camera's «+» and «−»). */
  async hold(selector, ms) {
    const b = await this.page.locator(selector).first().boundingBox();
    if (!b) return this.check(`hay un botón «${selector}» en pantalla`, false);
    await this.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await this.page.mouse.down();
    await this.page.waitForTimeout(ms);
    await this.page.mouse.up();
  }

  /** Setup that a player cannot do in a test's time (teleport, as Cold Sanctuary's WorkdayDirector.Teleport). Logged. */
  async setup(why, fn, arg) {
    this.checks.push({ ok: true, name: `(preparación) ${why}`, setup: true });
    const r = await this.page.evaluate(fn, arg);
    await this.page.waitForTimeout(300);
    return r;
  }

  check(name, ok, detail = "") {
    this.checks.push({ ok: !!ok, name, detail: String(detail ?? "") });
    console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
    return !!ok;
  }

  /** A UX problem seen while playing (not a failed check: something to improve). */
  problem(text) {
    this.problems.push(text);
    console.log(`  ! ${text}`);
  }

  async shot(label) {
    const file = `${this.name}-${String(++this.n).padStart(2, "0")}-${label}.png`;
    await this.page.screenshot({ path: join(this.dir, file) });
    this.shots.push(file);
    return file;
  }

  /** Visible texts of the elements matching `selector`. */
  async texts(selector) {
    // Reading a machine's card: a player shows it with «Panel» first.
    if (/cab-machine|sti-card|sts-card/.test(selector)) await this.showPanel(selector);
    // A machine with challenges only has no card to show: what it says is what its choice of challenge says.
    if (/cab-machine|sti-card|sts-card/.test(selector) && !(await this.page.evaluate(() => document.body.classList.contains("panel-on"))) && (await this.retoOnly(selector)))
      return this.page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.closest(".cab-machine:not(.hidden)")).map((e) => e.textContent.replace(/\s+/g, " ").trim()), selector);
    return this.page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
          })
          .map((el) => el.textContent.trim().replace(/\s+/g, " ")),
      selector,
    );
  }

  async color(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).color : "";
    }, selector);
  }

  /** Pairs of visible buttons that overlap on screen (each one hides part of the other). */
  async overlaps(selector = "button, .chip, .trip-chip, .rapport-chip, .hud, .help, .banner, .vstick, .region-tag, .cam-tag, .toast.on, .wrath-card:not(.hidden), .radio-toast.on") {
    return this.page.evaluate((sel) => {
      const vis = [...document.querySelectorAll(sel)].filter((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0 || r.width < 4 || r.height < 4) return false;
        let p = el.parentElement;
        while (p) {
          const ps = getComputedStyle(p);
          if (ps.display === "none" || ps.visibility === "hidden") return false;
          p = p.parentElement;
        }
        return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      });
      const name = (el) => `${el.className.toString().split(" ")[0] || el.tagName.toLowerCase()}«${el.textContent.trim().slice(0, 24)}»`;
      // What can be seen of it: a button inside a scrolling card is cut at the card's edge.
      const seen = (el) => {
        const r = el.getBoundingClientRect();
        let [l, t, rt, b] = [r.left, r.top, r.right, r.bottom];
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX === "visible" && o.overflowY === "visible") continue;
          const q = p.getBoundingClientRect();
          [l, t, rt, b] = [Math.max(l, q.left), Math.max(t, q.top), Math.min(rt, q.right), Math.min(b, q.bottom)];
        }
        return { left: l, top: t, right: rt, bottom: b };
      };
      const out = [];
      for (let i = 0; i < vis.length; i++)
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i];
          const b = vis[j];
          if (a.contains(b) || b.contains(a)) continue;
          // A sticky button over a scrolling list is by design: the list scrolls out from under it.
          if (getComputedStyle(a).position === "sticky" || getComputedStyle(b).position === "sticky") continue;
          const r = seen(a);
          const q = seen(b);
          const w = Math.min(r.right, q.right) - Math.max(r.left, q.left);
          const h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
          // Only when both stay on top at their own centre: one hidden behind a sheet is covered, not competing.
          const top = (el) => {
            if (getComputedStyle(el).pointerEvents === "none") return true;
            const k = el.getBoundingClientRect();
            const hit = document.elementFromPoint(k.left + k.width / 2, k.top + k.height / 2);
            return !!hit && (el === hit || el.contains(hit));
          };
          if (w > 4 && h > 4 && top(a) && top(b)) out.push(`${name(a)} × ${name(b)}`);
        }
      return out;
    }, selector);
  }

  async measure() {
    if (this.gpu === undefined || this.gpu === "desconocida") await this.detectGpu().catch(() => {});
    const m = await this.page.evaluate(() => {
      const s = window.__exp;
      const f = window.__codeshipFrame;
      const mem = performance.memory;
      // Sentinel: a missing sampler, hook or memory API is reported as missing, never as 0.
      if (!s) return null;
      return { frames: s.frames.slice(1), longTasks: s.longTasks.filter((t) => t.at >= s.since), seconds: (performance.now() - s.since) / 1000, calls: f?.calls, triangles: f?.triangles, heap: mem?.usedJSHeapSize };
    });
    const frames = m?.frames ?? [];
    const has = frames.length > 0;
    const num = (v, f) => (typeof v === "number" && Number.isFinite(v) ? f(v) : undefined);
    this.perf = {
      frames: frames.length,
      seconds: m ? +m.seconds.toFixed(1) : 0,
      fps: has ? +(frames.length / Math.max(1, m.seconds)).toFixed(1) : undefined,
      frameMedianMs: has ? +pct(frames, 50).toFixed(1) : undefined,
      frameP95Ms: has ? +pct(frames, 95).toFixed(1) : undefined,
      slowFramesPct: has ? +((100 * frames.filter((x) => x > 33).length) / frames.length).toFixed(1) : undefined,
      longTasks: m?.longTasks.length,
      longTasksPerMin: m ? +((60 * m.longTasks.length) / Math.max(1, m.seconds)).toFixed(1) : undefined,
      longestTaskMs: m ? Math.round(Math.max(0, ...m.longTasks.map((t) => t.ms))) : undefined,
      heapMB: num(m?.heap, (v) => +(v / 1048576).toFixed(1)),
      drawCalls: num(m?.calls, (v) => v),
      trianglesK: num(m?.triangles, (v) => +(v / 1000).toFixed(1)),
      loadMs: this.loadMarked ? Math.round(this.loadMs) : undefined,
      gpu: this.gpu,
    };
    return this.perf;
  }

  /** Budget results: GPU-bound budgets only bind on a hardware GPU (or with EXPERIENCIA_ESTRICTO=1). */
  budgets() {
    const softwareGl = /swiftshader|llvmpipe|software/i.test(this.perf.gpu ?? "");
    return checkBudgets(this.perf, BUDGETS, { softwareGl, strict: !!process.env.EXPERIENCIA_ESTRICTO });
  }

  async close() {
    // Empty-suite guard: a journey that checked nothing is a failure, not a pass.
    if (this.checks.filter((c) => !c.setup).length === 0) this.check("el recorrido hizo alguna comprobación", false, "0 comprobaciones");
    try {
      await this.measure();
    } catch (e) {
      this.perf = { gpu: this.gpu, frames: 0 };
      this.check("se pudo medir el rendimiento", false, e.message.split("\n")[0]);
    }
    this.check("ningún error de JavaScript en la página", this.errors.length === 0, this.errors.slice(0, 3).join(" | "));
    await this.browser?.close();
    const budgets = this.budgets();
    return {
      id: this.opts.id,
      name: this.name,
      title: this.title,
      verdict: verdict(this.checks),
      passed: journeyPasses(this.checks, budgets),
      tapsChecked: this.tapsChecked ?? 0,
      checks: this.checks,
      problems: this.problems,
      shots: this.shots,
      perf: this.perf,
      budgets,
    };
  }
}
