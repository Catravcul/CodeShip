import * as THREE from "three";
import { textSign } from "./interior/sign";

/**
 * The probe's cabin, seen from the pilot's seat (camera at the origin, looking −z). Laid out like a
 * small crewed capsule (docs/design/interiores.md): two seats side by side with the hand
 * controllers on the pilot's armrests (Orion, Apollo LM), a glass console of three displays over a
 * strip of physical switches for critical commands (Crew Dragon), the overhead docking hatch and
 * window (LM), the left side hatch for EVA (the whole cabin depressurises, as in the LM), the
 * suit, the hygiene bay behind a curtain (Dragon, Orion), CO₂ scrubber cartridges, water, oxygen
 * masks, extinguisher, medical kit and stowage. No galley, no beds: sorties last hours.
 * Licence: the forward window is much larger than a real capsule's so the pilot can land by eye.
 */
export function buildCockpit(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8, metalness: 0.2 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.7, metalness: 0.3 });
  const liner = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 0.9 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x3fd0ff });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc0302a, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2d3440, roughness: 0.85 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x8a5a1a, roughness: 0.9 });

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    parent.add(m);
    return m;
  };
  const cyl = (r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 14) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    c.position.set(x, y, z);
    g.add(c);
    return c;
  };
  const label = (text: string, x: number, y: number, z: number, s = 0.22) => {
    const l = textSign(text);
    l.scale.multiplyScalar(s);
    l.position.set(x, y, z);
    // Always on top: in a cabin this tight the plates would cut into the walls they name.
    l.material.depthTest = false;
    l.renderOrder = 10;
    g.add(l);
  };

  // --- Console: three displays on a sloped glass panel (navigation, systems, life support) and,
  // under them, a strip of physical switches for what must work with the screens off.
  box(2.2, 0.36, 0.45, panel, 0, -0.62, -0.85);
  const slope = new THREE.Group();
  slope.position.set(0, -0.44, -0.66);
  slope.rotation.x = -0.75;
  g.add(slope);
  box(1.5, 0.26, 0.03, frame, 0, 0, 0, 0, 0, slope);
  [
    ["NAV", "#3fd0ff", -0.48],
    ["SISTEMAS", "#7dffb0", 0],
    ["SOPORTE VITAL", "#ffb347", 0.48],
  ].forEach(([title, color, x]) => {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), new THREE.MeshBasicMaterial({ map: screenTexture(title as string, color as string) }));
    scr.position.set(x as number, 0, 0.017);
    slope.add(scr);
  });
  const switches = new THREE.Group();
  switches.position.set(0, -0.6, -0.62);
  switches.rotation.x = -0.35;
  g.add(switches);
  box(1.3, 0.09, 0.02, frame, 0, 0, 0, 0, 0, switches);
  for (let i = 0; i < 9; i++) {
    const critical = i === 0 || i === 8; // abort and fire suppression, under guards
    box(0.06, 0.04, 0.02, critical ? red : i % 3 ? white : yellow, -0.56 + i * 0.14, 0, 0.015, 0, 0, switches);
  }

  // --- Window frame: forward window, two side windows (shorter: the back of the cabin is wall) ---
  box(0.07, 1.6, 0.07, frame, -0.98, 0.05, -0.85, 0, 0.2);
  box(0.07, 1.6, 0.07, frame, 0.98, 0.05, -0.85, 0, -0.2);
  box(2.4, 0.09, 0.09, frame, 0, 0.62, -0.85);
  for (const sx of [-1, 1]) {
    box(0.08, 0.5, 2.0, wall, 1.2 * sx, -0.55, 0.1); // sill
    box(0.08, 0.08, 1.3, frame, 1.2 * sx, 0.62, -0.25); // top rail
    box(0.08, 0.25, 2.0, wall, 1.2 * sx, 0.78, 0.1);
    box(0.08, 1.25, 0.08, frame, 1.2 * sx, 0.0, -0.2); // middle pillar
    box(0.08, 1.25, 0.7, liner, 1.2 * sx, 0.0, 0.75); // solid wall behind the seats
  }
  // Floor, roof and rear bulkhead.
  box(2.4, 0.04, 2.0, wall, 0, -0.8, 0.1);
  box(2.4, 0.04, 2.0, liner, 0, 0.9, 0.1);
  box(2.4, 1.7, 0.05, liner, 0, 0.05, 1.1);

  // --- Overhead docking hatch (IDSS) over the seats, with its tunnel ring and window ---
  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 8, 28), frame);
  hatchRing.rotation.x = Math.PI / 2;
  hatchRing.position.set(0, 0.87, 0.6);
  g.add(hatchRing);
  cyl(0.32, 0.02, new THREE.MeshStandardMaterial({ color: 0x7c8796, metalness: 0.5 }), 0, 0.88, 0.6, 24);
  cyl(0.08, 0.025, new THREE.MeshStandardMaterial({ color: 0x050812, emissive: 0x0a1630 }), 0.15, 0.86, 0.6, 16); // docking window
  box(0.2, 0.03, 0.03, amber, -0.15, 0.85, 0.6); // hatch handle
  label("Escotilla de acople", 0, 0.7, 0.6);

  // --- Seats: pilot (under the camera) and crew seat, reclined, with five-point harness. The
  // pilot's own back and headrest are left out: they would fill the view when she looks back.
  for (const [x, w, own] of [
    [0, 0.5, true],
    [0.74, 0.46, false],
  ] as const) {
    box(w, 0.1, 0.55, seatMat, x, -0.62, 0.35, 0.12);
    if (!own) {
      box(w, 0.8, 0.1, seatMat, x, -0.2, 0.68, -0.25);
      box(w * 0.7, 0.22, 0.1, seatMat, x, 0.3, 0.8, -0.25); // headrest
      for (const sx of [-1, 1]) box(0.05, 0.62, 0.012, strap, x + (sx * w) / 4, -0.25, 0.6, -0.25);
    }
    for (const sx of [-1, 1]) box(0.08, 0.06, 0.4, seatMat, x + (sx * w) / 2, -0.45, 0.3); // armrests
    box(0.05, 0.3, 0.012, strap, x, -0.5, 0.42, 1.2); // crotch strap
  }
  // Hand controllers on the pilot's armrests: rotation on the right, translation on the left.
  cyl(0.025, 0.14, frame, 0.25, -0.36, 0.18);
  cyl(0.035, 0.05, red, 0.25, -0.27, 0.18);
  box(0.07, 0.06, 0.07, frame, -0.25, -0.39, 0.18);
  box(0.035, 0.04, 0.035, yellow, -0.25, -0.34, 0.18);

  // --- Left side, behind the seats: EVA hatch and the suit, like the LM (the cabin depressurises) ---
  box(0.04, 1.0, 0.6, new THREE.MeshStandardMaterial({ color: 0x7c8796, metalness: 0.5 }), -1.15, -0.15, 0.78);
  box(0.03, 0.04, 0.4, amber, -1.13, 0.37, 0.78);
  cyl(0.04, 0.03, red, -1.12, -0.1, 0.55).rotateZ(Math.PI / 2); // cabin depress valve
  label("Escotilla EVA", -1.05, 0.25, 0.78);
  const suit = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 });
  box(0.42, 0.55, 0.25, suit, -0.6, 0.15, 0.97); // torso hung on the bulkhead
  box(0.4, 0.5, 0.15, suit, -0.6, 0.15, 1.05); // life-support backpack
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.8, roughness: 0.2 }));
  helmet.position.set(-0.6, 0.55, 0.95);
  g.add(helmet);
  label("Traje EVA", -0.6, 0.35, 0.85);

  // --- Right side, behind the crew seat: hygiene bay behind a curtain ---
  box(0.02, 1.4, 0.45, new THREE.MeshStandardMaterial({ color: 0x6f8fb0, roughness: 0.9 }), 0.98, -0.05, 0.86);
  box(0.25, 0.04, 0.45, frame, 1.08, 0.66, 0.86);
  label("Aseo", 0.95, 0.3, 0.86);

  // --- Rear bulkhead: stowage bags, CO₂ scrubber cartridges, medical kit ---
  const bag = new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: 0.95 });
  for (const [x, y] of [
    [0.05, -0.45],
    [0.35, -0.45],
    [0.05, -0.1],
  ] as const)
    box(0.26, 0.3, 0.12, bag, x, y, 1.03);
  for (let i = 0; i < 3; i++) cyl(0.05, 0.22, new THREE.MeshStandardMaterial({ color: 0x5a7fa8, roughness: 0.6 }), 0.2 + i * 0.12, 0.3, 1.04); // scrubber cartridges
  label("Filtros de CO₂", 0.32, 0.12, 1.0);
  box(0.2, 0.14, 0.06, white, 0.55, -0.1, 1.06); // medical kit
  box(0.06, 0.06, 0.006, red, 0.55, -0.1, 1.03);

  // Crew services: oxygen masks in the roof, extinguisher, water dispenser and handrails.
  box(0.3, 0.08, 0.12, yellow, 0, 0.84, 0.15);
  cyl(0.05, 0.32, red, -1.12, -0.5, 0.25);
  box(0.12, 0.2, 0.1, white, 1.12, -0.35, 0.3); // water dispenser
  box(0.04, 0.02, 0.04, glow, 1.07, -0.3, 0.3);
  for (const x of [-0.6, 0.6]) box(0.03, 0.03, 0.9, yellow, x, 0.82, 0.2); // roof handrails
  return g;
}

/** A dark display with a title and a few faint chart lines (static; live data is on the HUD). */
function screenTexture(title: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#061820";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = color;
  ctx.font = "bold 20px monospace";
  ctx.fillText(title, 12, 26);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) ctx.lineTo(12 + i * 19, 60 + k * 22 + Math.sin(i * 0.9 + k * 2 + title.length) * 6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
