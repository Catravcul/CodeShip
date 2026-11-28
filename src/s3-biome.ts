import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { BIOME_ISLAND } from "@modules/aerial-sanctuary/data/bioma-island";
import { BiomeLife, biomeGeo, carbonHallGeo, hallGeo } from "@modules/aerial-sanctuary/application/biome-life";
import { REAL_BIOME } from "@modules/aerial-sanctuary/data/bioma-real";
import { census, count, mass, dateLabel, monthOfDay, type CensusRow } from "@modules/aerial-sanctuary/domain/bioma";
import type { BiomeDef, SwarmSpec } from "@modules/aerial-sanctuary/data/bioma";
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
import { airBiome, carbonBiome } from "@modules/aerial-sanctuary/data/bioma";
import { CARBON_CHAIN, CARBON_ZONE } from "@modules/aerial-sanctuary/data/carbonifero";
import type { AreaDef } from "@modules/aerial-sanctuary/data/layout";
import type { WayPoint } from "@modules/aerial-sanctuary/domain/route";
import { heightAt } from "@modules/aerial-sanctuary/domain/mountain";
import { MOUNTAIN, beltAt } from "@modules/aerial-sanctuary/data/bioma-island";
import { GIANT, HOLLOW, LAKE_STARSHIP, inHollow } from "@modules/aerial-sanctuary/data/montana";
import { CarbonScene } from "./adapters/three/s3-carbon";
import { CENSUS_BOARD } from "@modules/aerial-sanctuary/data/campus-fixtures";
import { LAKE_LARVAE } from "@modules/aerial-sanctuary/data/larvas-lago";
import { larvaeCensus } from "@modules/aerial-sanctuary/domain/larvas-lago";
import { PUPA_AREA, pupaOfArea, type PupaPlan } from "@modules/aerial-sanctuary/data/pupa-abeja";
import { advanceBee } from "@modules/aerial-sanctuary/domain/abeja";
import { BeePupaView } from "./adapters/three/s3-bee-pupa";
import { settings } from "./ui/settings-store";

/** The sheet of a challenge (aerial-sanctuary.ts `openChallenge`): `beat` on each right step, `done` on closing. */
type OpenChallenge = (chore: Chore, beat: (index: number, part: number) => void, done: (ok: boolean) => void) => void;

/**
 * Sanctuary 3's biome (docs/design/bioma-s3.md), wired with one line each into aerial-sanctuary.ts: the island's
 * living food chain (application/biome-life.ts) drawn by s3-biome-models.ts, and the census board of the field station:
 * its card shows only through the orange button when she stands at the board (reglas.md §5.8), like any machine's.
 */
export class S3Biome {
  /** The giant insects of Gilgit-Baltistán (×400), inside the mountain on the hall's shore (montana-hueca.md). */
  readonly life: BiomeLife;
  readonly insectView: CarbonScene;
  /** The mountain's real fauna outside, at real size (data/bioma-real.ts), drawn with the mountain and its flora. */
  readonly real: BiomeLife;
  readonly view: BiomeScene;
  /** Game days added by the test hook (`skip`) to the board clock. */
  private offset = 0;
  private readonly card: HTMLElement;
  private cardKey = "";
  private readonly board: { x: number; y: number; z: number };
  /** The hall's census board, in the breeding room (data/campus-fixtures.ts CENSUS_BOARD): its floor's height. */
  readonly hallBoard?: { x: number; y: number; z: number };
  /** At a census board: the hut's (the real fauna outside) or the breeding room's (the giant insects inside). */
  near = false;
  at: "" | "fuera" | "nave" = "";
  /** At the hut's field table: the orange «Reto: Mesa de campo» button (ui/interaction.ts, as in sanctuary 1). */
  nearDesk = false;
  private readonly desk: { x: number; y: number; z: number };
  /** The choice between the field jobs (sanctuary 1's picker). */
  readonly picker: RetoPicker;
  private jobs: FieldJob[] = [];
  /** The total the running job asks for (leopards, ibex or nests when she started it). */
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

