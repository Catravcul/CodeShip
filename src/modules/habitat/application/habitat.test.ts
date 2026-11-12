import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../content/random";
import { LETTUCE_OUTREDGEOUS } from "@modules/garden/data/species";
import { CHILE_ESPANOLA } from "@modules/garden/data/species";
import { RECIPES } from "@modules/kitchen/data/recipes";
import { SUN_SALUTATION, YOGA_SEQUENCES } from "@modules/wellness/data/yoga";
import { Ship } from "@modules/ship/domain/ship";
import { explorerDesign } from "@modules/ship/data/explorer";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import { Cat } from "@modules/pets/domain/cat";
import { BEFRIEND, RESPECT_PLANTS } from "@modules/pets/data/rules";
import { EXERCISES } from "@modules/mind-duel/data/exercises";
import { CAT_LESSONS } from "@modules/pets/data/rules";
import { Hen } from "@modules/poultry/domain/hen";
import { MACHINES } from "@modules/life-support/data/machines";
import { PROCESSES } from "@modules/kitchen/data/processes";
import { CAT_GRASS, POTATO_NORLAND, TOMATO_RED_ROBIN, WHEAT_APOGEE } from "@modules/garden/data/species";
import { RESPECT_HENS } from "@modules/pets/data/rules";
import { Mailbox } from "@modules/story/domain/mailbox";
import { NEVAEH_LETTERS } from "@modules/story/data/nevaeh";
import { Dog } from "@modules/pets/domain/dog";
import { ANIMAL_LESSONS, DOG_HENS_FAMILY, DOG_RESPECT_HENS, HEN_BROOD, HEN_RESPECT_YOUNG } from "@modules/pets/data/family-lessons";
import { STORY } from "@modules/story/data/nevaeh";
import { LETTUCE_OUTREDGEOUS as LETTUCE, SOYBEAN_HOYT } from "@modules/garden/data/species";
import { swapChore } from "@modules/chores/application/catalog";
import { partById } from "@modules/ship/data/parts";
import { Habitat, type ChoreSession, type Conversation, type HabitatEvent } from "./habitat";

const right = (e: Exercise): Answer => (e.kind === "order" ? { kind: "order", order: e.solution } : { kind: "choice", index: e.correct });
const wrong = (e: Exercise): Answer =>
  e.kind === "order" ? { kind: "order", order: [...e.solution].reverse() } : { kind: "choice", index: (e.correct + 1) % e.options.length };

function converse(c: Conversation, answer: (e: Exercise) => Answer) {
  while (c.duel.status === "thinking") c.answer(answer(c.duel.current!));
}

/** Run days of life with a dutiful carer: two meals, play and cuddles a day, plants watered. */
function live(h: Habitat, days: number): HabitatEvent[] {
  const events: HabitatEvent[] = [];
  for (let t = 0; t < days; t += 0.05) {
    h.tick(0.05);
    events.push(...h.drainEvents());
    if (Math.round(t / 0.05) % 10 === 0) {
      for (const c of h.cats) {
        c.feed(c.dailyKcal / 2);
        c.playWith();
        c.pet();
      }
      for (const p of h.plants) p.waterIt();
    }
  }
  return events;
}

const count = (ev: HabitatEvent[], type: HabitatEvent["type"]) => ev.filter((e) => e.type === type).length;

