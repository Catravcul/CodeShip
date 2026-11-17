import { Journey } from "./lib.mjs";
const OUT = "/tmp/claude-0/-home-user/3289300d-eb5e-57eb-a178-3e67b8e5531b/scratchpad/shots";
const j = new Journey("x", "x", { outDir: OUT, throttle: 1 });
const p = await j.open("http://localhost:5209/?prueba");
const what = process.argv[2] ?? "ship";
import { writeFileSync } from "node:fs";
/** Render the scene from a debug camera at `obj` (an Object3D getter), offset (dx,dy,dz) in world, and save. */
async function look(name, modePath, objFn, off) {
  const url = await p.evaluate(([m, f, o]) => {
    const c = window.codeship;
    const mode = m.split(".").reduce((x, k) => x[k], c);
    const obj = new Function("c", "return " + f)(c);
    obj.updateMatrixWorld(true);
    const cam = mode.camera.clone();
    const at = obj.getWorldPosition(cam.position.clone());
    cam.position.copy(at).add(cam.position.clone().set(o[0], o[1], o[2]));
    cam.up.set(0, 1, 0);
    cam.near = 0.01;
    cam.updateProjectionMatrix();
    cam.lookAt(at);
    c.renderer.render(mode.scene, cam);
    return c.renderer.domElement.toDataURL("image/png");
  }, [modePath, objFn, off]);
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(url.split(",")[1], "base64"));
}
await j.tap(".stand-btn", "Levantarse");
await p.waitForTimeout(800);
if (what === "ship") {
  await j.useMachine("cabin", "acople", "entrar-nodriza", "Entrar en la Starship");
  await p.waitForFunction(() => window.codeship.starship.active && !window.codeship.starship.mode.throughHatch, null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { const t = window.codeship.starship.aquarium.tank; t.stock("banco", 6, "medakas"); t.stock("caracoles", 4, "caracoles"); });
  for (const id of (process.argv[3] ?? "habitat-acuatico,catalogo").split(",")) {
    await p.evaluate((f) => window.codeship.starship.mode.placeAt(f), id);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/ship-${id}.png` });
  }
  for (const [n, f, o] of JSON.parse(process.argv[4] ?? "[]")) await look(n, "starship.mode", f, o);
} else {
  await p.evaluate(() => { const c = window.codeship; c.docking.undock(); c.docking.dockNow(c.structure.portFor("sonda")); c.cabin.enter("asiento"); });
  await p.waitForTimeout(800);
  await j.tap(".stand-btn", "Levantarse");
  await p.waitForTimeout(800);
  await j.useMachine("cabin", "acople", "entrar-estacion", "Entrar en la estación");
  await p.waitForFunction(() => window.codeship.stationInside.active, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const t = window.codeship.stationAquarium.tank; t.stock("banco", 6, "medakas"); t.stock("caracoles", 4, "caracoles"); });
  for (const id of (process.argv[3] ?? "rack-acuatico,rack-catalogo").split(",")) {
    await p.evaluate((f) => window.codeship.stationInside.placeAt(f), id);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/iss-${id}.png` });
  }
  for (const [n, f, o] of JSON.parse(process.argv[4] ?? "[]")) await look(n, "stationInside", f, o);
}
console.log(j.checks.filter(c=>!c.ok).map(c=>c.name), j.errors);
await j.browser.close();