  /** The bee's pupa at the hollow's middle (data/pupa-abeja.ts, domain/abeja.ts): its moment 0 laid … 1 out. */
  readonly pupa: BeePupaView;
  readonly pupaAt: PupaPlan;
  bee = { k: 0 };
  private readonly beeTag: HTMLElement;
  /** The Carboniferous forest at the pyramid's foot (data/carbonifero.ts) and the lake's larvae (data/larvas-lago.ts). */
  readonly carbon: BiomeLife;
  readonly carbonView: CarbonScene;
  /** The points this adds to the way graph (the forest's: aerial-sanctuary.ts puts them in its map, one line). */
  readonly points: readonly WayPoint[];

  /** `scene`: the islands' root; `hall`: the hall's inside the mountain (aerial-sanctuary.ts draws one at a time). */
  constructor(scene: THREE.Object3D, ui: HTMLElement, private readonly L: S3Layout, hall: THREE.Object3D = scene) {
    // Outside, the mountain's real fauna and flora (Berón 2026-11-28: «volver a dejar sobre la montaña su flora y fauna real»).
    this.real = new BiomeLife(biomeGeo(L.k), 5, REAL_BIOME);
    this.view = new BiomeScene(L.k, REAL_BIOME);
    scene.add(this.view.root);
    // Inside, the giant insects (the rule of animals per person, the shared setting: data/bioma.ts), on the shore.
    this.life = new BiomeLife(hallGeo(), 1, airBiome(Number(settings.value.animalsPerPerson)));
    this.insectView = new CarbonScene(this.life.state.def, { x: HOLLOW.x, z: HOLLOW.z, floorY: HOLLOW.floorY, lakeTop: HOLLOW.lakeTop, r0: 0, r1: 0, keepOut: [] }, { trees: false, larvae: false, crowd: hallGeo() });
    // The hornets hover before the hives on the shore, as outside (bioma-s3.md §Colonias).
    this.life.hives = this.insectView.crowd!.hivesOf("abeja");
    this.insectView.root.name = "insectos-gigantes";
    hall.add(this.insectView.root);
    // The bee's pupa: built into the hollow with the campus (data/montana.ts); drawn here from its area.
    this.pupaAt = pupaOfArea(L.areas.find((a) => a.id === PUPA_AREA)!);
    this.pupa = new BeePupaView(this.pupaAt);
    hall.add(this.pupa.root);
    // The Carboniferous giants (their own chain, the same rule of animals per person) and the larvae of the lake.
    this.carbon = new BiomeLife(carbonHallGeo(), 7, carbonBiome(Number(settings.value.animalsPerPerson)));
    const D = GIANT.deckHalf + 4;
    const P = this.pupaAt;
    const ss = L.hollow.starship;
    const ssR = LAKE_STARSHIP.radiusM * ss.k + 6;
    this.carbonView = new CarbonScene(this.carbon.state.def, {
      x: P.x, z: P.z, floorY: HOLLOW.floorY, lakeTop: HOLLOW.lakeTop, r0: P.gallery.x1 - P.x + 6, r1: P.gallery.x1 - P.x + 90,
      keepOut: [...L.hollow.trees.map((t) => ({ x0: t.x - D, x1: t.x + D, z0: t.z - D, z1: t.z + D })), { x0: ss.x - ssR, x1: ss.x + ssR, z0: ss.z - ssR - 20, z1: ss.z + ssR }, P.gallery],
    }, { place: (n, seed) => {
      // Its trees on the shore, in its zone's stretch (application/biome-life.ts hallGeo), 6 m apart at least.
      const geo = carbonHallGeo();
      const out: { x: number; y: number; z: number }[] = [];
      for (let i = 0; out.length < n && i < n * 12; i++) {
        const h = geo.home("bosque-carbonifero", seed * 1000 + i);
        if (out.some((p) => Math.hypot(p.x - h.x, p.z - h.z) < 6)) continue;
        out.push({ x: h.x, y: geo.ground(h.x, h.z), z: h.z });
      }
      return out;
    } });
    hall.add(this.carbonView.root);
    // The forest in Áreas (inside the mountain, on the shore): «Ir» takes her to its middle, from the nearest dock.
    const Z = CARBON_ZONE.value;
    const zc = carbonHallGeo().zone(Z.id);
    const fp = { id: `entrenamiento:${Z.id}`, x: zc.x, y: 0, z: zc.z };
    (L.areas as AreaDef[]).push({ id: `entrenamiento:${Z.id}`, island: "entrenamiento", label: Z.label, desc: Z.desc, reality: Z.reality, centre: { x: fp.x, y: 5, z: fp.z }, half: { x: zc.r, y: 5, z: zc.r }, point: fp.id, floorY: 0 });
    this.points = [fp];
    (L.graph.points as WayPoint[]).push(...this.points);
    const dock = L.hollow.gates.map((g) => g.in).sort((a, b) => Math.hypot(a.x - fp.x, a.z - fp.z) - Math.hypot(b.x - fp.x, b.z - fp.z))[0];
    if (dock) (L.graph.links as [string, string][]).push([dock.point, fp.id]);
    this.beeTag = document.createElement("div");
    this.beeTag.className = "s3-pupa-etapa hidden";
    this.beeTag.setAttribute("role", "status");
    ui.appendChild(this.beeTag);
    const p = L.graph.points.find((q) => q.id === "bioma:estacion:censo")!;
    this.board = { x: p.x, y: p.y, z: p.z };
    const hb = L.fixtures.find((f) => f.name === CENSUS_BOARD);
    if (hb) this.hallBoard = { x: hb.x, y: hb.y - 1, z: hb.z };
    this.card = document.createElement("div");
    this.card.className = "cab-machine s3-censo hidden";
    this.card.setAttribute("role", "region");
    this.card.setAttribute("aria-label", "Censo");
    ui.appendChild(this.card);
    // The field table, against the hut's west wall (adapters' furniture at local (−4,5, 1,5)).
    this.desk = this.view.deskAt;
    scene.add(this.steps.root);
    this.picker = new RetoPicker(ui);
  }

