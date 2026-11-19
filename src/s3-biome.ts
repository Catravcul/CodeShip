import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { BIOME, biomeSpec } from "@modules/aerial-sanctuary/data/bioma";
import { BIOME_ISLAND } from "@modules/aerial-sanctuary/data/bioma-island";
import { BiomeLife, biomeGeo } from "@modules/aerial-sanctuary/application/biome-life";
import { census, count, mass, dateLabel, dayOfYear, growthFactor, monthOfDay, type CensusRow } from "@modules/aerial-sanctuary/domain/bioma";
import { CROWDS } from "@modules/aerial-sanctuary/data/bioma-crowd";
import { crowdCounts, type CrowdCounts } from "@modules/aerial-sanctuary/domain/bioma-crowd";
import { STAGE_LABEL, type Stage } from "@modules/fauna/domain/life-cycle";
import { BiomeScene } from "./adapters/three/s3-biome-models";
import { StepShow } from "./adapters/three/interior/step-show";
import type { CubeFigure } from "./adapters/three/interior/figure";
import type { Chore } from "@modules/chores/domain/chore";
import { fieldAct, fieldJobs, type FieldJob } from "@modules/aerial-sanctuary/application/field-work";
import { focusReto, sheetLens } from "./adapters/three/interior/reto-focus";
import { chooseReto, offerReto } from "./ui/interaction";
import { RetoPicker } from "./ui/reto-picker";

