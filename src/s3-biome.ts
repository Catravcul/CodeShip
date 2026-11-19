import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { BIOME, biomeSpec } from "@modules/aerial-sanctuary/data/bioma";
import { BIOME_ISLAND } from "@modules/aerial-sanctuary/data/bioma-island";
import { BiomeLife, biomeGeo } from "@modules/aerial-sanctuary/application/biome-life";
import { census, count, dateLabel, dayOfYear, growthFactor, monthOfDay, type CensusRow } from "@modules/aerial-sanctuary/domain/bioma";
import { STAGE_LABEL, type Stage } from "@modules/fauna/domain/life-cycle";
import { BiomeScene } from "./adapters/three/s3-biome-models";

/**
 * Sanctuary 3's biome (docs/design/bioma-s3.md), wired with one line each into aerial-sanctuary.ts: the island's
 * living food chain (application/biome-life.ts) drawn by s3-biome-models.ts, and the census board of the field station:
 * its card shows only through the orange button when she stands at the board (reglas.md §5.8), like any machine's.
 */
export class S3Biome {
  readonly life: BiomeLife;
  readonly view: BiomeScene;
  /** Game days added by the test hook (`skip`) to the board clock. */
  private offset = 0;
  private readonly card: HTMLElement;
  private cardKey = "";
  private readonly board: { x: number; y: number; z: number };
  near = false;

  constructor(scene: THREE.Scene, ui: HTMLElement, private readonly L: S3Layout) {
    this.life = new BiomeLife(biomeGeo(L.k), 1);
    this.view = new BiomeScene(L.k);
    scene.add(this.view.root);
    const p = L.graph.points.find((q) => q.id === "bioma:estacion:censo")!;
    this.board = { x: p.x, y: p.y, z: p.z };
    this.card = document.createElement("div");
    this.card.className = "cab-machine s3-censo hidden";
    this.card.setAttribute("role", "region");
    this.card.setAttribute("aria-label", "Censo de la isla");
    ui.appendChild(this.card);
  }

  /** Game days of the island now. */
  days(boardDays: number): number {
    return boardDays + this.offset;
  }

  /** Test hook: let `gameDays` pass on the island. */
  skip(gameDays: number): void {
    this.offset += gameDays;
  }

  update(dt: number, boardDays: number, hour: number, body: { x: number; y: number; z: number; area: string }, t: number, camera: THREE.Camera): void {
    const onStage = body.area.startsWith("bioma");
    this.life.tick(dt, this.days(boardDays), t, hour, body, onStage);
    const C = BIOME_ISLAND.centre.value;
    const far = Math.hypot(camera.position.x - C.x, camera.position.z - C.z);
    // Out of sight past 900 m: the chain lives on, the scene is not drawn (mobile budget).
    this.view.root.visible = far < 900;
    if (this.view.root.visible) {
      const rows = census(this.life.state);
      const cover: Record<string, number> = {};
      for (const r of rows) if (r.cover !== undefined) cover[r.id] = r.cover;
      const tussac = biomeSpec("tussac");
      const season = tussac && tussac.kind === "planta" ? Math.min(1, growthFactor(tussac, dayOfYear(this.life.state.day)) * 1.6) : 1;
      this.view.update(t, this.life.poses(), cover, season);
    }
    this.near = onStage && Math.hypot(body.x - this.board.x, body.z - this.board.z) < 2.4 && Math.abs(body.y - this.board.y) < 1;
    this.renderCard();
  }

  private renderCard(): void {
    const st = this.life.state;
    const key = this.near ? `${Math.floor(st.day * 2)}|${st.events.length}|${st.events.at(-1)?.text}` : "";
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.card.classList.toggle("hidden", !this.near);
    if (!this.near) return;
    this.card.innerHTML = censusHtml(census(st), st.events.slice(-10).reverse().map((e) => ({ when: dateLabel(e.day), text: e.text })), dateLabel(st.day), monthOfDay(st.day));
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const kg = (n: number) => (n >= 1000 ? `${(Math.round(n / 100) / 10).toLocaleString("es-ES")} t` : `${Math.round(n).toLocaleString("es-ES")} kg`);
const SEASON = (m: number) => (m >= 12 || m <= 2 ? "verano austral" : m <= 5 ? "otoño" : m <= 8 ? "invierno" : "primavera");
const STAGES: readonly Stage[] = ["cria", "joven", "adulto", "anciano"];

/** The census card: each species with its count by stage, what it eats and who eats it, how fed it is; the last events. */
export function censusHtml(rows: readonly CensusRow[], events: readonly { when: string; text: string }[], date: string, month: number): string {
  const row = (r: CensusRow) => {
    const s = BIOME.find((x) => x.id === r.id)!;
    let n = "";
    if (r.kind === "animal") n = `<b class="cz-n">${r.count}</b> ${STAGES.filter((k) => r.stages[k] > 0).map((k) => `${STAGE_LABEL[k]} ${r.stages[k]}`).join(" · ") || "ninguno ahora"}`;
    else if (r.kind === "banco") n = `<b class="cz-n">≈ ${count(r.count)}</b> (${kg(r.kg)}) · ${STAGES.filter((k) => r.stages[k] >= 1).map((k) => `${k === "cria" ? "larvas y huevos" : STAGE_LABEL[k]} ${count(r.stages[k])}`).join(" · ")}`;
    else n = `<b class="cz-n">${Math.round((r.cover ?? 0) * 100)} %</b> de lo que cabe (${kg(r.kg)})`;
    const fed = r.kind === "planta" ? "" : r.fed < 0.8 ? ` · <b class="cz-hungry" aria-label="pasa hambre">⚠ come el ${Math.round(r.fed * 100)} %</b>` : "";
    const eats = r.eats.length ? `<small>Come: ${esc(r.eats.join(", "))}</small>` : "";
    const by = r.eatenBy.length ? `<small>Lo comen: ${esc(r.eatenBy.join(", "))}</small>` : "";
    const dead = Object.entries(r.deaths).filter(([, v]) => (v ?? 0) >= 1);
    const deaths = r.kind === "animal" && dead.length ? `<small>Muertes: ${dead.map(([c, v]) => `${c === "depredacion" ? "cazados" : c === "sin-madre" ? "crías sin madre" : c} ${Math.round(v!)}`).join(", ")} · nacidos ${r.births}</small>` : "";
    return `<li data-especie="${r.id}"><span class="cz-name">${esc(r.name)} <i>${esc(s.latin)}</i></span><span>${n}${fed}${r.note ? ` · ${esc(r.note)}` : ""}</span>${eats}${by}${deaths}</li>`;
  };
  const group = (title: string, kind: CensusRow["kind"]) => `<h4>${title}</h4><ul class="cz-list">${rows.filter((r) => r.kind === kind).map(row).join("")}</ul>`;
  return `<div class="cm-head"><b>Censo de la isla</b><small>Estación de investigación · ${esc(date)} · ${SEASON(month)}</small></div>
<div class="cz-body">${group("Aves y focas", "animal")}${group("Mar y suelo: kril, peces, calamar, invertebrados", "banco")}${group("Plantas y algas", "planta")}
<h4>Últimos sucesos</h4><ul class="cz-events">${events.map((e) => `<li><small>${esc(e.when)}</small> ${esc(e.text)}</li>`).join("") || "<li>Aún nada</li>"}</ul>
<p class="cz-note"><small>Un año de la isla dura 28 días de juego (Cold Sanctuary): cada día de juego son unos 13 días de vida.</small></p></div>`;
}
