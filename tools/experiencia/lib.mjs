// Player-experience suite (docs/testing.md): plays Codeship the way a player can, with taps and keys on
// visible controls, on an iPhone 13 with the CPU throttled ×4, and records what the player sees (text,
// counters, colours, screenshots) and what the phone would feel (frame time, long tasks, heap, draw calls).
// Modelled on Cold Sanctuary's ExperienciaJugadorTest: each check has a sentence a designer can read.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

/** Performance budgets (docs/testing.md). Frame and long-task budgets only bind on a real GPU. */
export const BUDGETS = {
  loadMs: 8000,
  frameP95Ms: 33,
  slowFramesPct: 10,
  longTasksPerMin: 30,
  heapMB: 350,
  drawCalls: 600,
  trianglesK: 2000,
};

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
    await this.page.waitForFunction(() => performance.getEntriesByName("codeship-primer-fotograma").length > 0 && window.codeship, null, { timeout: 120000 });
    this.loadMs = await this.page.evaluate(() => performance.getEntriesByName("codeship-primer-fotograma")[0].startTime);
    this.wallLoadMs = Date.now() - t0;
    this.gpu = await this.page.evaluate(() => {
      const gl = document.querySelector("canvas")?.getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "desconocida";
    });
    await this.page.waitForTimeout(1500);
    await this.resetPerf();
    return this.page;
  }

  /** Starts a fresh performance window (after loading or a setup step). */
  async resetPerf() {
    await this.page.evaluate(() => {
      window.__exp.frames = [];
      window.__exp.longTasks = [];
      window.__exp.since = performance.now();
    });
  }

  /** A player's tap on a visible control: fails the check if it is hidden or covered. */
  async tap(selector, what = selector) {
    const loc = this.page.locator(selector).first();
    try {
      await loc.waitFor({ state: "visible", timeout: 15000 });
      // A finger on a phone, the mouse on a desktop.
      if (this.opts.mobile === false) await loc.click({ timeout: 15000 });
      else await loc.tap({ timeout: 15000 });
      return true;
    } catch (e) {
      this.check(`se puede tocar «${what}»`, false, e.message.split("\n")[0]);
      return false;
    }
  }

  /** A finger (or the mouse on desktop) on the centre of an element, whatever its state. */
  async tapAt(loc) {
    let b = await loc.boundingBox();
    if (!b) return false;
    const vh = this.page.viewportSize().height;
    if (b.y < 0 || b.y + b.height > vh) {
      // Off screen: a player scrolls first. Worth knowing when it is an answer to a challenge.
      const what = (await loc.textContent())?.trim().slice(0, 30);
      if (!this.scrolled) this.problem(`Hay que desplazar la pantalla para llegar a «${what}»: no cabe en ${this.page.viewportSize().width}×${vh}`);
      this.scrolled = true;
      await loc.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(200);
      b = await loc.boundingBox();
    }
    if (!b) return false;
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
    if (ex.kind === "choice") return this.tapAt(this.page.locator(".duel .option").nth(right ? ex.correct : (ex.correct + 1) % ex.options.length));
    for (const id of right ? ex.solution : [...ex.solution].reverse()) await this.tapAt(this.page.locator(`.duel .tray [data-id="${id}"]`));
    return this.tapAt(this.page.locator(".duel .submit"));
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
  async overlaps(selector = "button, .chip, .trip-chip, .rapport-chip, .hud, .help, .banner, .vstick, .region-tag, .cam-tag, .toast.on") {
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
      const out = [];
      for (let i = 0; i < vis.length; i++)
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i];
          const b = vis[j];
          if (a.contains(b) || b.contains(a)) continue;
          // A sticky button over a scrolling list is by design: the list scrolls out from under it.
          if (getComputedStyle(a).position === "sticky" || getComputedStyle(b).position === "sticky") continue;
          const r = a.getBoundingClientRect();
          const q = b.getBoundingClientRect();
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
    const m = await this.page.evaluate(() => {
      const s = window.__exp;
      const f = window.__codeshipFrame || { calls: 0, triangles: 0 };
      const mem = performance.memory;
      return { frames: s.frames.slice(1), longTasks: s.longTasks.filter((t) => t.at >= s.since), seconds: (performance.now() - s.since) / 1000, calls: f.calls, triangles: f.triangles, heap: mem ? mem.usedJSHeapSize : 0 };
    });
    const frames = m.frames;
    this.perf = {
      frames: frames.length,
      seconds: +m.seconds.toFixed(1),
      fps: +(frames.length / Math.max(1, m.seconds)).toFixed(1),
      frameMedianMs: +pct(frames, 50).toFixed(1),
      frameP95Ms: +pct(frames, 95).toFixed(1),
      slowFramesPct: frames.length ? +((100 * frames.filter((x) => x > 33).length) / frames.length).toFixed(1) : 0,
      longTasks: m.longTasks.length,
      longTasksPerMin: +((60 * m.longTasks.length) / Math.max(1, m.seconds)).toFixed(1),
      longestTaskMs: Math.round(Math.max(0, ...m.longTasks.map((t) => t.ms))),
      heapMB: +(m.heap / 1048576).toFixed(1),
      drawCalls: m.calls,
      trianglesK: +(m.triangles / 1000).toFixed(1),
      loadMs: Math.round(this.loadMs),
      gpu: this.gpu,
    };
    return this.perf;
  }

  /** Budget results: GPU-bound budgets only bind on a hardware GPU (or with EXPERIENCIA_ESTRICTO=1). */
  budgets() {
    const p = this.perf;
    const softwareGl = /swiftshader|llvmpipe|software/i.test(p.gpu) && !process.env.EXPERIENCIA_ESTRICTO;
    const rows = [
      ["Carga hasta el primer fotograma", p.loadMs, BUDGETS.loadMs, "ms", true],
      ["Fotograma p95", p.frameP95Ms, BUDGETS.frameP95Ms, "ms", true],
      ["Fotogramas de más de 33 ms", p.slowFramesPct, BUDGETS.slowFramesPct, "%", true],
      ["Tareas largas por minuto", p.longTasksPerMin, BUDGETS.longTasksPerMin, "", true],
      ["Memoria JS", p.heapMB, BUDGETS.heapMB, "MB", false],
      ["Llamadas de dibujo por fotograma", p.drawCalls, BUDGETS.drawCalls, "", false],
      ["Triángulos por fotograma", p.trianglesK, BUDGETS.trianglesK, "k", false],
    ];
    return rows.map(([name, value, max, unit, gpuBound]) => ({ name, value, max, unit, ok: value <= max, binding: !(gpuBound && softwareGl) }));
  }

  async close() {
    await this.measure();
    this.check("ningún error de JavaScript en la página", this.errors.length === 0, this.errors.slice(0, 3).join(" | "));
    await this.browser.close();
    const budgets = this.budgets();
    const failedBudgets = budgets.filter((b) => b.binding && !b.ok);
    return {
      name: this.name,
      title: this.title,
      ok: this.checks.every((c) => c.ok) && failedBudgets.length === 0,
      checks: this.checks,
      problems: this.problems,
      shots: this.shots,
      perf: this.perf,
      budgets,
    };
  }
}