  /** The challenge sheet and the toast of aerial-sanctuary.ts (one line there). */
  wire(open: OpenChallenge, say: (text: string, seconds?: number) => void): void {
    this.open = open;
    this.say = say;
  }

  /** A field job on the sheet, acted out at the table: her notebook, the camera trap, the binoculars, the scope. */
  start(i: number): void {
    const job = this.jobs[i];
    if (!job?.open || !this.open || this.working) return;
    const r = job.reto;
    this.working = r.procedure;
    this.counted = job.total;
    // The shared reto stage (reto-focus.ts): she at the table facing it, the camera past her shoulder in the strip
    // the sheet leaves free.
    if (this.camera) focusReto(this.steps, this.camera, this.her, this.her.yaw, { x: this.desk.x, y: this.desk.y + 0.02, z: this.desk.z, sy: 0.75 });
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
        const n = count(job.total ?? 0);
        const text = r.procedure === "s3-colmenas-cerana" ? `Colmenas revisadas: ${n} colonias de abeja asiática` : r.procedure === "s3-transecto-mariposas" ? `Transecto de mariposas: ${n} apolos del Himalaya` : `Trampas de caída: ${n} escarabajos`;
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
      // The jobs as they are now: each asks for the island's total at this moment.
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
    const inside = inHollow(body.x, body.y, body.z);
    this.real.tick(dt, this.days(boardDays), t, hour, body, onStage);
    this.life.tick(dt, this.days(boardDays), t, hour, body, inside);
    this.carbon.tick(dt, this.days(boardDays), t, hour, body, inside);
    this.updatePupa(dt, t, body, camera);
    const C = BIOME_ISLAND.centre.value;
    const far = Math.hypot(camera.position.x - C.x, camera.position.z - C.z);
    // The mountain is seen from every island; its life is posed only from nearby (mobile budget): the chain lives on.
    if (far < 1600) {
      const rows = census(this.real.state);
      const cover: Record<string, number> = {};
      for (const r of rows) if (r.cover !== undefined) cover[r.id] = r.cover;
      this.view.update(t, this.real.poses(), cover, undefined, camera.position);
    }
    if (inside) {
      this.insectView.update(t, this.life.poses(), this.life.state.day + this.life.state.def.startDayOfYear, camera.position, this.life.state);
      this.carbonView.update(t, this.carbon.poses(), this.carbon.state.day + this.carbon.state.def.startDayOfYear, camera.position);
    }
    const by = (q: { x: number; y: number; z: number } | undefined, r: number) => !!q && Math.hypot(body.x - q.x, body.z - q.z) < r && Math.abs(body.y - q.y) < 1;
    // The hall's hangs on the wall over the insectaries: read from a step farther.
    this.at = this.working ? "" : onStage && by(this.board, 2.4) ? "fuera" : inside && by(this.hallBoard, 3.2) ? "nave" : "";
    this.near = !!this.at;
    this.nearDesk = onStage && !this.working && !this.near && Math.hypot(body.x - this.desk.x, body.z - this.desk.z) < 1.9 && Math.abs(body.y - this.desk.y) < 1;
    if (!this.nearDesk && this.picker.isOpen) this.picker.close();
    this.renderCard();
  }