describe("Habitat", () => {
  it("an untrained cat bites a new plant; after talking to its mind it only sniffs", () => {
    const wild = new Habitat(seededRandom(7), 3);
    wild.adopt(new Cat("luna", "Luna", 4));
    wild.plant("l1", LETTUCE_OUTREDGEOUS);
    expect(count(live(wild, 3), "plant-bitten")).toBeGreaterThan(0);

    const tamed = new Habitat(seededRandom(7), 3);
    tamed.adopt(new Cat("luna", "Luna", 4));
    const talk = tamed.talkToCat("luna", RESPECT_PLANTS);
    converse(talk, right);
    expect(tamed.drainEvents()).toContainEqual({ type: "rule-learned", catId: "luna", ruleId: "respetar-plantas" });
    tamed.plant("l1", LETTUCE_OUTREDGEOUS);
    const ev = live(tamed, 3);
    expect(count(ev, "plant-bitten")).toBe(0);
    expect(count(ev, "plant-sniffed")).toBeGreaterThan(0);
  });

  it("failing the talk annoys the cat and teaches nothing", () => {
    const h = new Habitat(seededRandom(1), 3);
    const cat = new Cat("luna", "Luna", 4);
    h.adopt(cat);
    converse(h.talkToCat("luna", RESPECT_PLANTS), wrong);
    expect(cat.rules).toHaveLength(0);
    expect(cat.stress).toBeGreaterThan(0.2);
    expect(h.drainEvents()).toContainEqual({ type: "cat-annoyed", catId: "luna" });
  });

  it("a new cat is introduced step by step; programming both to greet makes friends sooner", () => {
    const daysToFriends = (program: boolean) => {
      const h = new Habitat(seededRandom(3), 3);
      h.adopt(new Cat("luna", "Luna", 4));
      h.adopt(new Cat("sol", "Sol", 3.5));
      if (program) for (const id of ["luna", "sol"]) converse(h.talkToCat(id, BEFRIEND), right);
      let days = 0;
      while (!h.introductions[0]!.friends && days < 60) {
        live(h, 0.5);
        days += 0.5;
      }
      return days;
    };
    const untrained = daysToFriends(false);
    const trained = daysToFriends(true);
    expect(trained).toBeLessThan(untrained);
    expect(trained).toBeGreaterThanOrEqual(3); // still needs the stages, no shortcut
  });

  it("needs one set of resources per cat plus one", () => {
    const h = new Habitat(seededRandom(1), 2);
    h.adopt(new Cat("a", "A", 4));
    expect(h.resourcesOk).toBe(true);
    h.adopt(new Cat("b", "B", 4));
    expect(h.resourcesOk).toBe(false);
  });

});


function finish(session: ChoreSession, answer: (e: Exercise) => Answer = right) {
  while (session.run.status === "doing") session.answer(answer(session.run.current!));
}

