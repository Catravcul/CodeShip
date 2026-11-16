import type { IconShape, SpeciesIcon } from "@modules/adoption/domain/entry";

/**
 * A photo-like procedural icon for a catalogue entry: the species' silhouette in its real colours, with a soft
 * light from above-left, a shadow under it and a blurred backdrop of its habitat (water, soil or leaves), like a
 * macro photo. Pure SVG, no image files.
 */
const SHAPES: Readonly<Record<IconShape, string>> = {
  gato: `<path d="M18 46c-2-9 2-18 10-21l-3-10 8 7c3-1 6-1 9 0l8-7-3 10c8 3 12 12 10 21-3 7-11 10-19 10s-17-3-20-10z" fill="url(#b)"/><circle cx="28" cy="36" r="2.3" fill="#1b1b12"/><circle cx="40" cy="36" r="2.3" fill="#1b1b12"/><path d="M32 41l-2 2h4z" fill="ACC"/><path d="M14 40h10M14 44h10M44 40h10M44 44h10" stroke="#fff8" stroke-width="0.8"/>`,
  perro: `<path d="M18 30c0-9 6-14 14-14s14 5 14 14v8c0 9-6 16-14 16s-14-7-14-16z" fill="url(#b)"/><path d="M18 28c-6 2-8 12-4 18 3-4 4-9 4-18zM46 28c6 2 8 12 4 18-3-4-4-9-4-18z" fill="ACC"/><circle cx="27" cy="34" r="2.4" fill="#120c08"/><circle cx="37" cy="34" r="2.4" fill="#120c08"/><ellipse cx="32" cy="43" rx="4" ry="3" fill="#120c08"/>`,
  gallina: `<path d="M16 40c0-10 8-18 18-18 4-6 12-6 13 0 2 4 0 8-3 9 4 4 5 9 3 14-3 8-12 11-20 10-7-1-11-7-11-15z" fill="url(#b)"/><path d="M38 17c1-4 4-5 5-2 2-3 5-1 4 2 2 0 2 3 0 4h-9z" fill="ACC"/><path d="M48 25l6 2-6 2z" fill="#e8b020"/><circle cx="44" cy="24" r="1.6" fill="#120c08"/><path d="M46 30c1 3 0 5-2 5" stroke="ACC" stroke-width="2.5" fill="none"/>`,
  codorniz: `<ellipse cx="32" cy="38" rx="17" ry="13" fill="url(#b)"/><circle cx="45" cy="28" r="7" fill="url(#b)"/><path d="M51 28l5 1-5 2z" fill="#3a2a1a"/><circle cx="47" cy="27" r="1.4" fill="#120c08"/><path d="M20 34c4 2 8 2 12 0M22 40c4 2 8 2 12 0" stroke="ACC" stroke-width="1.6" fill="none"/>`,
  raton: `<ellipse cx="30" cy="40" rx="15" ry="10" fill="url(#b)"/><circle cx="43" cy="34" r="7" fill="url(#b)"/><circle cx="40" cy="26" r="5" fill="ACC"/><circle cx="47" cy="34" r="1.5" fill="#120c08"/><circle cx="50" cy="37" r="1.3" fill="ACC"/><path d="M15 42c-6 2-8 8-4 12" stroke="ACC" stroke-width="1.6" fill="none"/>`,
  pez: `<path d="M10 32c8-10 22-14 34-8l10-7v30l-10-7c-12 6-26 2-34-8z" fill="url(#b)"/><path d="M26 22c2 6 2 14 0 20" stroke="ACC" stroke-width="2" fill="none" opacity="0.7"/><circle cx="17" cy="30" r="2.4" fill="#0c0c10"/><path d="M28 20l6-6 4 7z" fill="ACC" opacity="0.8"/>`,
  caracol: `<path d="M10 48h40c4 0 6-3 4-6l-4-2" fill="ACC" stroke="ACC" stroke-width="3"/><circle cx="32" cy="34" r="15" fill="url(#b)"/><path d="M32 34m-10 0a10 10 0 1 1 10 10a6 6 0 1 1 -6 -6a2.5 2.5 0 1 1 2.5 2.5" stroke="ACC" stroke-width="2" fill="none"/><path d="M50 40l4-10M53 41l6-8" stroke="ACC" stroke-width="1.6"/>`,
  gamba: `<path d="M14 30c6-10 22-12 32-6 6 4 6 12 0 16-6 4-12 2-14 8l-6 6-2-8c-6-2-12-8-10-16z" fill="url(#b)"/><path d="M24 22c2 6 2 14-2 20M32 22c2 6 2 14-2 20M40 24c2 5 1 11-2 15" stroke="ACC" stroke-width="1.4" fill="none"/><path d="M46 24c6-8 12-10 16-10M46 26c6-4 12-4 16-2" stroke="ACC" stroke-width="1" fill="none"/><circle cx="44" cy="28" r="1.6" fill="#0c0c10"/>`,
  isopodo: `<ellipse cx="32" cy="34" rx="20" ry="13" fill="url(#b)"/><path d="M16 28h32M14 33h36M15 38h34M18 43h28" stroke="ACC" stroke-width="1.5"/><path d="M52 30l6-4M52 34l7 0" stroke="ACC" stroke-width="1.3"/>`,
  insecto: `<ellipse cx="34" cy="36" rx="16" ry="8" fill="url(#b)"/><circle cx="50" cy="34" r="5" fill="url(#b)"/><path d="M20 40l-8 8M28 42l-4 10M38 42l2 10M52 30c4-8 8-10 10-10M53 32c5-4 8-4 10-3" stroke="ACC" stroke-width="1.4" fill="none"/><path d="M22 32c6-6 16-6 22 0" stroke="ACC" stroke-width="1.6" fill="none" opacity="0.8"/>`,
  polilla: `<path d="M32 30c-8-12-24-10-22 2 2 10 14 10 22 4 8 6 20 6 22-4 2-12-14-14-22-2z" fill="url(#b)"/><ellipse cx="32" cy="36" rx="3" ry="9" fill="ACC"/><path d="M31 27c-3-6-6-8-8-8M33 27c3-6 6-8 8-8" stroke="ACC" stroke-width="1.2" fill="none"/>`,
  larva: `<path d="M12 40c4-8 12-10 20-8s16 2 20-6" stroke="url(#b)" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M18 34v10M24 32v10M30 32v10M36 33v10M42 31v10" stroke="ACC" stroke-width="1" opacity="0.6"/><circle cx="52" cy="26" r="2" fill="ACC"/>`,
  lombriz: `<path d="M8 42c8-12 14 4 22-6s14 6 24-4" stroke="url(#b)" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M30 35c1 2 1 4 0 6" stroke="ACC" stroke-width="3"/>`,
  colembolo: `<ellipse cx="32" cy="36" rx="14" ry="6" fill="url(#b)"/><circle cx="46" cy="34" r="4" fill="url(#b)"/><path d="M48 30c4-6 7-7 9-7M18 38c-4 4-8 6-10 6" stroke="ACC" stroke-width="1.3" fill="none"/>`,
  medusa: `<path d="M14 32c0-12 8-18 18-18s18 6 18 18c-6 3-30 3-36 0z" fill="url(#b)" opacity="0.85"/><path d="M20 34c-2 8 2 12 0 18M28 35c-1 8 2 12 0 18M36 35c1 8-2 12 0 18M44 34c2 8-2 12 0 18" stroke="ACC" stroke-width="1.4" fill="none"/><circle cx="26" cy="24" r="3" fill="ACC" opacity="0.6"/><circle cx="38" cy="24" r="3" fill="ACC" opacity="0.6"/>`,
  calamar: `<path d="M32 10c8 4 10 14 8 24H24c-2-10 0-20 8-24z" fill="url(#b)"/><path d="M24 34c-4 8-2 14-4 20M29 34c-1 8 0 14-1 20M35 34c1 8 0 14 1 20M40 34c4 8 2 14 4 20" stroke="url(#b)" stroke-width="2.4" fill="none"/><circle cx="32" cy="26" r="4" fill="ACC" opacity="0.9"/>`,
  tardigrado: `<ellipse cx="32" cy="34" rx="18" ry="10" fill="url(#b)"/><path d="M18 42v6M26 44v6M38 44v6M46 42v6" stroke="ACC" stroke-width="3" stroke-linecap="round"/><path d="M20 30c4-3 20-3 24 0" stroke="ACC" stroke-width="1" fill="none"/><circle cx="48" cy="31" r="1.4" fill="#120c08"/>`,
  planta: `<path d="M32 54V22" stroke="ACC" stroke-width="2.4"/><path d="M32 30c-10-2-14-10-12-16 8 0 12 8 12 16zM32 38c10-2 14-10 12-16-8 0-12 8-12 16zM32 46c-10-2-14-8-12-14 8 0 12 6 12 14z" fill="url(#b)"/>`,
  microbio: `<circle cx="24" cy="28" r="9" fill="url(#b)"/><circle cx="40" cy="38" r="11" fill="url(#b)"/><circle cx="26" cy="46" r="6" fill="url(#b)"/><circle cx="40" cy="38" r="3" fill="ACC"/><circle cx="24" cy="28" r="2.4" fill="ACC"/><path d="M50 38c4 2 6 6 6 10" stroke="ACC" stroke-width="1" fill="none"/>`,
};

