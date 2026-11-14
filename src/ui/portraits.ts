/**
 * Portraits for the radio, drawn from the design sheets described in Cold Sanctuary's
 * docs/diseno-personajes.md (the sheet images themselves are not in either repository).
 * Nevaeh is the Magnate of Cold Sanctuary. Doménica's portrait is the designer's own drawing
 * (src/assets/domenica-face.webp, 100×100).
 */
import domenicaFace from "../assets/domenica-face.webp";

/** Doménica's long lavender hair, sampled from her portrait (used by the 3D figure too). */
export const DOMENICA_HAIR = 0x9f86d6;

const frame = (inner: string) => `<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="27" fill="#1d3b52" stroke="#7fdcff" stroke-width="2"/>${inner}</svg>`;

/** Navy bob with straight fringe and long front locks, brown eyes, purple lips, high white collar, purple bolero, maroon corset with gold trim. */
const NEVAEH = frame(`
  <path d="M8 54c2-10 9-15 20-15s18 5 20 15z" fill="#6a3d8f"/>
  <path d="M20 54l2-13h12l2 13z" fill="#7a1f2b" />
  <path d="M20 54l2-13M36 54l-2-13" stroke="#d9ab3a" stroke-width="1.2"/>
  <rect x="23" y="33" width="10" height="8" rx="2" fill="#f4f4f4"/>
  <circle cx="28" cy="24" r="9.5" fill="#f1d9b5"/>
  <path d="M17 27c-1-10 4-16 11-16s12 6 11 16l-2 9h-3l1-9c-2-1-5-2-7-2s-5 1-7 2l1 9h-3z" fill="#1b2347"/>
  <path d="M19 20h18v4H19z" fill="#1b2347"/>
  <circle cx="24.5" cy="25" r="1.2" fill="#5a3418"/><circle cx="31.5" cy="25" r="1.2" fill="#5a3418"/>
  <path d="M25.5 30q2.5 1.5 5 0" stroke="#7b2d8c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);

/** Red wool beanie, mid-length black hair, round glasses, stubble, purple vest with sheepskin collar over a navy tee. */
const KUSHAL = frame(`
  <path d="M8 54c2-10 9-15 20-15s18 5 20 15z" fill="#22305a"/>
  <path d="M10 54c2-9 7-13 12-14l4 14zM46 54c-2-9-7-13-12-14l-4 14z" fill="#6b3f8e"/>
  <path d="M19 40c3 2 6 3 9 3s6-1 9-3" stroke="#efe6d2" stroke-width="3" fill="none"/>
  <circle cx="28" cy="25" r="9.5" fill="#f2c4b0"/>
  <path d="M18 26c0 6 1 10 3 12l1-10zM38 26c0 6-1 10-3 12l-1-10z" fill="#141414"/>
  <path d="M18 21c0-7 4-11 10-11s10 4 10 11z" fill="#c8302c"/>
  <rect x="17" y="19" width="22" height="3.5" rx="1.5" fill="#a52623"/>
  <circle cx="24.3" cy="25.5" r="3" fill="none" stroke="#222" stroke-width="1"/><circle cx="31.7" cy="25.5" r="3" fill="none" stroke="#222" stroke-width="1"/>
  <path d="M27.3 25.5h1.4" stroke="#222" stroke-width="1"/>
  <path d="M21 29c1 5 4 7 7 7s6-2 7-7c-2 2-4 3-7 3s-5-1-7-3z" fill="#3a2a22" opacity=".45"/>`);

const initial = (name: string) =>
  frame(`<path d="M10 50c3-11 11-15 18-15s15 4 18 15" fill="#7fdcff"/><circle cx="28" cy="22" r="10" fill="#c99a76"/>
  <text x="46" y="52" font-size="12" font-family="monospace" fill="#ffd27f">${name[0]?.replace(/[<&>]/g, "") ?? "?"}</text>`);

const DOMENICA = `<img class="portrait-img" src="${domenicaFace}" alt="" width="56" height="56" style="border-radius:50%;border:2px solid #7fdcff;object-fit:cover;background:#1d3b52">`;

export function portrait(name: string): string {
  if (name === "Doménica") return DOMENICA;
  if (name === "Nevaeh") return NEVAEH;
  if (name === "Kushal") return KUSHAL;
  return initial(name);
}