/** The sheet of a challenge (aerial-sanctuary.ts `openChallenge`): `beat` on each right step, `done` on closing. */
type OpenChallenge = (chore: Chore, beat: (index: number, part: number) => void, done: (ok: boolean) => void) => void;

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
  /** At the hut's field table: the orange «Reto: Mesa de campo» button (ui/interaction.ts, as in sanctuary 1). */
  nearDesk = false;
  private readonly desk: { x: number; z: number };
  /** The choice between the field jobs (sanctuary 1's picker). */
  readonly picker: RetoPicker;
  private jobs: FieldJob[] = [];
  /** The total the running nest count asks for (the colony's nests when she started it). */
  counted?: number;
  private camera?: THREE.PerspectiveCamera;
  private her = { x: 0, y: 0, z: 0, yaw: 0 };
  /** The ships' step player, for the field jobs' steps at the table. */
  readonly steps = new StepShow();
  private open?: OpenChallenge;
  private say?: (text: string, seconds?: number) => void;
  /** The job on the sheet now, and her field notebook (jobs done). */
  working?: string;
  readonly notebook: { when: string; text: string }[] = [];

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
    // The field table, against the hut's west wall (adapters' furniture at local (−4,5, 1,5)).
    const d = this.view.deskAt;
    this.desk = { x: d.x, z: d.z };
    scene.add(this.steps.root);
    this.picker = new RetoPicker(ui);
  }

  /** The challenge sheet and the toast of aerial-sanctuary.ts (one line there). */
  wire(open: OpenChallenge, say: (text: string, seconds?: number) => void): void {
    this.open = open;
    this.say = say;
  }

  /** A field job on the sheet, acted out at the table: her notebook, the counter, the ring pliers. */
  start(i: number): void {
    const job = this.jobs[i];
    if (!job?.open || !this.open || this.working) return;
    const r = job.reto;
    this.working = r.procedure;
    this.counted = job.total;
    // The shared reto stage (reto-focus.ts): she at the table facing it, the camera past her shoulder in the strip
    // the sheet leaves free.
    if (this.camera) focusReto(this.steps, this.camera, this.her, this.her.yaw, { x: this.desk.x, y: 0.02, z: this.desk.z, sy: 0.75 });
    this.open(
      r.chore,
      (index, part) => {
        if (part === 0) this.steps.play(fieldAct(r.procedure!, index));
      },
      (ok) => {
        this.steps.clear();
        if (this.camera) sheetLens(this.camera, false);
        this.working = undefined;
        this.cardKey = "";
        if (!ok) return;
        const when = dateLabel(this.life.state.day);
        const text = r.procedure === "s3-contar-nidos" ? `Recuento de la colonia: ${count(job.total ?? 0)} nidos ocupados de papúa` : "Pollo de albatros viajero anillado y anotado";
        this.notebook.unshift({ when, text });
        this.notebook.splice(8);
        this.say?.(`${r.chore.title}: hecho. ${text}`, 5);
      },
    );
  }

  /** While a field job is on the sheet: she and the camera at the table (the step player); false otherwise. */
  frameReto(dt: number, camera: THREE.PerspectiveCamera, rig: THREE.Object3D, fig: CubeFigure): boolean {
    if (!this.steps.framing) return false;
    this.steps.frame(dt, camera, rig, fig);
    return true;
  }

  /**
   * At the table, the orange «Reto: Mesa de campo» button (ui/interaction.ts): it opens the choice of field jobs, the
   * ones out of season greyed with why. True while it is offered (the machines' panel then leaves the button alone).
   */
  offer(): boolean {
    if (!this.nearDesk) return false;
    const st = this.life.state;
    offerReto("Mesa de campo", () =>
      // The jobs as they are now: the count asks for the colony's nests at this moment.
      chooseReto(this.picker, "Mesa de campo", (this.jobs = fieldJobs(st)).map((j, i) => ({ title: j.reto.chore.title, detail: `${j.reto.chore.exercises.length} pasos · ${j.reto.chore.scenario}`, ...(j.open ? {} : { locked: j.why ?? "Fuera de su época" }), run: () => this.start(i) }))),
    );
    return true;
  }

  /** Game days of the island now. */
  days(boardDays: number): number {
    return boardDays + this.offset;
  }

  /** Test hook: let `gameDays` pass on the island. */
  skip(gameDays: number): void {
    this.offset += gameDays;
  }

  update(dt: number, boardDays: number, hour: number, body: { x: number; y: number; z: number; area: string }, t: number, camera: THREE.Camera, yaw = 0): void {
    if (camera instanceof THREE.PerspectiveCamera) this.camera = camera;
    if (!this.working) this.her = { x: body.x, y: body.y, z: body.z, yaw };
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
      this.view.update(t, this.life.poses(), cover, season, this.life.state, camera.position);
    }
    this.near = onStage && !this.working && Math.hypot(body.x - this.board.x, body.z - this.board.z) < 2.4 && Math.abs(body.y - this.board.y) < 1;
    this.nearDesk = onStage && !this.working && !this.near && Math.hypot(body.x - this.desk.x, body.z - this.desk.z) < 1.9 && Math.abs(body.y) < 1;
    if (!this.nearDesk && this.picker.isOpen) this.picker.close();
    this.renderCard();
  }

  private renderCard(): void {
    const st = this.life.state;
    const key = this.near ? `${Math.floor(st.day * 2)}|${st.events.length}|${st.events.at(-1)?.text}|${this.notebook.length}` : "";
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.card.classList.toggle("hidden", !this.near);
    if (!this.near) return;
    this.card.innerHTML = censusHtml(census(st), st.events.slice(-10).reverse().map((e) => ({ when: dateLabel(e.day), text: e.text })), dateLabel(st.day), monthOfDay(st.day), Object.fromEntries(CROWDS.map((c) => [c.species, this.view.crowd.countsOf(c.species) ?? crowdCounts(st, c)])), this.notebook);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SEASON = (m: number) => (m >= 12 || m <= 2 ? "verano austral" : m <= 5 ? "otoño" : m <= 8 ? "invierno" : "primavera");
const STAGES: readonly Stage[] = ["cria", "joven", "adulto", "anciano"];

/** The census card: each species with its count by stage, what it eats and who eats it, how fed it is; the last events. */
export function censusHtml(rows: readonly CensusRow[], events: readonly { when: string; text: string }[], date: string, month: number, crowds: Readonly<Record<string, CrowdCounts>> = {}, notebook: readonly { when: string; text: string }[] = []): string {
  const row = (r: CensusRow) => {
    const s = BIOME.find((x) => x.id === r.id)!;
    let n = "";
    if (r.kind === "animal") n = `<b class="cz-n">${r.count}</b> ${STAGES.filter((k) => r.stages[k] > 0).map((k) => `${STAGE_LABEL[k]} ${r.stages[k]}`).join(" · ") || "ninguno ahora"}`;
    else if (r.kind === "banco") {
      // Swarms by their weight («≈ 800 000 t» of krill); how many, and the share of each age, in small print.
      const all = STAGES.reduce((t, k) => t + r.stages[k], 0) || 1;
      const ages = STAGES.filter((k) => r.stages[k] / all >= 0.005).map((k) => `${k === "cria" ? "larvas y huevos" : STAGE_LABEL[k]} ${Math.round((r.stages[k] / all) * 100)} %`).join(" · ");
      const many = count(r.count);
      n = `<b class="cz-n">≈ ${mass(r.kg)}</b> <small class="cz-many">≈ ${many} ${/llones$/.test(many) ? "de " : ""}${r.id === "calamar" ? "calamares" : ["linterna", "pez-hielo", "austromerluza"].includes(r.id) ? "peces" : "individuos"}${ages ? ` · ${ages}` : ""}</small>`;
    }
    else n = `<b class="cz-n">${Math.round((r.cover ?? 0) * 100)} %</b> de lo que cabe (${mass(r.kg)})`;
    const fed = r.kind === "planta" ? "" : r.fed < 0.8 ? ` · <b class="cz-hungry" aria-label="pasa hambre">⚠ come el ${Math.round(r.fed * 100)} %</b>` : "";
    const eats = r.eats.length ? `<small>Come: ${esc(r.eats.join(", "))}</small>` : "";
    const by = r.eatenBy.length ? `<small>Lo comen: ${esc(r.eatenBy.join(", "))}</small>` : "";
    const dead = Object.entries(r.deaths).filter(([, v]) => (v ?? 0) >= 1);
    const deaths = r.kind === "animal" && dead.length ? `<small>Muertes: ${dead.map(([c, v]) => `${c === "depredacion" ? "cazados" : c === "sin-madre" ? "crías sin madre" : c} ${Math.round(v!)}`).join(", ")} · nacidos ${r.births}</small>` : "";
    // The crowd each of them stands for (bioma-crowd.ts): what she sees at the colony, nests and eggs in season.
    const c = crowds[r.id];
    const per = CROWDS.find((x) => x.species === r.id)?.perAdult;
    const seen = c && per && c.adults + c.young > 0 ? `<small class="cz-seen">Se ven ≈ ${count(c.adults + c.young)} en la isla (×${per} cada uno)${c.nests ? ` · ${count(c.nests)} nidos` : ""}${c.eggs ? ` · ${count(c.eggs)} huevos` : ""}${c.moult >= 0.05 ? " · en muda" : ""}</small>` : "";
    return `<li data-especie="${r.id}"><span class="cz-name">${esc(r.name)} <i>${esc(s.latin)}</i></span><span>${n}${fed}${r.note ? ` · ${esc(r.note)}` : ""}</span>${seen}${eats}${by}${deaths}</li>`;
  };
  const group = (title: string, kind: CensusRow["kind"]) => `<h4>${title}</h4><ul class="cz-list">${rows.filter((r) => r.kind === kind).map(row).join("")}</ul>`;
  return `<div class="cm-head"><b>Censo de la isla</b><small>Estación de investigación · ${esc(date)} · ${SEASON(month)}</small></div>
<div class="cz-body">${group("Aves y focas", "animal")}${group("Mar y suelo: kril, peces, calamar, invertebrados", "banco")}${group("Plantas y algas", "planta")}
<h4>Cuaderno de campo (la mesa de campo)</h4><ul class="cz-events cz-notebook">${notebook.map((e) => `<li><small>${esc(e.when)}</small> ${esc(e.text)}</li>`).join("") || "<li>Aún nada anotado: los recuentos y anillamientos se hacen en la mesa</li>"}</ul>
<h4>Últimos sucesos</h4><ul class="cz-events">${events.map((e) => `<li><small>${esc(e.when)}</small> ${esc(e.text)}</li>`).join("") || "<li>Aún nada</li>"}</ul>
<p class="cz-note"><small>Un año de la isla dura 28 días de juego (Cold Sanctuary): cada día de juego son unos 13 días de vida.</small></p></div>`;
}
