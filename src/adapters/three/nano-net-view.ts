import * as THREE from "three";
import type { NanoNet } from "@modules/nano-net/domain/network";
import { NANO_TUNING, type NodeRole } from "@modules/nano-net/domain/core";

const ROLE_COLOR: Record<NodeRole, number> = { energia: 0xffd27f, escudo: 0x7fdcff, impulso: 0xd08cff };
const BROKEN = 0xff4a3a;

/** Soft round glow used for every node (drawn in screen space, so it stays visible from far away). */
function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const v3 = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);

/**
 * The nano_net in the flight scene: each node a small glowing point coloured by what it gives,
 * beams to the core and mesh links as faint lines, and the covered ring as a translucent band.
 * Reads the domain; never changes it.
 */
export class NanoNetView {
  readonly group = new THREE.Group();
  private readonly tex = glowTexture();
  private readonly sprites = new Map<string, THREE.Sprite>();
  private readonly lines: THREE.LineSegments;
  private readonly bands = new Map<string, THREE.Mesh>();
  private readonly remotes: THREE.Sprite[] = [];
  private key = "";

  constructor(scene: THREE.Scene, private readonly net: NanoNet) {
    this.lines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.group.add(this.lines);
    for (const r of net.remotes) {
      const s = this.sprite(0xa0ffd0, 0.018);
      s.position.copy(v3(r.position));
      this.remotes.push(s);
      this.group.add(s);
    }
    scene.add(this.group);
  }

  private sprite(color: number, size: number): THREE.Sprite {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false }),
    );
    s.scale.setScalar(size);
    return s;
  }

  update(timeS: number): void {
    const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(timeS * 6));
    const pulse = 0.85 + 0.15 * Math.sin(timeS * 2);
    const seen = new Set<string>();
    const segments: THREE.Vector3[] = [];
    let key = "";
    for (const core of this.net.cores) {
      const connected = new Set(core.connectedNodes().map((n) => n.id));
      const center = v3(core.position);
      for (const n of core.nodes) {
        seen.add(n.id);
        let s = this.sprites.get(n.id);
        if (!s) {
          s = this.sprite(ROLE_COLOR[n.role], 0.03);
          this.sprites.set(n.id, s);
          this.group.add(s);
        }
        s.position.copy(v3(n.position));
        const mat = s.material;
        mat.color.setHex(n.working ? ROLE_COLOR[n.role] : BROKEN);
        mat.opacity = n.working ? (connected.has(n.id) ? pulse : 0.5) : blink;
        key += `${n.id}:${n.position.x.toFixed(0)},${n.position.z.toFixed(0)},${connected.has(n.id) ? 1 : 0};`;
        // A beam from the core's surface to each node that hangs from it directly (before the mesh).
        if (connected.has(n.id) && !core.meshed) {
          const p = v3(n.position);
          segments.push(center.clone().add(p.clone().sub(center).setLength(core.radiusM)), p);
        }
      }
      const byId = new Map(core.nodes.map((n) => [n.id, n]));
      for (const [a, b] of core.links) {
        if (!connected.has(a) || !connected.has(b)) continue;
        segments.push(v3(byId.get(a)!.position), v3(byId.get(b)!.position));
      }
      if (core.linkedTo && connected.size) segments.push(v3(core.nodes[0]!.position), v3(core.linkedTo.position));
      // The ring the meshed network covers.
      let band = this.bands.get(core.id);
      if (!band) {
        const r = core.ringRadiusM;
        band = new THREE.Mesh(
          new THREE.RingGeometry(r - NANO_TUNING.nodeRangeM * 0.6, r + NANO_TUNING.nodeRangeM * 0.6, 96),
          new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.035, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        band.rotation.y = Math.PI / 2; // the ring is polar (YZ plane)
        band.position.copy(center);
        this.bands.set(core.id, band);
        this.group.add(band);
      }
      band.visible = core.meshed && connected.size > 0;
      key += `${core.id}:${core.meshed}:${core.linkedTo?.id}:${connected.size};`;
    }
    for (const [id, s] of this.sprites)
      if (!seen.has(id)) {
        this.group.remove(s);
        this.sprites.delete(id);
      }
    for (const r of this.remotes) r.material.opacity = 0.5 + 0.3 * Math.sin(timeS * 1.3);
    if (key !== this.key) {
      this.key = key;
      this.lines.geometry.dispose();
      this.lines.geometry = new THREE.BufferGeometry().setFromPoints(segments);
    }
  }
}
