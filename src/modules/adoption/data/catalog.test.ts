import { describe, expect, it } from "vitest";
import { SANCTUARY_SPECIES } from "@modules/sanctuary/data/fauna";
import { CATALOG_GROUPS, shipmentKg } from "../domain/entry";
import { SPECIES_CATALOG, catalogEntry } from "./catalog";
import { RACK_HABITATS } from "./rack-habitats";
import { ALL_SPECIES, EXTRA_SPECIES } from "./species-extra";

const url = /^https:\/\/\S+$/;

describe("VID-31 species catalogue: extensive, sourced and structured to grow", () => {
  it("merges every sanctuary species with the ring's domestic animals and real variants (more than 50 entries)", () => {
    expect(SPECIES_CATALOG.length).toBeGreaterThanOrEqual(50);
    const species = new Set(SPECIES_CATALOG.map((e) => e.speciesId));
    for (const s of SANCTUARY_SPECIES) expect(species.has(s.id), s.id).toBe(true);
    for (const s of EXTRA_SPECIES) expect(species.has(s.id), s.id).toBe(true);
    for (const id of ["gato", "chihuahua", "gallina", "perro-mestizo", "gato-siames", "gallina-sedosa", "medaka-himedaka", "medaka-hdrr", "pez-cebra", "gamba-amano", "armadillidium", "colembolo-iso", "grillo-bimaculado", "gusano-seda", "mosca-soldado", "tenebrio", "zophobas", "lombriz", "lombriz-comun"]) expect(catalogEntry(id), id).toBeDefined();
  });

  it("ids are unique, species exist, and every group of the filter has entries", () => {
    expect(new Set(SPECIES_CATALOG.map((e) => e.id)).size).toBe(SPECIES_CATALOG.length);
    for (const e of SPECIES_CATALOG) expect(ALL_SPECIES.some((s) => s.id === e.speciesId), e.id).toBe(true);
    for (const g of CATALOG_GROUPS) expect(SPECIES_CATALOG.some((e) => e.group === g.id), g.id).toBe(true);
  });

  it("each entry: names, a short description (2–3 lines), contributions and precautions apart, flight with its source, how it arrives, an icon", () => {
    for (const e of SPECIES_CATALOG) {
      expect(e.name.length, e.id).toBeGreaterThan(2);
      expect(e.plural.length, e.id).toBeGreaterThan(2);
      expect(e.description.length, e.id).toBeGreaterThan(40);
      expect(e.description.length, e.id).toBeLessThanOrEqual(200);
      expect(Array.isArray(e.contributions) && Array.isArray(e.precautions), e.id).toBe(true);
      expect(e.precautions.length, e.id).toBeGreaterThan(0);
      expect(e.flight.source, e.id).toMatch(url);
      expect(e.flight.text.length, e.id).toBeGreaterThan(10);
      expect(e.source, e.id).toMatch(url);
      expect(e.acquire.count, e.id).toBeGreaterThan(0);
      expect(e.icon.body, e.id).toMatch(/^#[0-9a-f]{6}$/i);
      if (e.acquire.kind === "eclosion") expect(e.acquire.source, e.id).toMatch(url);
    }
  });

  it("animals that can be befriended say what they help with (their `help`, asked through a mind program)", () => {
    for (const e of SPECIES_CATALOG.filter((x) => x.lodging !== "bucle" && x.id !== "granadero")) expect(e.contributions.length, e.id).toBeGreaterThan(0);
  });

  it("both snails, side by side: Biomphalaria has flown and hosts the schistosome in the wild; the nerite never flew, cleans best and cannot breed in fresh water", () => {
    const bio = catalogEntry("caracol")!;
    const ner = catalogEntry("nerita")!;
    expect(bio.scientific).toBe("Biomphalaria glabrata");
    expect(ner.scientific).toBe("Neritina natalensis");
    expect(bio.flight.status).toBe("volo");
    expect(ner.flight.status).toBe("sin-vuelo");
    expect(bio.precautions.join(" ")).toMatch(/esquistosoma/);
    expect(bio.precautions.join(" ")).toMatch(/laboratorio/);
    expect(ner.description).toMatch(/limpiacristales/);
    expect(ner.description).toMatch(/no eclosionan en agua dulce/);
    expect(bio.lodging).toBe("caracoles");
    expect(ner.lodging).toBe("caracoles");
  });

  it("only plants and the biofilter are aboard at the start: no animal (Doménica starts alone)", () => {
    const aboard = SPECIES_CATALOG.filter((e) => e.aboard);
    expect(aboard.map((e) => e.id).sort()).toEqual(["ceratofilo", "cultivos", "nitrificantes"]);
    for (const e of aboard) expect(["plantas", "microbios"]).toContain(e.group);
  });

  it("an import flies the animals, their transport habitat and their food for the whole transfer", () => {
    const cat = catalogEntry("gato")!.acquire;
    if (cat.kind !== "importar") throw new Error("el gato se importa");
    expect(shipmentKg(cat, 370)).toBeCloseTo(4 + 8 + 0.06 * 370, 6);
    // Dormant eggs and cysts hatch aboard from the ship's bank, in days.
    const art = catalogEntry("artemia")!.acquire;
    expect(art.kind).toBe("eclosion");
  });

  it("«real» only if it flew or lived in microgravity; adult hens never did (only fertilised eggs)", () => {
    for (const e of SPECIES_CATALOG) if (e.flight.status === "sin-vuelo") expect(e.real, e.id).toBe(false);
    for (const id of ["medaka", "pez-cebra", "caracol", "grillo", "gusano-seda", "tardigrado", "artemia", "raton"]) expect(catalogEntry(id)!.real, id).toBe(true);
    for (const id of ["nerita", "gallina", "gallina-sedosa", "lombriz"]) expect(catalogEntry(id)!.real, id).toBe(false);
  });

  it("real habitats for the rack slots: an AQH-type tank and a rodent habitat, sourced, at 0 g, taking only real species", () => {
    expect(RACK_HABITATS.map((h) => h.id)).toEqual(["habitat-acuatico", "habitat-roedores"]);
    for (const h of RACK_HABITATS) {
      expect(h.source).toMatch(url);
      expect(h.area.gravityG).toBe(0);
      expect(h.capacity).toBeGreaterThan(0);
      for (const id of h.accepts) expect(SPECIES_CATALOG.filter((e) => e.speciesId === id).every((e) => e.real), id).toBe(true);
    }
    expect(RACK_HABITATS[0]!.area.waterM3 * 1000).toBeCloseTo(3.2, 6);
  });
});
