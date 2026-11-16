import { AdoptionOps, isColonyChore, type AdoptionEvent, type AdoptionPorts } from "@modules/adoption/application/adoption-ops";
import { SPECIES_CATALOG } from "@modules/adoption/data/catalog";
import { ALL_SPECIES, anySpecies } from "@modules/adoption/data/species-extra";
import type { CatalogEntry } from "@modules/adoption/domain/entry";
import type { Habitat } from "@modules/habitat/application/habitat";
import type { ImportOps } from "@modules/imports/application/import-ops";
import type { Delivery } from "@modules/imports/domain/delivery";
import type { Wallet } from "@modules/imports/domain/wallet";
import { Cat } from "@modules/pets/domain/cat";
import { Dog } from "@modules/pets/domain/dog";
import { Hen } from "@modules/poultry/domain/hen";
import { SANCTUARY_AREAS } from "@modules/sanctuary/data/areas";
import type { SanctuaryArea } from "@modules/sanctuary/domain/area";
import type { Interior } from "./interior";
import { SpeciesCatalog, type SpeciesTask } from "./ui/species-catalog";
import type { TaskBoard } from "./ui/task-board";

/** The Sanctuary's launcher for living cargo: the cheapest ride (a target price: docs/design/catalogo-especies.md). */
const LIVE_LAUNCHER = "starship";

const hex = (c: string) => parseInt(c.slice(1), 16);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** «al acuario del anillo», «a la esfera de agua». */
const toArea = (name: string) => `${/^(Cueva|Esfera)/.test(name) ? "a la" : "al"} ${name.charAt(0).toLowerCase()}${name.slice(1)}`;

export interface SanctuaryLife {
  readonly ops: AdoptionOps;
  readonly catalog: SpeciesCatalog;
  /** A delivery of the import system landed: true if it was animals (they arrived; no store notice). */
  delivered(d: Delivery): boolean;
  /** Board days pass (hatching, help programs). */
  update(lifeDays: number): void;
}

/**
 * The species catalogue wired to the game (docs/design/catalogo-especies.md): the adoption use cases on the
 * import system and the wallet, the arrivals into the habitat (cats, dogs, hens), the ring aquarium (school and
 * snails) and the terrarium shelf (colonies), the colonies' chores on the ring, and the catalogue sheet opened
 * from its terminal and from the task list. A new game has no animals: Doménica starts alone (Berón, 2026-11-16).
 */
