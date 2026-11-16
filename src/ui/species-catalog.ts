import type { AdoptionCheck, AdoptionOps, AdoptionStatus } from "@modules/adoption/application/adoption-ops";
import { CATALOG_GROUPS, FLIGHT_LABEL, ROLE_LABEL, type CatalogEntry, type CatalogGroup } from "@modules/adoption/domain/entry";
import { FIT_REASON_TEXT } from "@modules/adoption/domain/placement";
import type { Species } from "@modules/sanctuary/domain/fauna";
import { BOARD_HOURS_PER_REAL_S } from "@core/board-time";
import { speciesIcon } from "./species-icon";
import "./species-catalog.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const num = (v: number, d = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** A task of the world that belongs to an adopted species (feed, befriend, ask for help), with «Ir». */
export interface SpeciesTask {
  readonly id: string;
  readonly title: string;
}

/**
 * The species catalogue (docs/design/catalogo-especies.md): a mobile-first sheet with the challenge sheet's look
 * (it is not a challenge), opened from its terminal on the farm deck and from the task list. A scrollable list
 * filtered by group and by area, and a detail view per species: description, where it can live (the sanctuary's
 * `fit()` per area), what it gives and what to watch for, its space-flight record with the source, how it gets
 * aboard, and «Adoptar».
 */
export class SpeciesCatalog {
  private readonly el: HTMLElement;
  private group: CatalogGroup | null = null;
  private area: string | null = null;
  private detail: string | null = null;
  private listScroll = 0;
  /** Tasks of an adopted species in the world (set by the wiring): feed, befriend, ask for help. */
  tasksFor?: (e: CatalogEntry) => SpeciesTask[];
  /** Go and do a task (closes the catalogue). */
  onTask?: (id: string) => void;
  /** Something to say after adopting (the toast). */
  onAdopted?: (e: CatalogEntry, s: AdoptionStatus) => void;
  onClose?: () => void;

