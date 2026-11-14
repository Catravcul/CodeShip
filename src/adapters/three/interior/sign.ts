import * as THREE from "three";

/** A floating label (sprite) with white text on a dark rounded plate, 0.32 m tall. */
export function textSign(text: string): THREE.Sprite {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const font = "bold 44px system-ui, sans-serif";
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width) + 48;
  c.height = 72;
  ctx.font = font;
  ctx.fillStyle = "#0b2a36dd";
  ctx.beginPath();
  ctx.roundRect(0, 0, c.width, c.height, 18);
  ctx.fill();
  ctx.fillStyle = "#e6f6ff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 24, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  const h = 0.32;
  sprite.scale.set((h * c.width) / c.height, h, 1);
  return sprite;
}