describe("Habitat chores (everything is a code challenge)", () => {
  const setup = () => {
    const ship = Ship.create(explorerDesign());
    const h = new Habitat(seededRandom(5), 3, ship, "Berón");
    h.adopt(new Cat("luna", "Luna", 4));
    h.plant("l1", LETTUCE_OUTREDGEOUS);
    return { h, ship };
  };
  const find = (h: Habitat, kind: string) => h.chores(RECIPES, YOGA_SEQUENCES).find((c) => c.kind === kind);

  it("a furious asteroid's jolt creates care scenarios for plants, cats and the ship", () => {
    const { h, ship } = setup();
    ship.damage(0.4);
    h.jolt(1, "Bennu sacudió la nave");
    const kinds = h.chores(RECIPES, YOGA_SEQUENCES).map((c) => c.kind);
    expect(kinds).toEqual(expect.arrayContaining(["curar-planta", "calmar-gato", "reparar-nave"]));
    expect(find(h, "curar-planta")!.scenario).toContain("Bennu sacudió la nave");
  });

  it("solving a chore's challenges applies its effect", () => {
    const { h, ship } = setup();
    ship.damage(0.4);
    h.jolt(1, "Bennu sacudió la nave");
    const plant = h.plants[0]!;
    const before = plant.health;
    finish(h.start(find(h, "curar-planta")!));
    expect(plant.health).toBeCloseTo(Math.min(1, before + 0.4));
    finish(h.start(find(h, "reparar-nave")!));
    expect(ship.hullIntegrity).toBeCloseTo(0.9);
    const cat = h.cats[0]!;
    finish(h.start(find(h, "calmar-gato")!));
    expect(cat.stress).toBeLessThan(0.5);
  });

  it("failing a chore leaves things as they were", () => {
    const { h } = setup();
    h.jolt(1, "Bennu sacudió la nave");
    const plant = h.plants[0]!;
    const before = plant.health;
    finish(h.start(find(h, "curar-planta")!), wrong);
    expect(plant.health).toBe(before);
    expect(h.drainEvents().some((e) => e.type === "chore-failed")).toBe(true);
  });

  it("a cat that bites a plant leaves a scenario on that plant's care chore", () => {
    const h = new Habitat(seededRandom(7), 3);
    h.adopt(new Cat("luna", "Luna", 4));
    h.plant("l1", LETTUCE_OUTREDGEOUS);
    const ev = live(h, 3);
    expect(count(ev, "plant-bitten")).toBeGreaterThan(0);
    const p = h.plants[0]!;
    p.damage(p.health - 0.5); // make sure it needs care, without killing it
    expect(h.chores([], []).find((c) => c.kind === "curar-planta")!.scenario).toContain("Luna mordisqueó");
  });

  it("grow, shake, harvest and cook: a chile ends up as a meal for the crew", () => {
    const h = new Habitat(seededRandom(2), 2);
    h.plant("c1", CHILE_ESPANOLA);
    const milpa = RECIPES.find((r) => r.id === "milpa")!;
    expect(h.canCook(milpa)).toBe(false);
    let shook = false;
    for (let day = 0; day < 101 && !h.plants[0]!.readyToHarvest; day += 0.5) {
      live(h, 0.5);
      const shake = h.chores([], []).find((c) => c.kind === "agitar");
      if (shake) {
        finish(h.start(shake));
        shook = true;
      }
    }
    expect(shook).toBe(true);
    finish(h.start(h.chores([], []).find((c) => c.kind === "cosechar")!));
    expect(h.larder("chile-espanola")).toBe(2);
    const satiety = h.crew.satiety;
    finish(h.start(h.chores(RECIPES, []).find((c) => c.targetId === "milpa")!, { recipes: RECIPES }));
    expect(h.larder("chile-espanola")).toBe(1);
    expect(h.meals).toBe(2);
    expect(h.crew.satiety).toBeGreaterThan(satiety);
  });

  it("each solved yoga challenge is one posture; the sequence improves the crew", () => {
    const h = new Habitat(seededRandom(1));
    h.crew.startle(0.5);
    const stress = h.crew.stress;
    const session = h.start(h.chores([], [SUN_SALUTATION])[0]!);
    session.answer(right(session.run.current!));
    expect(h.drainEvents()).toContainEqual({ type: "posture", sequenceId: "saludo-al-sol", index: 0 });
    finish(session);
    const postures = h.drainEvents().filter((e) => e.type === "posture");
    expect(postures).toHaveLength(11);
    expect(h.crew.stress).toBeCloseTo(stress - 0.3);
  });

  const ctx = { recipes: RECIPES, yoga: YOGA_SEQUENCES, processes: PROCESSES, lessons: CAT_LESSONS };
  const all = (h: Habitat) => h.chores(RECIPES, YOGA_SEQUENCES, ctx);
  const doKind = (h: Habitat, kind: string, pick?: (id: string) => boolean) => {
    const c = all(h).find((x) => x.kind === kind && (!pick || pick(x.id)));
    expect(c, kind).toBeDefined();
    finish(h.start(c!, ctx));
  };

  it("every recipe step is its own challenge", () => {
    const h = new Habitat(seededRandom(1), 2);
    h.stock("huevo", 2);
    const c = all(h).find((x) => x.targetId === "huevos-revueltos")!;
    expect(c.exercises).toHaveLength(RECIPES.find((r) => r.id === "huevos-revueltos")!.steps.value.length);
    const temp = c.exercises.find((e) => e.kind === "choice" && e.skill === "completar");
    expect(temp && temp.kind === "choice" && temp.options[temp.correct]).toBe("71 °C");
  });

  it("hens lay eggs; collecting them lets the crew cook a potato omelette", () => {
    const h = new Habitat(seededRandom(4), 2, undefined, "Berón", MACHINES);
    for (const [id, n] of [["clara", "Clara"], ["yema", "Yema"], ["pinta", "Pinta"]] as const) h.addHen(new Hen(id, n));
    h.stock("pienso-gallinas", 6);
    h.stock("papa-norland", 2);
    for (let d = 0; d < 2; d += 0.25) {
      h.tick(0.25);
      if (all(h).some((c) => c.kind === "alimentar-gallinas")) doKind(h, "alimentar-gallinas");
    }
    expect(h.nestEggs).toBeGreaterThanOrEqual(3);
    doKind(h, "recoger-huevos");
    expect(h.larder("huevo")).toBeGreaterThanOrEqual(3);
    doKind(h, "cocinar", (id) => id === "cocinar-tortilla-papa");
    expect(h.larder("papa-norland")).toBe(0);
  });

  it("the bioreactor grows meat with no animal killed, and the cats eat it", () => {
    const h = new Habitat(seededRandom(4), 2, undefined, "Berón", MACHINES);
    const luna = new Cat("luna", "Luna", 4);
    h.adopt(luna);
    h.stock("medio-cultivo", 12);
    doKind(h, "cultivo-sembrar");
    for (let d = 0; d < 20 && h.bioreactor.stage !== "listo"; d += 0.1) {
      h.tick(0.1);
      luna.feed(luna.dailyKcal * 0.1);
      const step = all(h).find((c) => c.kind === "cultivo-renovar" || c.kind === "cultivo-diferenciar");
      if (step) finish(h.start(step, ctx));
    }
    doKind(h, "cultivo-cosechar");
    expect(h.larder("carne-cultivada")).toBe(2000);
    luna.tick(0.8, { resourcesOk: true });
    const feed = all(h).find((c) => c.kind === "alimentar-gato")!;
    expect(feed.scenario).toContain("carne cultivada");
    finish(h.start(feed, ctx));
    expect(h.larder("carne-cultivada")).toBe(2000 - 99);
  });

  it("wheat and soybean become flour and hen feed through the mill", () => {
    const h = new Habitat(seededRandom(4), 2, undefined, "Berón", MACHINES);
    h.stock("trigo-apogee", 2);
    h.stock("soja-hoyt", 1);
    doKind(h, "procesar", (id) => id === "procesar-moler-trigo");
    expect(h.larder("harina")).toBe(2);
    doKind(h, "procesar", (id) => id === "procesar-pienso-gallinas");
    expect(h.larder("pienso-gallinas")).toBe(6);
    expect(all(h).some((c) => c.targetId === "chapati")).toBe(true);
  });

  it("a jolt breaks machines: their chores wait until a repair challenge is solved", () => {
    const h = new Habitat(seededRandom(9), 2, undefined, "Berón", MACHINES);
    h.stock("huevo", 2);
    h.jolt(1, "Bennu sacudió la nave");
    const broken = h.machines.filter((m) => !m.working);
    expect(broken.length).toBeGreaterThan(0);
    for (const m of broken) {
      expect(all(h).filter((c) => c.machine === m.id).map((c) => c.kind)).toEqual(["reparar-maquina"]);
      doKind(h, "reparar-maquina", (id) => id === `reparar-${m.id}`);
      expect(m.working).toBe(true);
    }
  });

  it("the sickbay treats anyone: the crew after a jolt, a cat after a fight", () => {
    const h = new Habitat(seededRandom(3), 3, undefined, "Berón", MACHINES);
    h.jolt(0.8, "Bennu sacudió la nave");
    const crewCase = all(h).find((c) => c.kind === "atender-paciente" && c.targetId === h.crew.id)!;
    expect((crewCase.exercises[0] as { question: string }).question).toContain("ABCDE");
    finish(h.start(crewCase, ctx));
    expect(h.crew.health.untreated).toHaveLength(0);
    live(h, 4);
    expect(h.crew.health.burden).toBe(0);

    const luna = new Cat("luna", "Luna", 4);
    const nube = new Cat("nube", "Nube", 3.5);
    h.adopt(luna);
    h.adopt(nube)[0]!.startAt("contacto-visual");
    let fought = false;
    for (let d = 0; d < 20 && !fought; d += 0.05) {
      luna.startle(0.05);
      nube.startle(0.05);
      h.tick(0.05);
      fought = h.drainEvents().some((e) => e.type === "cats-fought");
    }
    expect(fought).toBe(true);
    expect(h.introductions[0]!.canMeet).toBe(false);
    const cases = all(h).filter((c) => c.kind === "atender-paciente" && (c.targetId === "luna" || c.targetId === "nube"));
    expect(cases).toHaveLength(2);
    expect(cases[0]!.scenario).toContain("se pelearon");
  });

  it("biting a toxic plant poisons the cat; cat grass keeps most bites away", () => {
    const bites = (grass: boolean) => {
      const h = new Habitat(seededRandom(11), 3);
      const luna = new Cat("luna", "Luna", 4);
      h.adopt(luna);
      if (grass) {
        const g = h.plant("g1", CAT_GRASS);
        for (let d = 0; d < 11; d++) g.tick(1, { lit: true }), g.waterIt();
      }
      h.plant("t1", TOMATO_RED_ROBIN);
      h.plant("p1", POTATO_NORLAND);
      const ev = live(h, 3);
      return { bitten: count(ev, "plant-bitten"), luna };
    };
    const without = bites(false);
    expect(without.bitten).toBeGreaterThan(0);
    expect(without.luna.health.conditions.some((c) => c.kind === "intoxicacion")).toBe(true);
    expect(bites(true).bitten).toBeLessThan(without.bitten);
  });

  it("a cat that stalks the hens gets a programming chore; once programmed it leaves them alone", () => {
    const h = new Habitat(seededRandom(6), 3);
    h.adopt(new Cat("luna", "Luna", 4));
    h.addHen(new Hen("clara", "Clara"));
    expect(count(live(h, 3), "hens-stalked")).toBeGreaterThan(0);
    const prog = all(h).find((c) => c.kind === "programar-animal" && c.id.endsWith(RESPECT_HENS.rule.id))!;
    expect(prog.scenario).toContain("acechó a las gallinas");
    finish(h.start(prog, ctx));
    expect(count(live(h, 3), "hens-stalked")).toBe(0);
  });

  it("wheat grows in the BPC's 77 days", () => {
    const h = new Habitat(seededRandom(1), 2);
    const w = h.plant("w1", WHEAT_APOGEE);
    for (let d = 0; d < 77; d++) w.tick(1, { lit: true }), w.waterIt();
    expect(w.readyToHarvest).toBe(true);
  });

  it("Nevaeh's nano_net missions are not chores on board; reaching the goal brings the next letter", () => {
    const h = new Habitat(seededRandom(1), 2, undefined, "Doménica");
    h.mailbox = new Mailbox(NEVAEH_LETTERS);
    expect(h.mailbox.pendingMissions.map((l) => l.id)).toEqual(["nano-net-nucleo"]);
    expect(all(h).some((c) => c.kind.startsWith("nano-"))).toBe(false);
    h.mailbox.achieve("nucleo");
    h.tick(0.3);
    expect(h.mailbox.pendingMissions.map((l) => l.id)).toEqual(["nano-net-generar"]);
    h.jolt(0.3, "Bennu");
    expect(h.mailbox.received.some((r) => r.letter.id === "sacudida")).toBe(true);
  });

  describe("families on board", () => {
    const fctx = { ...ctx, lessons: ANIMAL_LESSONS };
    const fall = (h: Habitat) => h.chores(RECIPES, YOGA_SEQUENCES, fctx);
    const program = (h: Habitat, animalId: string, ruleId: string) => {
      const c = fall(h).find((x) => x.kind === "programar-animal" && x.id === `programar-${animalId}-${ruleId}`);
      expect(c, `${animalId} ${ruleId}`).toBeDefined();
      finish(h.start(c!, fctx));
    };
    /** Keep everyone fed and calm so only their programs matter. */
    const care = (h: Habitat, days: number) => {
      const events: HabitatEvent[] = [];
      for (let t = 0; t < days; t += 0.05) {
        h.tick(0.05);
        events.push(...h.drainEvents());
        for (const a of [...h.cats, ...h.dogs]) {
          a.feed(a.dailyKcal * 0.05);
          a.playWith();
          a.pet();
        }
        for (const hen of h.hens) hen.feed();
        if (h.crew.satiety < 0.5) h.crew.eat();
        // The sickbay treats anyone hurt in a chase.
        for (const c of fall(h).filter((x) => x.kind === "atender-paciente")) finish(h.start(c, fctx));
      }
      return events;
    };

    it("programming the coop door frees the hens; free hens peck seedlings until programmed", () => {
      const h = new Habitat(seededRandom(3), 2, undefined, "Doménica", MACHINES);
      h.addHen(new Hen("clara", "Clara"));
      const door = fall(h).find((c) => c.kind === "abrir-gallinero")!;
      finish(h.start(door, fctx));
      expect(h.hensFree).toBe(true);
      h.plant("l1", LETTUCE);
      expect(count(care(h, 2), "hen-pecked-plant")).toBeGreaterThan(0);
      program(h, "clara", "gallina-respetar-plantas");
      h.plant("l2", LETTUCE);
      expect(count(care(h, 2), "hen-pecked-plant")).toBe(0);
    });

    it("a dog that chases hens learns to leave them, then to lie with them, and they become family", () => {
      const h = new Habitat(seededRandom(8), 2, undefined, "Doménica");
      h.hensFree = true;
      h.addDog(new Dog("coco", "Coco", 2.5));
      h.addHen(new Hen("pinta", "Pinta"));
      expect(count(care(h, 3), "animal-hostile")).toBeGreaterThan(0);
      expect(fall(h).some((c) => c.id.endsWith(DOG_HENS_FAMILY.rule.id))).toBe(false);
      program(h, "coco", DOG_RESPECT_HENS.rule.id);
      care(h, 1);
      program(h, "coco", DOG_HENS_FAMILY.rule.id);
      const ev = care(h, 6);
      expect(count(ev, "animal-hostile")).toBe(0);
      expect(count(ev, "family-formed")).toBe(1);
      expect([...h.families[0]!.species].sort()).toEqual(["gallina", "perro"]);
    });

    it("a broody hen adopts a chihuahua puppy; the family calms Doménica and Kushal calls", () => {
      const run = (adopt: boolean) => {
        const h = new Habitat(seededRandom(5), 2, undefined, "Doménica");
        h.mailbox = new Mailbox(STORY);
        h.hensFree = true;
        h.addHen(new Hen("yema", "Yema", true));
        h.addDog(new Dog("pepa", "Pepa", 0.9, "cachorro"));
        care(h, 2);
        if (adopt) {
          program(h, "yema", HEN_RESPECT_YOUNG.rule.id);
          care(h, 1);
          program(h, "yema", HEN_BROOD.rule.id);
        }
        const ev = care(h, 20);
        return { h, ev };
      };
      const { h, ev } = run(true);
      expect(count(ev, "family-formed")).toBe(1);
      expect(h.families[0]!.motherId).toBe("yema");
      expect(h.mailbox!.received.some((r) => r.letter.id === "kushal-familia")).toBe(true);
      const alone = run(false).h.crew;
      expect(h.crew.loneliness).toBeLessThan(alone.loneliness);
      expect(h.crew.stress).toBeLessThan(alone.stress);
    });

    it("dogs eat eggs when there is no cultured meat", () => {
      const h = new Habitat(seededRandom(1), 2);
      const coco = new Dog("coco", "Coco", 2.5);
      h.addDog(coco);
      h.stock("huevo", 4);
      h.tick(0.6);
      const feed = fall(h).find((c) => c.kind === "alimentar-perro")!;
      finish(h.start(feed, fctx));
      expect(h.larder("huevo")).toBe(2);
      expect(coco.satiety).toBeGreaterThan(0.8);
    });

    it("the racks alone feed a few percent; the farm deck's beds make the trip self-sufficient", () => {
      const h = new Habitat(seededRandom(1), 2, undefined, "Doménica");
      for (let i = 0; i < 18; i++) h.plant(`p${i}`, LETTUCE);
      h.addHen(new Hen("clara", "Clara"));
      h.adopt(new Cat("luna", "Luna", 4));
      h.addDog(new Dog("coco", "Coco", 2.5));
      expect(h.sustainability.ratio).toBeLessThan(0.1);
      for (let i = 0; i < 8; i++) h.bed(`bancal-${i}`, i % 2 ? SOYBEAN_HOYT : WHEAT_APOGEE, 15);
      expect(h.sustainability.ratio).toBeGreaterThan(1);
      expect(all(h).some((c) => c.kind === "regar" && c.targetId?.startsWith("bancal"))).toBe(false);
    });
  });
});

describe("Habitat: swapping parts in the ship bay", () => {
  const swapSetup = () => {
    const ship = Ship.create(explorerDesign());
    return { ship, h: new Habitat(seededRandom(9), 3, ship, "Berón") };
  };
  const done = (s: ChoreSession, answer = right) => {
    while (s.run.status === "doing") s.answer(answer(s.run.current!));
  };

  it("finishing the swap chore refits the real ship", () => {
    const { h, ship } = swapSetup();
    done(h.start(swapChore(ship.design, "motor", partById("aerojet-mr-104h")!)));
    expect(ship.design.mainEngines[0]!.model.id).toBe("aerojet-mr-104h");
    expect(h.drainEvents().some((e) => e.type === "chore-done")).toBe(true);
  });

  it("failing it leaves the old part on", () => {
    const { h, ship } = swapSetup();
    done(h.start(swapChore(ship.design, "rcs", partById("aerojet-mr-107t")!)), wrong);
    expect(ship.design.rcs[0]!.model.id).toBe("aerojet-mr-106l");
  });
});
