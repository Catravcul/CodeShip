import * as THREE from "three";
import type { Sky } from "@modules/celestial/domain/sky";
import { impostorForMagnitude } from "@modules/celestial/domain/lod";
import { PLANETS } from "@modules/celestial/data/planets";

/** Radius of the sky shell the impostors are drawn on, metres (inside the starfield at 1e6). */
export const SKY_SHELL_M = 9e5;
/** Angular radius of the Sun's glare, radians. A camera/eye effect, not the Sun's size. Game value. */
const GLARE_RAD = 0.11;

const radialTexture = (stops: [number, string][]) => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const POINT_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float aSize;
  attribute vec4 aColour;
  uniform float uPixelRatio;
  varying vec4 vColour;
  void main() {
    vColour = aColour;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
    #include <logdepthbuf_vertex>
  }`;
const POINT_FRAG = /* glsl */ `
  #include <logdepthbuf_pars_fragment>
  varying vec4 vColour;
  void main() {
    #include <logdepthbuf_fragment>
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.35, r);
    gl_FragColor = vec4(vColour.rgb, vColour.a * a);
  }`;

interface Label {
  el: HTMLElement;
  dir: THREE.Vector3;
}

/**
 * The Sun and the planets as impostors on a far shell that travels with the camera: a disc of the
 * Sun's true angular size with a glare halo, and one point per planet whose size and opacity come
 * from its apparent magnitude. Directions come from the domain sky (JPL elements).
 */
export class SkyBodies {
  readonly group = new THREE.Group();
  readonly sunDirection: THREE.Vector3;
  private readonly labels: Label[] = [];
  private readonly labelLayer: HTMLElement;
  private readonly material: THREE.ShaderMaterial;
  labelsOn = true;

  constructor(sky: Sky, root: HTMLElement) {
    const toV = (v: { x: number; y: number; z: number }) => new THREE.Vector3(v.x, v.y, v.z);
    this.sunDirection = toV(sky.sun.direction).normalize();
    this.group.renderOrder = -1;

    // Sun: true angular size (≈0,24° from 2,2 AU: a few pixels) plus glare so it reads as blinding.
    const sunPos = this.sunDirection.clone().multiplyScalar(SKY_SHELL_M);
    const disc = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: radialTexture([[0, "#ffffff"], [0.75, "#fffaf0"], [1, "#fff6e000"]]), color: 0xffffff, depthWrite: false, toneMapped: false, transparent: true }),
    );
    const discSize = 2 * Math.tan(sky.sun.angularDiameterRad / 2) * SKY_SHELL_M * 1.15;
    disc.scale.setScalar(discSize);
    disc.position.copy(sunPos);
    const glare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialTexture([[0, "#ffffffff"], [0.04, "#fff4dccc"], [0.15, "#ffd9a055"], [0.45, "#ffb07014"], [1, "#ff904000"]]),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
      }),
    );
    glare.scale.setScalar(2 * Math.tan(GLARE_RAD) * SKY_SHELL_M);
    glare.position.copy(sunPos);
    // Draw before anything transparent nearer (cockpit glass) so depth-sorted glass doesn't clip them.
    glare.renderOrder = disc.renderOrder = -10;
    this.group.add(glare, disc);

    // Planets: points whose size/opacity follow their apparent magnitude.
    const n = sky.planets.length;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const colour = new Float32Array(n * 4);
    sky.planets.forEach((p, i) => {
      const d = toV(p.direction).normalize();
      d.clone().multiplyScalar(SKY_SHELL_M * 0.99).toArray(pos, i * 3);
      const imp = impostorForMagnitude(p.magnitude);
      size[i] = imp.sizePx;
      const c = new THREE.Color(PLANETS.find((x) => x.id === p.id)?.colour ?? 0xffffff);
      colour.set([c.r, c.g, c.b, imp.alpha], i * 4);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aColour", new THREE.BufferAttribute(colour, 4));
    this.material = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, this.material);
    points.frustumCulled = false;
    points.renderOrder = -10;
    this.group.add(points);

    // Labels: Sun and naked-eye planets, so the player can tell them from stars.
    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "sky-labels";
    root.appendChild(this.labelLayer);
    const add = (text: string, dir: THREE.Vector3, cls: string) => {
      const el = document.createElement("div");
      el.className = `sky-label ${cls}`;
      el.textContent = text;
      this.labelLayer.appendChild(el);
      this.labels.push({ el, dir });
    };
    add(`${sky.sun.name}`, this.sunDirection, "sun");
    // Planets within 3° of the Sun are lost in its glare: no label (they are still drawn).
    // Fainter than the naked-eye limit (≈6,5), no label either.
    const labelled = sky.planets.filter((p) => p.magnitude < 6.5 && toV(p.direction).normalize().dot(this.sunDirection) < Math.cos((3 * Math.PI) / 180));
    for (const p of labelled) add(`${p.name} ${p.magnitude < 0 ? "−" : ""}${Math.abs(p.magnitude).toFixed(1)}`, toV(p.direction).normalize(), p.magnitude > 5 ? "faint" : "");
  }

  /** Keeps the shell centred on the camera and places the labels. */
  update(camera: THREE.PerspectiveCamera, pixelRatio: number, visible: boolean): void {
    this.group.position.copy(camera.position);
    this.material.uniforms.uPixelRatio!.value = pixelRatio;
    this.labelLayer.classList.toggle("hidden", !visible || !this.labelsOn);
    if (!visible || !this.labelsOn) return;
    const w = window.innerWidth, h = window.innerHeight;
    const v = new THREE.Vector3();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    for (const l of this.labels) {
      if (l.dir.dot(fwd) <= 0.05) {
        l.el.style.display = "none";
        continue;
      }
      v.copy(l.dir).multiplyScalar(SKY_SHELL_M).add(camera.position).project(camera);
      if (Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) {
        l.el.style.display = "none";
        continue;
      }
      l.el.style.display = "block";
      l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }
}