  constructor(
    root: HTMLElement,
    private readonly ops: AdoptionOps,
    private readonly species: (id: string) => Species | undefined,
    private readonly credits: () => number,
  ) {
    this.el = document.createElement("div");
    this.el.className = "species-catalog hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Catálogo de especies");
    root.appendChild(this.el);
    this.el.addEventListener("click", (ev) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-close]")) return this.close();
      if (t.closest("[data-back]")) return this.showList();
      const g = t.closest<HTMLElement>("[data-group]");
      if (g) {
        this.group = (g.dataset.group || null) as CatalogGroup | null;
        return this.render();
      }
      const a = t.closest<HTMLElement>("[data-area]");
      if (a) {
        this.area = a.dataset.area || null;
        return this.render();
      }
      const task = t.closest<HTMLElement>("[data-task]");
      if (task) {
        this.close();
        return this.onTask?.(task.dataset.task!);
      }
      const adopt = t.closest<HTMLButtonElement>("[data-adopt]");
      if (adopt && !adopt.disabled) return this.adopt(adopt.dataset.adopt!);
      const card = t.closest<HTMLElement>("[data-id]");
      if (card) this.showDetail(card.dataset.id!);
    });
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  /** Open on the list (or on one species). */
  open(id?: string): void {
    this.detail = id ?? null;
    this.el.classList.remove("hidden");
    document.body.classList.add("in-catalog");
    this.render();
    this.el.scrollTop = 0;
  }

  close(): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    document.body.classList.remove("in-catalog");
    this.onClose?.();
  }

  /** Re-render if open (a delivery landed, credits changed). */
  refresh(): void {
    if (this.visible) this.render();
  }

  private showList(): void {
    this.detail = null;
    this.render();
    this.el.scrollTop = this.listScroll;
  }

  private showDetail(id: string): void {
    this.listScroll = this.el.scrollTop;
    this.detail = id;
    this.render();
    this.el.scrollTop = 0;
  }

  private adopt(id: string): void {
    try {
      this.ops.adopt(id);
    } catch {
      // The check said why (the button was enabled a moment ago): show it again.
    }
    this.onAdopted?.(this.ops.entry(id), this.ops.status(id));
    this.render();
  }

  private render(): void {
    this.el.innerHTML = this.detail ? this.detailHtml(this.ops.entry(this.detail)) : this.listHtml();
  }

  private statusText(s: AdoptionStatus, c: AdoptionCheck): { text: string; cls: string } {
    switch (s.kind) {
      case "a-bordo":
        return { text: `A bordo · ${num(s.count)}`, cls: "aboard" };
      case "en-camino":
        return { text: `En camino · ${num(Math.max(0.1, s.hoursLeft), 1)} h`, cls: "coming" };
      case "eclosionando":
        return { text: `Eclosionando · ${num(Math.max(0.1, s.daysLeft), 1)} días`, cls: "coming" };
      default:
        if (c.pendiente) return { text: "Pendiente", cls: "pending" };
        return c.ok ? { text: "Disponible", cls: "ok" } : { text: c.placement.area ? (c.why ?? "No ahora") : "No cabe ahora", cls: "no" };
    }
  }

  private listHtml(): string {
    const all = this.ops.entries;
    const checks = new Map(all.map((e) => [e.id, this.ops.check(e.id)] as const));
    const inArea = (e: CatalogEntry) => !this.area || (this.ops.accepts(this.area, e.speciesId) && !!checks.get(e.id)!.placement.verdicts.find((v) => v.areaId === this.area && v.fit.ok));
    const shown = all.filter((e) => (!this.group || e.group === this.group) && inArea(e));
    const groupChip = (id: CatalogGroup | null, label: string, n: number) => `<button class="chip ${this.group === id ? "on" : ""}" data-group="${id ?? ""}" aria-pressed="${this.group === id}">${label} <small>${n}</small></button>`;
    const groups = `<div class="chips" aria-label="Grupo">${groupChip(null, "Todas", all.filter(inArea).length)}${CATALOG_GROUPS.map((g) => groupChip(g.id, g.label, all.filter((e) => e.group === g.id && inArea(e)).length)).join("")}</div>`;
    const areas = this.ops.areasNow();
    const areaChip = (id: string | null, label: string) => `<button class="chip area ${this.area === id ? "on" : ""}" data-area="${id ?? ""}" aria-pressed="${this.area === id}">${label}</button>`;
    const areaRow = `<div class="chips" aria-label="Área">${areaChip(null, "Cualquier hábitat")}${areas.map((a) => areaChip(a.area.id, `${esc(a.area.name)}${a.built ? "" : " · sin instalar"}`)).join("")}</div>`;
    const cards = shown
      .map((e) => {
        const st = this.statusText(this.ops.status(e.id), checks.get(e.id)!);
        return `<button class="sc-card" data-id="${e.id}" aria-label="${esc(e.name)}${e.variant ? ` (${esc(e.variant)})` : ""}">${speciesIcon(e.icon, 52)}<span class="sc-txt"><b>${esc(e.name)}</b>${e.scientific ? `<i>${esc(e.scientific)}</i>` : ""}<small>${esc(e.description.split(/(?<=\.)\s/)[0]!)}</small></span><em class="sc-badge ${st.cls}">${esc(st.text)}</em></button>`;
      })
      .join("");
    return `<div class="sc-head"><div class="sc-title"><b>Catálogo de especies</b><span>${num(all.length)} especies y variantes · ${num(this.credits())} créditos</span></div><button class="sc-x" data-close aria-label="Cerrar el catálogo">✕</button>${groups}${areaRow}</div><div class="sc-list">${cards || "<p>Ninguna especie con ese filtro</p>"}</div>`;
  }

  private detailHtml(e: CatalogEntry): string {
    const sp = this.species(e.speciesId);
    const c = this.ops.check(e.id);
    const s = this.ops.status(e.id);
    const st = this.statusText(s, c);
    const where = c.placement.verdicts
      .map((v) => {
        const tried = this.ops.accepts(v.areaId, e.speciesId);
        const ok = v.fit.ok && tried;
        const why = !v.fit.ok ? v.fit.reasons.map((r) => FIT_REASON_TEXT[r]).join(", ") : !tried ? "nunca ha volado en uno así" : v.built ? (v.loopOk ? "cabe" : "cabe, pero el bucle no se cierra") : "cabe · aún sin instalar";
        const hab = this.ops.habitats.find((h) => h.id === v.areaId);
        return `<li class="${ok && v.built && v.loopOk ? "yes" : ok ? "maybe" : "no"}"><span aria-hidden="true">${ok ? "✓" : "✗"}</span> <b>${esc(v.areaName)}</b>: ${esc(why)}${ok && hab ? `<br><small>${esc(hab.summary)} <a href="${esc(hab.source)}" target="_blank" rel="noopener">Fuente</a></small>` : ""}</li>`;
      })
      .join("");
    const needs = sp
      ? [
          `${num(sp.tempC[0])}–${num(sp.tempC[1])} °C`,
          sp.habitat === "agua" ? `agua ${sp.salt ? "salada" : "dulce"}${sp.minWaterL ? `, al menos ${num(sp.minWaterL, 2)} L` : ""}` : sp.habitat === "aire" ? "vive en el aire" : "vive en tierra",
          sp.needsLight ? "necesita luz" : "",
          sp.nocturnal ? "nocturno" : "",
          sp.minPressureKpa ? `${num(sp.minPressureKpa)} kPa` : "",
        ].filter(Boolean)
      : [];
    const cost =
      c.cost.kind === "importar"
        ? `Pedido al Santuario: ${esc(e.acquire.what)}. Vuelan ${num(c.cost.kg, 1)} kg (animales, su hábitat de viaje y su comida para ${num(c.cost.transitDays)} días de transferencia de Hohmann) en ${esc(c.cost.launcher)}: <b>${num(c.cost.credits)} créditos</b>. Llega en ${num(c.cost.gameHours, 1)} h de a bordo (unos ${num(c.cost.gameHours / BOARD_HOURS_PER_REAL_S / 60)} min reales).`
        : `Eclosión a bordo: ${esc(e.acquire.what)} de ${c.cost.from === "quistes" ? "quistes" : c.cost.from === "huevos" ? "huevos" : "huevos y formas latentes"} del banco de la nave, en ${num(c.cost.days, 1)} días de a bordo. Sin coste.`;
    const role = sp ? ROLE_LABEL[sp.role] : "";
    const tasks = s.kind === "a-bordo" ? (this.tasksFor?.(e) ?? []) : [];
    const lodged = s.kind === "a-bordo" ? `<p class="sc-status aboard">A bordo: ${num(s.count)} en ${esc(c.placement.verdicts.find((v) => v.areaId === s.areaId)?.areaName ?? s.areaId)}${s.names.length ? ` (${esc(s.names.join(", "))})` : ""}${e.lodging === "colonia" ? (this.ops.friends(e.id) ? " · amigos" : " · aún no os conocéis") : ""}</p>` : `<p class="sc-status ${st.cls}">${esc(c.pendiente && s.kind === "disponible" ? (c.why ?? st.text) : st.text)}</p>`;
    const canAdopt = c.ok && !e.aboard;
    const offer = !e.aboard && !c.pendiente;
    const label = e.lodging === "bucle" ? "Pedir" : "Adoptar";
    return `<div class="sc-head detail"><button class="sc-back" data-back aria-label="Volver al catálogo">‹ Catálogo</button><button class="sc-x" data-close aria-label="Cerrar el catálogo">✕</button></div>
      <article class="sc-detail">
        <header>${speciesIcon(e.icon, 96, e.name)}<div><h2>${esc(e.name)}</h2>${e.variant ? `<span class="sc-variant">${esc(e.variant)}</span>` : ""}${e.scientific ? `<i>${esc(e.scientific)}</i>` : ""}</div></header>
        <p class="sc-desc">${esc(e.description)}</p>
        ${lodged}
        <section><h3>Dónde puede vivir</h3><p class="sc-needs">${esc(needs.join(" · "))}</p><ul class="sc-areas">${where}</ul></section>
        <section><h3>Aporta</h3><ul>${role ? `<li>${esc(role)}</li>` : ""}${e.contributions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section><h3>Precauciones</h3><ul>${e.precautions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section><h3>Vuelo espacial</h3><p><b>${esc(FLIGHT_LABEL[e.flight.status])}.</b> ${esc(e.flight.text)} <a href="${esc(e.flight.source)}" target="_blank" rel="noopener">Fuente</a></p></section>
        <section><h3>Cómo llega</h3><p>${e.aboard ? "Ya está a bordo desde el principio." : cost}</p><p class="sc-src"><a href="${esc(e.source)}" target="_blank" rel="noopener">Ficha de la especie</a></p></section>
        ${tasks.length ? `<section><h3>Tareas</h3>${tasks.map((t) => `<div class="tb-task"><div><b>${esc(t.title)}</b></div><button class="tb-go" data-task="${esc(t.id)}" aria-label="Ir: ${esc(t.title)}">Ir</button></div>`).join("")}</section>` : ""}
      </article>
      ${!offer ? "" : `<div class="sc-action"><button class="sc-adopt" data-adopt="${e.id}" ${canAdopt ? "" : "disabled"} aria-label="${label}: ${esc(e.name)}">${label}${c.cost.kind === "importar" ? ` · ${num(c.cost.credits)} créditos` : " · eclosión"}</button>${canAdopt ? "" : `<small>${esc(c.why ?? "")}</small>`}</div>`}`;
  }
}
