// Performance check of sanctuary 1 on the iPhone 13 view (docs/design/santuario1.md §Rendimiento): opens the built
// game (npx vite build --base=./ && npx vite preview --port 4173), enters sanctuary 1 and, at a few fixed views, counts
// the draw calls, triangles and frames per second. With --shots it also saves a picture of each view to /tmp.
// Usage: node tools/rendimiento-s1.mjs [--url http://localhost:4173/] [--shots]
// Needs Playwright (npm install --no-save playwright@1) and Chrome; in the cloud it runs on SwiftShader, so its frame
// rate is only comparable with itself (before and after a change), never with a phone's.
import { chromium, devices } from "playwright";

const args = process.argv.slice(2);
const url = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:4173/";
const shots = args.includes("--shots");
/** What the phone should not pass at any view (2026-11-22: at most 340 calls and 357 000 triangles, at the high map). */
const MAX_CALLS = 500;
const MAX_TRIANGLES = 550_000;

const VIEWS = [
  { name: "inicio", cam: null },
  { name: "mapa-alto", cam: { p: [0, 420, 380], t: [0, 60, 0] } },
  { name: "globo-fuera", cam: { p: [0, 150, 330], t: [0, 140, 0] } },
  // Swimming (her body in the water, first person, looking up): what the sea's light and fog look like by depth.
  { name: "bajo-mar-3m", body: [60, -3, 60], look: [0, 1.1] },
  { name: "bajo-mar-12m", body: [60, -12, 60], look: [0, 1.1] },
  { name: "bajo-mar-30m", body: [60, -30, 60], look: [0, 1.1] },
  { name: "dentro-globo", body: [0, 150, 0], look: [0, 1.1] },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ ...devices["iPhone 13"] });
await page.goto(`${url}?prueba`);
await page.locator("button", { hasText: "1 · Santuario Terrestre" }).locator("xpath=following-sibling::button[1]").click();
await page.waitForFunction(() => !!window.codeshipS1, null, { timeout: 120_000 });
await page.waitForTimeout(4000);
await page.evaluate(() => {
  const s = window.codeshipS1;
  const cam = s.camera;
  const orig = cam.updateMatrixWorld.bind(cam);
  cam.updateMatrixWorld = (f) => {
    const c = window.__cam;
    if (c) {
      cam.position.set(...c.p);
      cam.lookAt(...c.t);
    }
    orig(f);
  };
  for (const el of document.querySelectorAll(".hud, .menu-tree, .joystick, .s1-ui")) el.style.display = "none";
});
const rows = [];
let worst = 0;
let worstTri = 0;
for (const v of VIEWS) {
  await page.evaluate((v) => {
    window.__cam = v.cam ?? null;
    const s = window.codeshipS1;
    if (v.body) {
      s.body = { x: v.body[0], y: v.body[1], z: v.body[2], motion: "agua", area: s.body.area };
      s.setView(v.look[0], v.look[1], false);
    }
  }, v);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(
    () =>
      new Promise((done) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
          else {
            const i = window.codeshipS1.renderer.info;
            done({ fps: (n * 1000) / (performance.now() - t0), calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  worst = Math.max(worst, r.calls);
  worstTri = Math.max(worstTri, r.triangles);
  rows.push({ vista: v.name, fps: r.fps.toFixed(1), llamadas: r.calls, triangulos: r.triangles, geometrias: r.geometries });
  if (shots) await page.screenshot({ path: `/tmp/s1-${v.name}.png` });
}
console.table(rows);
await browser.close();
if (worst > MAX_CALLS || worstTri > MAX_TRIANGLES) {
  console.error(`Pasa el presupuesto (${worst} llamadas de ${MAX_CALLS}, ${worstTri} triángulos de ${MAX_TRIANGLES}): revisar antes de publicar.`);
  process.exit(1);
}
