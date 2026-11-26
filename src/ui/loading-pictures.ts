import type { LevelId } from "@modules/levels/data/levels";

/**
 * The loading screens' drawings, one per sanctuary (Berón 2026-11-24 and 11-25: «se ha agregado una pantalla de carga
 * a sanctuary1, habría que agregar una a los demás sanctuarys, como regla todos los sanctuarys deben ser
 * equivalentes»; reglas.md §5.3). Plain SVG in one style (a 360 × 300 scene, the sky's gradient, a few slow
 * animations in loading-screen.css): it is up before any of the game's code arrives.
 *
 * `PICTURES` has a key for every level (a new level id does not compile without one) and every playable level must
 * have its drawing (loading-pictures.test.ts): a level that starts always shows its loading screen.
 */
export interface LoadingPicture {
  readonly title: string;
  readonly svg: string;
}

/** Sanctuary 1: its ice caps and sea, the trees with their floors, the whales' globe with the octopus egg, a carpet crossing. */
const SANTUARIO_1 = `
<svg viewBox="0 0 360 300" role="img" aria-label="El santuario 1: árboles con pisos sobre el mar entre los casquetes de hielo, y el globo de las ballenas">
  <defs>
    <linearGradient id="ld-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1a2e"/><stop offset="0.7" stop-color="#1d4a6e"/><stop offset="1" stop-color="#5f9cc0"/></linearGradient>
    <linearGradient id="ld-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6f9e"/><stop offset="1" stop-color="#0b2f4a"/></linearGradient>
    <radialGradient id="ld-globe" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#7fd0f0" stop-opacity="0.55"/><stop offset="1" stop-color="#14507e" stop-opacity="0.35"/></radialGradient>
    <linearGradient id="ld-aurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5ff0b0" stop-opacity="0"/><stop offset="0.5" stop-color="#5ff0b0" stop-opacity="0.35"/><stop offset="1" stop-color="#8f7ff0" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="360" height="300" fill="url(#ld-sky)"/>
  <path class="ld-aurora" d="M-10 60 C 60 20, 140 90, 220 40 S 340 50, 380 30 L 380 70 C 300 90, 220 60, 150 110 S 30 90, -10 100 Z" fill="url(#ld-aurora)"/>
  <g fill="#e8f1f7" opacity="0.8">${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 137) % 360}" cy="${(i * 53) % 120}" r="${i % 4 ? 0.7 : 1.2}"/>`).join("")}</g>
  <!-- The ice caps on both sides, the sea between them. -->
  <path d="M0 218 L0 300 L360 300 L360 214 L300 206 L250 214 L110 214 L60 204 Z" fill="url(#ld-sea)"/>
  <path d="M0 214 L58 202 L96 214 L0 226 Z M262 214 L300 204 L360 210 L360 224 Z" fill="#e6f2f8"/>
  <path class="ld-wave" d="M100 222 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="#9fd6f0" stroke-width="1.2" fill="none" opacity="0.6"/>
  <!-- The whales' globe on its nozzle, with the octopus egg in its belly. -->
  <path d="M168 214 C 172 190, 176 176, 178 160 L 190 160 C 192 176, 196 190, 200 214 Z" fill="#2b7fb0" opacity="0.6"/>
  <circle cx="184" cy="112" r="56" fill="url(#ld-globe)" stroke="#9fe0ff" stroke-opacity="0.5"/>
  <ellipse class="ld-egg" cx="184" cy="114" rx="9" ry="22" fill="#d8f4ff" fill-opacity="0.25" stroke="#d8f4ff" stroke-opacity="0.6"/>
  <ellipse cx="184" cy="120" rx="5" ry="10" fill="#bfe6a0"/>
  <circle cx="184" cy="104" r="5" fill="#5fc2b8"/>
  <path class="ld-whale" d="M150 92 q10 -6 22 0 q-10 5 -22 0 m22 0 l6 -4 l-1 4 l1 4 z" fill="#2a4d6b"/>
  <!-- Trees: trunks with their floors and their crowns. -->
  ${tree(54, 214, 150, ["#c98a5a", "#8fb3c9", "#d9c38f", "#a7c98f"])}
  ${tree(292, 214, 170, ["#9f8fc9", "#c9a78f", "#8fc9b8", "#c98fa7", "#b3c98f"])}
  ${tree(120, 214, 110, ["#c9b38f", "#8fa7c9", "#c9c98f"])}
  <!-- A carpet crossing between the trees. -->
  <g class="ld-carpet"><path d="M0 0 l22 0 l-3 4 l-22 0 z" fill="#c84f4f"/><circle cx="8" cy="-3" r="2.2" fill="#2f7f8f"/></g>