  /** The bee's clock (the setting's minutes), its pose when the pupa is near, its stage on screen at its gallery or swimming by it. */
  private updatePupa(dt: number, t: number, body: { x: number; y: number; z: number; area: string }, camera: THREE.Camera): void {
    this.bee.k = advanceBee(this.bee.k, dt, Number(settings.value.abejaMinutes));
    const P = this.pupaAt;
    const d = Math.hypot(camera.position.x - P.x, camera.position.z - P.z);
    this.pupa.root.visible = d < 1200;
    const look = d < 700 ? this.pupa.update(this.bee.k, t) : undefined;
    const g = P.gallery;
    const by = body.area === PUPA_AREA || (body.x > g.x0 - 12 && body.x < g.x1 + 12 && body.z > g.z0 - 12 && body.z < g.z1 + 12 && body.y < P.y0 + P.h);
    // Diving in the lake, the larva nearest the camera says its stage.
    const C = camera.position;
    const larva = C.y < HOLLOW.lakeTop ? this.carbonView.lastLarvae.filter((q) => q.y < HOLLOW.lakeTop).map((q) => ({ q, d: Math.hypot(q.x - C.x, q.y - C.y, q.z - C.z) })).sort((a, b) => a.d - b.d)[0] : undefined;
    // Under the water the larva says its stage, even by the gallery; above it, the bee.
    const text = larva && larva.d < 40 ? larva.q.label : by && look ? `Abeja de la pupa · ${look.stage.label}` : "";
    if (this.beeTag.textContent !== text) this.beeTag.textContent = text;
    this.beeTag.classList.toggle("hidden", !text);
  }

  private renderCard(): void {
    const st = this.at === "nave" ? this.life.state : this.real.state;
    const key = this.near ? `${this.at}|${Math.floor(st.day * 2)}|${st.events.length}|${st.events.at(-1)?.text}|${this.notebook.length}` : "";
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.card.classList.toggle("hidden", !this.near);
    if (!this.near) return;
    const start = st.def.startDayOfYear;
    const events = st.events.slice(-10).reverse().map((e) => ({ when: dateLabel(e.day, start), text: e.text }));
    if (this.at === "fuera") {
      // The hut's board: the mountain's real fauna and flora, at real size; the field table's notebook.
      this.card.innerHTML = censusHtml(st.def, census(st), events, dateLabel(st.day, start), monthOfDay(st.day, start), {}, this.notebook, undefined, LOOK.fuera);
      return;
    }
    // The breeding room's: the giant insects of the hall's shore with their colonies, the Carboniferous and the lake's larvae.
    const bioDay = this.carbon.state.day + this.carbon.state.def.startDayOfYear;
    const larvae = LAKE_LARVAE.map((s) => ({ id: s.id, name: s.name, latin: s.latin, eats: s.eats, stages: larvaeCensus(s, bioDay).map((r) => `${LARVA_STAGE[r.stage]} ${r.n}`) }));
    this.card.innerHTML = censusHtml(st.def, census(st), events, dateLabel(st.day, start), monthOfDay(st.day, start), Object.fromEntries(CROWDS.map((c) => [c.species, crowdCounts(st, c)])), undefined, { title: "Bosque del Carbonífero (en la orilla de la nave, a tamaño real)", def: this.carbon.state.def, rows: census(this.carbon.state), chain: CARBON_CHAIN }, { ...LOOK.nave, larvae });
  }
}