const AQUATIC: ReadonlySet<IconShape> = new Set<IconShape>(["pez", "caracol", "gamba", "medusa", "calamar", "microbio"]);

/** Shade a #rrggbb colour by `f` (−1 black … 1 white). */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

let uid = 0;

/** The icon as an inline SVG string (`size` px square). */
export function speciesIcon(icon: SpeciesIcon, size = 56, label = ""): string {
  const id = `si${++uid}`;
  const wet = AQUATIC.has(icon.shape);
  const bg = wet ? ["#2f6f86", "#0b2733"] : icon.shape === "planta" ? ["#3e5a2a", "#141d10"] : ["#6a5338", "#1e1710"];
  const shape = SHAPES[icon.shape].replace(/ACC/g, icon.accent).replace(/url\(#b\)/g, `url(#${id}b)`);
  return `<svg class="species-icon" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${label}"><defs><radialGradient id="${id}g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${shade(icon.body, 0.25)}"/><stop offset="0.55" stop-color="${icon.body}"/><stop offset="1" stop-color="${shade(icon.body, -0.45)}"/></linearGradient><filter id="${id}f"><feGaussianBlur stdDeviation="1.2"/></filter></defs><rect width="64" height="64" rx="12" fill="url(#${id}g)"/>${wet ? `<circle cx="12" cy="14" r="2" fill="#fff3"/><circle cx="52" cy="10" r="1.4" fill="#fff3"/>` : `<ellipse cx="20" cy="58" rx="16" ry="5" fill="#0004" filter="url(#${id}f)"/>`}<ellipse cx="32" cy="55" rx="20" ry="3.5" fill="#0006" filter="url(#${id}f)"/>${shape}<ellipse cx="22" cy="20" rx="14" ry="7" fill="#ffffff" opacity="0.08"/></svg>`;
}