</svg>`;

/** A tree: its trunk and its floors (slabs jutting out, each with its colour), its crown on top. */
function tree(x: number, base: number, h: number, floors: readonly string[]): string {
  const step = h / (floors.length + 1);
  const slabs = floors
    .map((c, i) => {
      const y = base - step * (i + 1);
      const w = 30 + (i % 2) * 8;
      return `<rect x="${x - w / 2}" y="${y - 4}" width="${w}" height="5" rx="1" fill="${c}"/><rect x="${x - w / 2 + 2}" y="${y - 12}" width="${w - 4}" height="8" fill="#cfe6f2" opacity="0.25"/>`;
    })
    .join("");
  return `<g><rect x="${x - 5}" y="${base - h}" width="10" height="${h}" fill="#1a1d22"/>${slabs}<ellipse cx="${x}" cy="${base - h - 6}" rx="24" ry="14" fill="#3f7a4a"/><ellipse cx="${x - 9}" cy="${base - h - 12}" rx="12" ry="9" fill="#4f8f5a"/></g>`;
}

/**
 * Sanctuary 3, the aerial one: the pyramid mountain covered in earth with its glowing caves, the colossal trees inside
 * suggested by its entrance, the clouds, the bee's pupa in its translucent cell among the trees, giant insects and the flying carpets.
 */
const SANTUARIO_3 = `
<svg viewBox="0 0 360 300" role="img" aria-label="El santuario 3: la montaña pirámide de tierra con sus cuevas que brillan y los árboles colosales dentro, nubes, la pupa de la abeja en su celda translúcida, insectos gigantes y alfombras voladoras">
  <defs>
    <linearGradient id="ld3-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16325e"/><stop offset="0.55" stop-color="#5f9cc8"/><stop offset="1" stop-color="#f0d3a2"/></linearGradient>
    <linearGradient id="ld3-earth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6240"/><stop offset="1" stop-color="#4a3220"/></linearGradient>
    <radialGradient id="ld3-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe7a0"/><stop offset="0.5" stop-color="#ffb84a" stop-opacity="0.8"/><stop offset="1" stop-color="#ff9a2e" stop-opacity="0"/></radialGradient>
    <radialGradient id="ld3-inside" cx="0.5" cy="0.85" r="0.8"><stop offset="0" stop-color="#9fe07a" stop-opacity="0.75"/><stop offset="1" stop-color="#14200f"/></radialGradient>
    <clipPath id="ld3-door"><path d="M146 262 L146 228 Q146 196 180 192 Q214 196 214 228 L214 262 Z"/></clipPath>
  </defs>
  <rect width="360" height="300" fill="url(#ld3-sky)"/>
  <g fill="#e8f1f7" opacity="0.7">${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 97) % 360}" cy="${(i * 41) % 70}" r="${i % 3 ? 0.6 : 1.1}"/>`).join("")}</g>
  <!-- Far clouds. -->
  <g class="ld3-cloud" fill="#ffffff" opacity="0.55">${cloud(40, 150, 1.2)}${cloud(300, 170, 1)}</g>
  <!-- The pyramid mountain, covered in earth, grass on its ledges. -->
  <path d="M40 266 L180 52 L320 266 Z" fill="url(#ld3-earth)"/>
  <path d="M180 52 L320 266 L246 266 Z" fill="#3b281a" opacity="0.45"/>
  <g fill="#5f8f45" opacity="0.9"><path d="M120 150 q16 -6 30 0 l-4 5 q-12 -3 -24 0 Z"/><path d="M196 118 q14 -5 26 1 l-3 4 q-10 -3 -21 0 Z"/><path d="M92 206 q22 -7 40 0 l-5 6 q-15 -4 -30 0 Z"/><path d="M232 196 q18 -6 34 0 l-4 5 q-13 -3 -26 0 Z"/><path d="M162 92 q10 -4 18 0 l-2 3 q-7 -2 -14 0 Z"/></g>
  <!-- Its caves, glowing. -->
  ${[[150, 140, 9], [212, 128, 7], [118, 196, 10], [252, 214, 9], [182, 98, 6], [204, 174, 8]].map(([x, y, r], i) => `<g class="ld3-cave" style="animation-delay:${i * 0.4}s"><circle cx="${x}" cy="${y}" r="${r! * 2.2}" fill="url(#ld3-glow)"/><path d="M${x! - r!} ${y! + r! * 0.6} Q${x} ${y! - r!} ${x! + r!} ${y! + r! * 0.6} Z" fill="#ffd27a"/></g>`).join("")}
  <!-- The entrance: the colossal trees inside, their trunks and the light of their crowns. -->
  <g clip-path="url(#ld3-door)">
    <rect x="140" y="188" width="80" height="80" fill="url(#ld3-inside)"/>
    <rect x="156" y="200" width="9" height="66" fill="#3a2414"/><rect x="186" y="194" width="12" height="72" fill="#2e1c10"/><rect x="204" y="206" width="7" height="60" fill="#3a2414"/>
    <ellipse cx="162" cy="204" rx="14" ry="8" fill="#6fae4f"/><ellipse cx="193" cy="198" rx="18" ry="9" fill="#7fc05a"/><ellipse cx="210" cy="210" rx="10" ry="6" fill="#6fae4f"/>
    <!-- The bee's pupa at the middle: a translucent cell of wax, the bee inside. -->
    <path d="M172 262 L172 222 L180 217 L188 222 L188 262 Z" fill="#f2c868" opacity="0.45" stroke="#a07a28" stroke-width="1"/>
    <g class="ld3-bee"><ellipse cx="180" cy="242" rx="3.6" ry="8" fill="#f4eee0"/><circle cx="180" cy="232" r="2.6" fill="#8a4a8a"/><path d="M177 244 h6 M177 248 h6" stroke="#9a6a28" stroke-width="1.2"/></g>
  </g>
  <path d="M146 262 L146 228 Q146 196 180 192 Q214 196 214 228 L214 262" fill="none" stroke="#2a1a0e" stroke-width="4"/>
  <path d="M0 262 L360 262 L360 300 L0 300 Z" fill="#46703a"/>
  <path d="M0 262 q30 -6 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" fill="#5a8a46"/>
  <!-- Near clouds. -->
  <g class="ld3-cloud ld3-cloud-near" fill="#ffffff" opacity="0.85">${cloud(70, 232, 1.4)}${cloud(318, 120, 0.9)}</g>
  <!-- Giant insects: a dragonfly and a butterfly. -->
  <g class="ld3-dragonfly"><path d="M40 92 L92 96" stroke="#1f5a4a" stroke-width="4" stroke-linecap="round"/><circle cx="93" cy="96" r="4" fill="#2f8f6f"/><ellipse cx="78" cy="88" rx="14" ry="4" fill="#cfefff" opacity="0.75" transform="rotate(-14 78 88)"/><ellipse cx="78" cy="103" rx="14" ry="4" fill="#cfefff" opacity="0.75" transform="rotate(14 78 103)"/><ellipse cx="66" cy="89" rx="11" ry="3.4" fill="#cfefff" opacity="0.6" transform="rotate(-10 66 89)"/><ellipse cx="66" cy="102" rx="11" ry="3.4" fill="#cfefff" opacity="0.6" transform="rotate(10 66 102)"/></g>
  <g class="ld3-butterfly"><path d="M250 42 q-14 -14 -18 2 q6 10 18 2 Z" fill="#e07a3a"/><path d="M250 42 q14 -14 18 2 q-6 10 -18 2 Z" fill="#e07a3a"/><path d="M250 44 q-10 10 -4 14 q6 -2 4 -14 Z M250 44 q10 10 4 14 q-6 -2 -4 -14 Z" fill="#b8562a"/><path d="M250 36 v18" stroke="#2a1a0e" stroke-width="1.6"/></g>
  <!-- A flying carpet with its rider, and another far off. -->
  <g class="ld-carpet"><path d="M0 0 l26 0 l-3 4 l-26 0 z" fill="#c84f4f"/><path d="M-3 4 l26 0" stroke="#f2c96a" stroke-width="1" stroke-dasharray="2 2"/><circle cx="9" cy="-4" r="2.6" fill="#2f7f8f"/><rect x="7" y="-2" width="4" height="3" fill="#2f7f8f"/></g>
  <g class="ld3-carpet-far"><path d="M300 150 l14 0 l-2 2.4 l-14 0 z" fill="#7f4fc8"/><circle cx="305" cy="148" r="1.5" fill="#f2c96a"/></g>