const LARVA_STAGE = { huevo: "huevos", ninfa: "ninfas", larva: "larvas", pupa: "pupas", subimago: "subimagos", emergencia: "saliendo del agua" } as const;

/** How each board says itself: its head, where it is, the titles of its groups. */
export interface CensusLook {
  readonly title: string;
  readonly where: string;
  readonly animals: string;
  readonly small: string;
  readonly plants: string;
  /** The lake's larvae drawn now, by stage (the hall's board). */
  readonly larvae?: readonly { id: string; name: string; latin: string; eats: string; stages: readonly string[] }[];
}
export const LOOK = {
  fuera: { title: "Censo de la montaña", where: "Estación de investigación", animals: "Fauna real de la montaña (a tamaño real)", small: "Los pequeños", plants: "Plantas, de la estepa a las nieves" },
  nave: { title: "Censo de la nave", where: "Criadero de insectos gigantes, dentro de la montaña", animals: "Insectos gigantes (cada colonia, por su reina)", small: "Los pequeños: pulgones, mosquitos, colémbolos y arañas", plants: "Plantas de la orilla de las que comen" },
} as const satisfies Record<string, CensusLook>;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SEASON = (m: number) => (m >= 12 || m <= 2 ? "invierno" : m <= 5 ? "primavera" : m <= 8 ? "verano" : "otoño");
const STAGES: readonly Stage[] = ["cria", "joven", "adulto", "anciano"];
const NEST_WORD = { colmena: "colmenas", nido: "nidos", hormiguero: "hormigueros" } as const;

