import type { AreaDef } from "../data/layout";
import { s3AreaCategory } from "./area-category";

/** One level of an island's hierarchy (the same shape as the Áreas window's scope groups, tasks/application/areas). */
export interface S3ScopeGroup {
  readonly kind: "edificio" | "piso" | "cinturon";
  readonly label: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
}

/**
 * Sanctuary 3's Áreas hierarchy (Berón 2026-11-19, the same scope as sanctuary 1's buildings and the ships' decks):
 * island → building → floor. A tree-building (`<isla>-arbol:…`) is a building and each of its levels a floor (its
 * floors and its tips' lookouts); on the training island each facility is a building and its rooms are inside it
 * (`nbl-control` in the NBL, the capsule in the Dragon simulators). The outdoors belong to no building. On a mountain
 * (the air island, docs/design/bioma-s3.md) the zones group by their altitude belt instead: island → belt → zone.
 */
export function s3AreaScopes(areas: readonly (Pick<AreaDef, "id" | "label" | "island" | "belt"> & Partial<Pick<AreaDef, "tower" | "floorY">>)[]): { readonly scopes: readonly S3ScopeGroup[]; of(id: string): { edificio?: string; piso?: string; cinturon?: string } | undefined } {
  const out = new Map<string, { edificio?: string; piso?: string; cinturon?: string }>();
  const belts = new Map<string, string>();
  const buildings = new Map<string, string>();
  const floors = new Map<string, string>();
  const facilities = areas.filter((a) => s3AreaCategory(a) === "Instalaciones");
  const inner = (s: string) => /\(([^,)]*)/.exec(s)?.[1]?.trim();
  for (const a of areas) {
    if (a.belt) {
      belts.set(a.belt.id, a.belt.label);
      out.set(a.id, { cinturon: a.belt.id });
      continue;
    }
    // Inside the mountain (montana-hueca.md) every area of a tree-building names it (`tower`): its building, and its
    // floor the building's floor at its height (a room on a training floor, a service on sanctuary 1's floor).
    if (a.tower) {
      buildings.set(`torre:${a.tower.id}`, a.tower.label);
      const floor = a.floorY === undefined ? undefined : areas.find((q) => q.tower?.id === a.tower!.id && q.floorY !== undefined && Math.abs(q.floorY - a.floorY!) < 0.5 && !q.id.startsWith("entrenamiento:")) ?? (a.floorY < 1 && a.id.endsWith(":pie") ? a : undefined);
      if (floor) floors.set(`torre:${floor.id}`, floor.id.endsWith(":pie") ? floor.label : `${a.tower.label} · ${floor.label.replace(`${a.tower.label} · `, "")}`);
      out.set(a.id, { edificio: `torre:${a.tower.id}`, ...(floor ? { piso: `torre:${floor.id}` } : {}) });
      continue;
    }
    const [prefix, local = ""] = a.id.split(":") as [string, string?];
    if (prefix.endsWith("-arbol")) {
      const name = inner(areas.find((q) => q.id === `${prefix}:tronco`)?.label ?? a.label) ?? prefix;
      buildings.set(prefix, name);
      const level = /, nivel (\d+)\)$/.exec(a.label)?.[1];
      if (level) floors.set(`${prefix}:nivel-${level}`, `${name} · nivel ${level}`);
      out.set(a.id, { edificio: prefix, ...(level ? { piso: `${prefix}:nivel-${level}` } : {}) });
      continue;
    }
    // The facility it is in: the outermost whose own name starts its name (nbl → nbl-control).
    const home = facilities
      .filter((f) => f.id.split(":")[0] === prefix)
      .map((f) => ({ f, b: f.id.split(":")[1] ?? "" }))
      .filter(({ b }) => local === b || local.startsWith(`${b}-`))
      .sort((p, q) => p.b.length - q.b.length)[0]?.f;
    if (!home) continue;
    buildings.set(home.id, home.label);
    out.set(a.id, { edificio: home.id });
  }
  const opts = (m: Map<string, string>) => [...m].map(([id, label]) => ({ id, label }));
  const scopes: S3ScopeGroup[] = [];
  if (buildings.size) scopes.push({ kind: "edificio", label: "Edificios", options: opts(buildings) });
  if (belts.size) scopes.push({ kind: "cinturon", label: "Cinturones de altitud", options: opts(belts) });
  if (floors.size) scopes.push({ kind: "piso", label: "Pisos", options: opts(floors).sort((a, b) => a.id.localeCompare(b.id)) });
  return { scopes, of: (id) => out.get(id) };
}