</svg>`;

/** A cloud: a few white puffs, `k` its size. */
function cloud(x: number, y: number, k: number): string {
  return [[0, 0, 14], [-14, 4, 10], [14, 4, 11], [4, -8, 10]].map(([dx, dy, r]) => `<circle cx="${x + dx! * k}" cy="${y + dy! * k}" r="${r! * k}"/>`).join("");
}

/**
 * Sanctuary 6, space: the Starship, the ISS, an asteroid and the stars, over the Earth's limb.
 */
const SANTUARIO_6 = `
<svg viewBox="0 0 360 300" role="img" aria-label="El santuario 6: la Starship, la Estación Espacial Internacional y un asteroide entre las estrellas, sobre el borde de la Tierra">
  <defs>
    <linearGradient id="ld6-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02040c"/><stop offset="1" stop-color="#0b1838"/></linearGradient>
    <radialGradient id="ld6-earth" cx="0.4" cy="0.2" r="0.8"><stop offset="0" stop-color="#4fa8e0"/><stop offset="0.6" stop-color="#1d5a9a"/><stop offset="1" stop-color="#0a2a50"/></radialGradient>
    <linearGradient id="ld6-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5e6670"/><stop offset="0.45" stop-color="#e6ebf0"/><stop offset="1" stop-color="#8a939c"/></linearGradient>
    <radialGradient id="ld6-rock" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#8f8070"/><stop offset="1" stop-color="#3a322a"/></radialGradient>
  </defs>
  <rect width="360" height="300" fill="url(#ld6-sky)"/>
  <g fill="#e8f1f7">${Array.from({ length: 46 }, (_, i) => `<circle class="${i % 5 ? "" : "ld6-star"}" style="animation-delay:${(i % 7) * 0.3}s" cx="${(i * 131 + 17) % 360}" cy="${(i * 67 + 11) % 230}" r="${i % 6 ? 0.7 : 1.4}"/>`).join("")}</g>
  <!-- The Earth's limb and its thin atmosphere. -->
  <circle cx="180" cy="760" r="520" fill="url(#ld6-earth)"/>
  <circle cx="180" cy="760" r="524" fill="none" stroke="#8fd6ff" stroke-opacity="0.45" stroke-width="5"/>
  <path d="M40 268 q30 -8 60 -4 q-20 8 -60 4 Z M220 254 q40 -6 70 2 q-30 6 -70 -2 Z" fill="#e8f4ff" opacity="0.35"/>
  <!-- The ISS: the truss, its four pairs of solar wings, the modules and the radiators. -->
  <g class="ld6-iss"><g transform="translate(262 62) rotate(-8)">
    <rect x="-56" y="-2" width="112" height="4" fill="#c9ced4"/>
    ${[-50, -36, 36, 50].map((x) => `<rect x="${x - 5}" y="-34" width="10" height="30" fill="#b8862e" stroke="#6a4a1a" stroke-width="0.6"/><rect x="${x - 5}" y="4" width="10" height="30" fill="#b8862e" stroke="#6a4a1a" stroke-width="0.6"/>`).join("")}
    <rect x="-16" y="-5" width="32" height="10" rx="4" fill="#dfe3e8"/><rect x="-6" y="5" width="12" height="16" rx="4" fill="#cfd4da"/><rect x="-4" y="-20" width="8" height="15" rx="3" fill="#cfd4da"/>
    <rect x="-24" y="6" width="6" height="14" fill="#f4f6f8"/><rect x="18" y="6" width="6" height="14" fill="#f4f6f8"/>
  </g></g>
  <!-- The asteroid, slowly turning. -->
  <g class="ld6-rock"><path d="M268 186 q14 -20 36 -14 q22 2 26 22 q6 20 -12 32 q-18 12 -36 2 q-22 -8 -20 -24 q0 -10 6 -18 Z" fill="url(#ld6-rock)"/><circle cx="290" cy="192" r="5" fill="#2e2822" opacity="0.6"/><circle cx="310" cy="212" r="3.4" fill="#2e2822" opacity="0.6"/><circle cx="282" cy="214" r="2.6" fill="#2e2822" opacity="0.5"/></g>
  <!-- The Starship: steel, black tiles on its windward side, its flaps and its engines. -->
  <g class="ld6-ship"><g transform="translate(96 150) rotate(-24)">
    <path d="M-12 70 L-12 -40 Q-12 -76 0 -92 Q12 -76 12 -40 L12 70 Z" fill="url(#ld6-steel)"/>
    <path d="M-12 70 L-12 -40 Q-12 -76 0 -92 L-3 -88 Q-7 -70 -7 -40 L-7 70 Z" fill="#1c1f24"/>
    <path d="M-12 -46 L-22 -30 L-12 -28 Z M12 -46 L22 -30 L12 -28 Z" fill="#2a2e34"/>
    <path d="M-12 46 L-26 70 L-12 70 Z M12 46 L26 70 L12 70 Z" fill="#2a2e34"/>
    <path d="M-8 70 L-10 78 L-4 78 L-3 70 M3 70 L4 78 L10 78 L8 70" fill="#4a4f57"/>
    <path class="ld6-flame" d="M-8 78 Q-6 96 0 104 Q6 96 8 78 Z" fill="#7fdcff" opacity="0.55"/>
  </g></g>
</svg>`;

/** Every level's loading drawing; `undefined` only for a level that does not start yet (its card says why). */
export const PICTURES: Readonly<Record<LevelId, LoadingPicture | undefined>> = {
  terrestre: { title: "Santuario 1 · Terrestre", svg: SANTUARIO_1 },
  marino: undefined,
  aereo: { title: "Santuario 3 · Aéreo", svg: SANTUARIO_3 },
  subterraneo: undefined,
  nucleo: undefined,
  espacio: { title: "Santuario 6 · Espacio", svg: SANTUARIO_6 },
};