/** The census card: each species with its count by stage, what it eats and who eats it, how fed it is; the last events. */
export function censusHtml(def: BiomeDef, rows: readonly CensusRow[], events: readonly { when: string; text: string }[], date: string, month: number, crowds: Readonly<Record<string, CrowdCounts>> = {}, notebook: readonly { when: string; text: string }[] | undefined = [], more?: { title: string; def: BiomeDef; rows: readonly CensusRow[]; chain: readonly string[] }, look: CensusLook = LOOK.nave): string {
  const row = (r: CensusRow) => {
    const s = (def.species.find((x) => x.id === r.id) ?? more?.def.species.find((x) => x.id === r.id))!;
    let n = "";
    if (r.kind === "animal") n = `<b class="cz-n">${r.count}</b> ${STAGES.filter((k) => r.stages[k] > 0).map((k) => `${STAGE_LABEL[k]} ${r.stages[k]}`).join(" · ") || "ninguno ahora"}`;
    else if (r.kind === "banco") {
      // Banks by their weight; how many, and the share of each age, in small print.
      const all = STAGES.reduce((t, k) => t + r.stages[k], 0) || 1;
      const ages = STAGES.filter((k) => r.stages[k] / all >= 0.005).map((k) => `${k === "cria" ? "huevos y crías" : STAGE_LABEL[k]} ${Math.round((r.stages[k] / all) * 100)} %`).join(" · ");
      const many = count(r.count);
      n = `<b class="cz-n">≈ ${mass(r.kg)}</b> <small class="cz-many">≈ ${many} ${/llones$/.test(many) ? "de " : ""}${(s as SwarmSpec).unit ?? "individuos"}${ages ? ` · ${ages}` : ""}</small>`;
    } else n = `<b class="cz-n">${Math.round((r.cover ?? 0) * 100)} %</b> de lo que cabe (${mass(r.kg)})`;
    const fed = r.kind === "planta" ? "" : r.fed < 0.8 ? ` · <b class="cz-hungry" aria-label="pasa hambre">⚠ come el ${Math.round(r.fed * 100)} %</b>` : "";
    const eats = r.eats.length ? `<small>Come: ${esc(r.eats.join(", "))}</small>` : "";
    const by = r.eatenBy.length ? `<small>Lo comen: ${esc(r.eatenBy.join(", "))}</small>` : "";
    const dead = Object.entries(r.deaths).filter(([, v]) => (v ?? 0) >= 1);
    const deaths = r.kind === "animal" && dead.length ? `<small>Muertes: ${dead.map(([c, v]) => `${c === "depredacion" ? "cazados" : c === "sin-madre" ? "crías sin madre" : c} ${Math.round(v!)}`).join(", ")} · nacidos ${r.births}</small>` : "";
    // The crowd each of them stands for (bioma-crowd.ts): what she sees on the mountain, burrows and nests.
    const c = crowds[r.id];
    const per = CROWDS.find((x) => x.species === r.id)?.perAdult;
    const seen = c && per && (c.adults + c.young > 0 || c.asleep) ? `<small class="cz-seen">${c.asleep ? "Pasan el invierno dentro del nido" : `Se ven ≈ ${count(c.adults + c.young)} obreras`} (×${String(per).replace(".", ",")} cada colonia)${c.nests ? ` · ${count(c.nests)} ${NEST_WORD[CROWDS.find((x) => x.species === r.id)?.nest ?? "nido"]}` : ""}</small>` : "";
    return `<li data-especie="${r.id}"><span class="cz-name">${esc(r.name)} <i>${esc(s.latin)}</i></span><span>${n}${fed}${r.note ? ` · ${esc(r.note)}` : ""}</span>${seen}${eats}${by}${deaths}</li>`;
  };
  const group = (title: string, kind: CensusRow["kind"]) => (rows.some((r) => r.kind === kind) ? `<h4>${esc(title)}</h4><ul class="cz-list">${rows.filter((r) => r.kind === kind).map(row).join("")}</ul>` : "");
  const larvae = look.larvae?.length ? `<h4>Larvas del lago (en el fondo, con su ciclo)</h4><ul class="cz-list">${look.larvae.map((l) => `<li data-especie="larva-${l.id}"><span class="cz-name">${esc(l.name)} <i>${esc(l.latin)}</i></span><span>${esc(l.stages.join(" · "))}</span><small>Come: ${esc(l.eats)}</small></li>`).join("")}</ul>` : "";
  return `<div class="cm-head"><b>${esc(look.title)}</b><small>${esc(look.where)} · ${esc(date)} · ${SEASON(month)}</small></div>
<div class="cz-body">${group(look.animals, "animal")}${group(look.small, "banco")}${group(look.plants, "planta")}
${more ? `<h4>${esc(more.title)}</h4><ul class="cz-list">${more.rows.filter((r) => r.kind !== "planta").map(row).join("")}</ul><p class="cz-note"><small>${more.chain.map(esc).join(". ")}.</small></p>` : ""}${larvae}
${notebook ? `<h4>Cuaderno de campo (la mesa de campo)</h4><ul class="cz-events cz-notebook">${notebook.map((e) => `<li><small>${esc(e.when)}</small> ${esc(e.text)}</li>`).join("") || "<li>Aún nada anotado: las colmenas, el transecto de mariposas y las trampas se hacen en la mesa</li>"}</ul>` : ""}
<h4>Últimos sucesos</h4><ul class="cz-events">${events.map((e) => `<li><small>${esc(e.when)}</small> ${esc(e.text)}</li>`).join("") || "<li>Aún nada</li>"}</ul>
<p class="cz-note"><small>Un año de la montaña dura 28 días de juego (Cold Sanctuary): cada día de juego son unos 13 días de vida.</small></p></div>`;
}
