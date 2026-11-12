import * as THREE from "three";

/**
 * First-person cockpit built from code: canopy frame, side windows, a rear bulkhead and a
 * dashboard with three screens, two crew seats and basic crew services. Fixed to the ship: the pilot can turn their head and look out of the side windows.
 */
export function buildCockpit(): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.5 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8, metalness: 0.2 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x3fd0ff });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    g.add(m);
    return m;
  };

  // Dashboard: a low console under the windshield with a sloped glass panel of three screens
  // (navigation, ship systems, life support) facing the pilot.
  box(2.2, 0.36, 0.45, panel, 0, -0.62, -0.85);
  const slope = new THREE.Group();
  slope.position.set(0, -0.44, -0.66);
  slope.rotation.x = -0.75;
  g.add(slope);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 0.03), frame);
  slope.add(bezel);
  [
    ["NAV", "#3fd0ff", -0.48],
    ["SISTEMAS", "#7dffb0", 0],
    ["SOPORTE VITAL", "#ffb347", 0.48],
  ].forEach(([label, color, x]) => {
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), new THREE.MeshBasicMaterial({ map: screenTexture(label as string, color as string) }));
    scr.position.set(x as number, 0, 0.017);
    slope.add(scr);
  });
  // Canopy pillars and top bar, kept to the edges so the view stays clear.
  box(0.07, 1.6, 0.07, frame, -0.98, 0.05, -0.85, 0, 0.2);
  box(0.07, 1.6, 0.07, frame, 0.98, 0.05, -0.85, 0, -0.2);
  box(2.4, 0.09, 0.09, frame, 0, 0.62, -0.85);
  // Side windows: sill, top rail and a middle pillar on each side.
  const wall = new THREE.MeshStandardMaterial({ color: 0x3a414b, roughness: 0.7, metalness: 0.3 });
  for (const sx of [-1, 1]) {
    box(0.08, 0.5, 2.0, wall, 1.2 * sx, -0.55, 0.1);
    box(0.08, 0.08, 2.0, frame, 1.2 * sx, 0.62, 0.1);
    box(0.08, 1.25, 0.08, frame, 1.2 * sx, 0.0, 0.25);
    box(0.08, 0.25, 2.0, wall, 1.2 * sx, 0.78, 0.1);
  }
  // Floor, roof and rear bulkhead with the hatch to the habitat.
  box(2.4, 0.04, 2.0, wall, 0, -0.8, 0.1);
  box(2.4, 0.04, 2.0, wall, 0, 0.9, 0.1);
  box(2.4, 1.7, 0.05, wall, 0, 0.05, 1.1);
  box(0.8, 1.3, 0.03, frame, 0, -0.1, 1.07);
  box(0.3, 0.06, 0.02, amber, 0, 0.4, 1.05);
  // Pilot seat (centre, under the camera) and a second crew seat, with harness straps.
  const strap = new THREE.MeshStandardMaterial({ color: 0x8a5a1a, roughness: 0.9 });
  for (const [x, w] of [
    [0, 0.5],
    [0.74, 0.42],
  ] as const) {
    box(w, 0.1, 0.5, panel, x, -0.65, 0.4);
    box(w, 0.75, 0.1, panel, x, -0.25, 0.68);
    box(0.05, 0.6, 0.012, strap, x - w / 4, -0.3, 0.625);
    box(0.05, 0.6, 0.012, strap, x + w / 4, -0.3, 0.625);
  }
  // Crew services on the bulkheads: emergency oxygen masks, fire extinguisher, water dispenser,
  // first-aid kit and handrails to move around in microgravity.
  const red = new THREE.MeshStandardMaterial({ color: 0xc0302a, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 });
  box(0.3, 0.08, 0.12, yellow, 0, 0.84, 0.3); // O2 masks box in the roof
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 12), red);
  ext.position.set(-1.12, -0.5, 0.9);
  g.add(ext);
  box(0.12, 0.2, 0.1, white, 1.12, -0.35, 0.85); // water dispenser
  box(0.04, 0.02, 0.04, glow, 1.07, -0.3, 0.85);
  box(0.2, 0.14, 0.06, white, -0.6, 0.45, 1.06); // first-aid kit
  box(0.06, 0.06, 0.006, red, -0.6, 0.45, 1.03);
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
