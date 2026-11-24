import "./loading-screen.css";

/**
 * While a sanctuary loads (Berón 2026-11-24: «sanctuary1 está tardando en cargar… una imagen mientras carga… un modelo
 * representativo del santuario… la palabra con 3 puntitos donde el último parpadea»): a drawing of sanctuary 1 (its
 * ice caps and sea, the trees with their floors, the whales' globe with the octopus egg, a carpet crossing) and
 * «Cargando» with its dots, the last one blinking. Plain SVG and CSS: it is up before any of the game's code arrives.
 */
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

const PICTURES: Readonly<Record<string, { title: string; svg: string }>> = {
  "santuario-1": { title: "Santuario 1 · Terrestre", svg: SANTUARIO_1 },
};

let current: HTMLElement | undefined;

/** Shows the loading screen of a sanctuary (until `doneLoading`). */
export function showLoading(id: keyof typeof PICTURES & string, host: HTMLElement = document.body): void {
  const p = PICTURES[id];
  if (!p || current) return;
  const el = document.createElement("div");
  el.className = "cs-loading";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="cs-loading-art">${p.svg}</div><div class="cs-loading-title">${p.title}</div><div class="cs-loading-text">Cargando<span>.</span><span>.</span><span class="cs-loading-last">.</span></div>`;
  host.appendChild(el);
  current = el;
}

/** The sanctuary is up: the loading screen fades out. */
export function doneLoading(): void {
  const el = current;
  if (!el) return;
  current = undefined;
  el.classList.add("cs-loading-out");
  setTimeout(() => el.remove(), 600);
}