export function wireSanctuaryLife(d: { root: HTMLElement; interior: Interior; habitat: Habitat; importOps: ImportOps; wallet: Wallet; taskBoard: TaskBoard; goChore: (choreId: string) => void }): SanctuaryLife {
  const { interior, habitat, importOps, wallet } = d;
  const runs = { banco: [] as { n: number; color: string }[], caracoles: [] as { n: number; color: string }[] };
  let serial = 0;
  const freeName = (e: CatalogEntry, taken: readonly string[]) => e.names?.find((n) => !taken.includes(n)) ?? `${e.name} ${++serial}`;

  /** They land in the world. */
  const arrive = (e: CatalogEntry, n: number, _area: SanctuaryArea): string[] => {
    const a = e.acquire;
    const each = a.kind === "importar" ? a.liveKg / Math.max(1, n) : 1;
    const names: string[] = [];
    const color = hex(e.icon.body);
    for (let i = 0; i < n && (e.lodging === "gato" || e.lodging === "perro" || e.lodging === "gallina"); i++) {
      const taken = [...habitat.cats, ...habitat.dogs, ...habitat.hens].map((x) => x.name);
      const name = freeName(e, taken);
      const id = `${e.lodging}-${name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "")}-${++serial}`;
      interior.animalColor.set(id, color);
      names.push(name);
      if (e.lodging === "gato") habitat.adopt(new Cat(id, name, each));
      else if (e.lodging === "perro") habitat.addDog(new Dog(id, name, each));
      // Silkies go broody, and of a plain trio the second one does (Yema, as in the first ring): she can adopt a pup.
      else habitat.addHen(new Hen(id, name, e.id === "gallina-sedosa" ? i === 0 : e.id === "gallina" && i === 1));
    }
    if (e.lodging === "banco" || e.lodging === "caracoles") {
      interior.aquarium.tank.stock(e.lodging, n, e.plural);
      runs[e.lodging].push({ n, color: e.icon.body });
      interior.tank.setColors(e.lodging, runs[e.lodging]);
    }
    if (e.lodging === "colonia") interior.catalogCorner.addColony(e.id, e.icon.body, e.icon.accent, n);
    return names;
  };

  const ports: AdoptionPorts = {
    quote: (kg) => {
      const q = importOps.quoteKg(kg, LIVE_LAUNCHER);
      return { credits: q.credits, transitDays: q.transitDays, gameHours: q.gameHours, launcher: importOps.launcher(LIVE_LAUNCHER).name };
    },
    credits: () => wallet.balance,
    order: (label, kg) => {
      try {
        return { deliveryId: importOps.orderKg(label, kg, LIVE_LAUNCHER).id };
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
    arrive,
    calm: (x) => habitat.crew.startle(-x),
  };
  const ops = new AdoptionOps(SPECIES_CATALOG, ALL_SPECIES, SANCTUARY_AREAS, ports);
  interior.sanctuary = { chores: () => ops.chores(), owns: isColonyChore, station: () => "catalogo", start: (c) => ops.start(c) };

  const catalog = new SpeciesCatalog(d.root, ops, anySpecies, () => wallet.balance);
  const AQUARIUM_TASKS: Readonly<Record<string, readonly string[]>> = {
    banco: ["acuario-comer", "acuario-amistad", "acuario-ayuda-medakas-avisan"],
    caracoles: ["acuario-amistad-caracoles", "acuario-ayuda-caracoles-limpian", "acuario-cristal"],
  };
  catalog.tasksFor = (e): SpeciesTask[] => {
    const facts = interior.choreFacts();
    const st = ops.status(e.id);
    const names = st.kind === "a-bordo" ? st.names : [];
    return facts
      .filter((f) => {
        if (e.lodging === "colonia") return f.id.startsWith("especie-") && f.id.endsWith(`-${e.id}`);
        if (e.lodging === "banco" || e.lodging === "caracoles") return AQUARIUM_TASKS[e.lodging]!.includes(f.id);
        if (e.lodging === "gallina" && /gallin/i.test(f.title)) return true;
        return f.category === "animales" && names.some((n) => f.title.includes(n));
      })
      .map((f) => ({ id: f.id, title: f.title }));
  };
  catalog.onTask = (id) => d.goChore(id);
  catalog.onAdopted = (e, s) => {
    if (s.kind === "en-camino") interior.say(`Pedido al Santuario: ${e.acquire.what}. Llega en ${Math.round(s.hoursLeft)} h de a bordo`);
    else if (s.kind === "eclosionando") interior.say(`${cap(e.acquire.what)} a la incubadora: ${String(Math.round(s.daysLeft * 10) / 10).replace(".", ",")} días`);
  };
  interior.openCatalog = () => catalog.open();
  d.taskBoard.onCatalog = () => catalog.open();

  const text = (e: AdoptionEvent): string | undefined => {
    switch (e.type) {
      case "llegada":
        return e.names.length
          ? `${e.names.length === 1 ? "Ha llegado" : "Han llegado"} ${e.names.join(", ")} (${e.entry.name.toLowerCase()}) ${toArea(e.area.name)}`
          : `${e.count === 1 ? "Ha llegado" : "Han llegado"} ${e.entry.acquire.what} ${toArea(e.area.name)}`;
      case "amigos":
        return `¡${cap(e.entry.plural)} ya son tus amigos!`;
      case "ayuda":
        return `${cap(e.entry.plural)} te ayudan: ${e.entry.contributions[0] ?? ""}`;
      case "ayuda-terminada":
        return `${cap(e.entry.plural)} vuelven a su vida: pídeles ayuda otra vez si hace falta`;
      default:
        return undefined;
    }
  };
  const drain = () => {
    let changed = false;
    for (const e of ops.drainEvents()) {
      changed = true;
      const t = text(e);
      if (t) interior.say(t, e.type === "llegada" ? "alerta" : "jugador");
    }
    if (changed) catalog.refresh();
  };

  return {
    ops,
    catalog,
    delivered: (del) => {
      const ours = ops.delivered(del.id);
      if (ours) drain();
      return ours;
    },
    update: (lifeDays) => {
      ops.tick(lifeDays);
      ops.tickHours(lifeDays * 24);
      drain();
    },
  };
}
