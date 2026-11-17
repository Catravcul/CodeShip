import type { Chore } from "@modules/chores/domain/chore";
import type { StepVisual } from "@modules/chores/domain/step-visual";
import type { ChoreSession } from "@modules/habitat/application/habitat";
import { ITEMS } from "@modules/kitchen/data/items";
import type { Larder } from "@modules/station/application/bio-ops";
import { STATION_AREA_NAME, type StationCrew } from "@modules/station/application/station-crew";
import { TRIP_STORES_SHARE } from "@modules/station/data/galley";
import type { LanderBerth } from "@modules/station/domain/hangar-berth";
import { ISS_OUTSIDE } from "@modules/station/data/iss";
import { DEPLOY_STEPS, type AirlockItem, type CargoAirlock } from "@modules/station/domain/cargo-airlock";
import type { Fixture } from "@modules/station/domain/interior";
import { OWN_BUNK } from "@modules/station/data/compartments";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { StationAction } from "./station-interior";

const itemName = (id: string) => ITEMS.find((i) => i.id === id)?.name ?? id;
const MAX_CHORES_ON_CARD = 3;
const MAX_DISHES_WITH_CARGO = 2;

const choreText = (c: Chore): SessionText => ({
  title: c.title,
  progress: c.kind === "yoga" ? "Posturas" : "Pasos",
  lives: "Intentos",
  order: "Ordena los pasos",
  submit: "Hacerlo",
  ok: c.kind === "yoga" ? "Entras en la postura" : "Paso hecho",
  bad: "Así no: inténtalo otra vez",
  sheet: true,
});

export interface StationLifeDeps {
  /** She sleeps in the quarter of this fixture (her bag): its folding door shuts, and opens when she wakes (then). */
  sleepIn?: (fixture: string, then: () => void) => void;
  readonly crew: StationCrew;
  readonly berth: LanderBerth;
  /** The Bishop cargo airlock on Tranquility. */
  readonly bishop: CargoAirlock;
  readonly duel: DuelView;
  /** The lander is on the station's port now. */
  atPort(): boolean;
  /** The lander's mass now (the arm moves up to 116 t), kg. */
  landerMassKg?(): number;
  /** The mothership's larder, while she is berthed here. */
  mothershipLarder(): Larder | undefined;
  openTasks(): void;
  openInventory(): void;
  openSettings(): void;
  /** The species catalogue (sanctuary-life.ts), from its terminal in Kibo. */
  openCatalog?(): void;
  say(text: string, seconds?: number): void;
  /** The view outside from the Cupola; `show` plays an arm move in it (berth, unberth, a Bishop trip). */
  lookOutside(show?: { kind: "atraque" | "desatraque" } | { kind: "bishop"; released: readonly AirlockItem[] }): void;
  /** The chore's solved steps acted out at its area's fixture (the galley), if it can be framed there. */
  stepVisual?(chore: Chore, area: string): StepVisual | undefined;
  /** Another owner of station chores (the life support's repairs): true if it took the chore. */
  otherChore?(id: string): boolean;
  /**
   * The galley's cargo orders (life-support-game.ts): Dragon and Cygnus fill the pantry
   * (docs/design/soporte-vital.md, «Despensa»).
   */
  cargoActions?(): StationAction[];
  cargoAct?(id: string): boolean;
  /**
   * Real ships: trip food from the station's pantry to the Starship's, said back; replaces the larder's trip
   * stores. Undefined when she is not berthed.
   */
  sendTripFood?(): string | undefined;
}

/**
 * The station's crew areas, the Cupola's arm and the Bishop on their cards (docs/design/estacion-real.md):
 * the galley in Unity cooks from the station's larder with the shared chores engine, the mat opens
 * the settings and yoga, Tranquility has the workouts and the toilet, Harmony's cabins let her sleep;
 * the Cupola's robotic workstation berths the lander with Canadarm2 and looks out; the Bishop stows,
 * releases and (as a licence) retrieves Juventas and the cubesats.
 */
export class StationLife {
  /** The chore open in the sheet (for the experience suite's answer key). */
  session: ChoreSession | null = null;

  constructor(private readonly d: StationLifeDeps) {}

  actions(f: Fixture): StationAction[] {
    const a = f.action;
    if (a.kind === "consola" && a.id === "catalogo") return [{ id: "catalogo", label: "Abrir el catálogo de especies", enabled: !!this.d.openCatalog }];
    if (a.kind === "brazo") {
      const atPort = this.d.atPort();
      const arm: StationAction = this.d.berth.onCbm
        ? { id: "desatracar", label: "Devolver el módulo a su IDA", enabled: true }
        : { id: "atracar", label: "Atracar el módulo en el CBM con el brazo", enabled: atPort, ...(atPort ? {} : { why: "El módulo no está acoplado a la estación: acóplalo en su IDA de cenit y Canadarm2 lo atracará en el CBM de Unity" }) };
      // The Cupola's robotic workstation: the arm, the outside cameras, the catalogue and its assembly, and the Bishop's release.
      const loaded = this.d.bishop.at("bishop");
      const deploy: StationAction = loaded.length
        ? { id: "soltar", label: `Soltar ${loaded.map((i) => i.name).join(" y ")} con la Bishop`, enabled: true }
        : { id: "soltar", label: "Soltar la carga de la Bishop", enabled: false, why: "La Bishop está vacía: entra en ella (puerto de babor de Tranquility) y sujeta la sonda o un cubesat a su placa" };
      return [arm, { id: "mirar", label: "Cámaras de fuera y ventanas", enabled: true }, { id: "inventario", label: "Catálogo y montaje", enabled: true }, deploy];
    }
    if (a.kind === "bishop") {
      // Inside the Bishop, at its payload plate: what goes on it and what comes back (Canadarm2 releases it from the Cupola).
      const b = this.d.bishop;
      const stow = b.at("almacen").slice(0, 2).map((i) => ({ id: `guardar:${i.id}`, label: `Sujetar ${i.name} a la placa`, enabled: true }));
      const out = b.at("fuera").slice(0, 1).map((i) => ({ id: `recoger:${i.id}`, label: `Recoger ${i.name} (licencia)`, enabled: true }));
      const loaded = b.at("bishop");
      return stow.length || out.length ? [...stow, ...out] : [{ id: "nada", label: "Sujetar una carga", enabled: false, why: loaded.length ? `Ya está sujeta: ${loaded.map((i) => i.name).join(" y ")}. Suéltala desde el puesto robótico de la Cupola` : "No queda nada en el almacén para sacar" }];
    }
    if (a.kind !== "tripulacion") return [];
    const chores = (area: Parameters<StationCrew["choresAt"]>[0]) => this.d.crew.choresAt(area).slice(0, MAX_CHORES_ON_CARD).map((c) => ({ id: `chore:${c.id}`, label: c.title, enabled: true }));
    switch (a.area) {
      case "cocina": {
        const dishes = chores("cocina");
        const larder = this.d.mothershipLarder();
        const cargo = this.d.cargoActions?.();
        // Real ships: the galley also orders the cargo vehicles, so it shows fewer dishes (all are in the task list)
        // and the trip stores only while the Starship is berthed.
        return [
          ...(dishes.length ? dishes.slice(0, cargo ? MAX_DISHES_WITH_CARGO : MAX_CHORES_ON_CARD) : [{ id: "nada", label: "Cocinar", enabled: false, why: cargo ? "La despensa está vacía: pide un carguero aquí (Dragon o Cygnus)" : "La despensa de la estación no da para ningún plato: sus cultivos (Vida) la llenan" }]),
          ...(cargo ?? []),
          ...(cargo && !larder ? [] : [{ id: "viaje", label: "Víveres para la nodriza", enabled: !!larder, ...(larder ? {} : { why: "La nodriza no está atracada: los víveres para el viaje se cargan con ella aquí" }) }]),
        ];
      }
      case "esterilla":
        return [{ id: "ajustes", label: "Sentarse en loto: ajustes", enabled: true }, ...chores("esterilla")];
      case "ejercicio":
        return chores("ejercicio");
      case "camarotes":
        // Each astronaut has a crew quarter of her own; Doménica is alone, so the other three are free.
        return f.id === OWN_BUNK ? chores("camarotes") : [{ id: "nada", label: "Dormir aquí", enabled: false, why: "Camarote libre: el tuyo es el 1, el de estribor" }];
      case "aseo":
        return [{ id: "asearse", label: "Asearse", enabled: true }];
    }
  }

  act(f: Fixture, id: string): void {
    if (id.startsWith("chore:")) return this.startChore(id.slice(6));
    if (this.d.cargoAct?.(id)) return;
    if (id.startsWith("guardar:")) {
      const it = id.slice(8);
      return this.d.say(this.d.bishop.stow(it) ?? `${this.d.bishop.item(it).name} va a la Bishop: cabe en sus 3,99 m³`, 5);
    }
    if (id.startsWith("recoger:")) {
      const it = id.slice(8);
      return this.d.say(this.d.bishop.retrieve(it) ?? `Canadarm2 recoge ${this.d.bishop.item(it).name} y vuelve al almacén. Licencia: en la ISS nunca se ha recogido así un satélite suelto`, 6);
    }
    switch (id) {
      case "catalogo":
        return this.d.openCatalog?.();
      case "tareas":
        return this.d.openTasks();
      case "inventario":
        return this.d.openInventory();
      case "mirar":
        return this.d.lookOutside();
      case "atracar": {
        const why = this.d.berth.berth(this.d.atPort(), this.d.landerMassKg ? { massKg: this.d.landerMassKg(), maxKg: ISS_OUTSIDE.canadarm2.maxPayloadKg } : undefined);
        if (why) return this.d.say(why, 6);
        this.d.lookOutside({ kind: "atraque" });
        return this.d.say(`Canadarm2 agarra el módulo lunar (${Math.round((this.d.landerMassKg?.() ?? 0) / 100) / 10} t de 116), lo saca de su IDA y lo atraca en el CBM de nadir de Unity, como un Cygnus: 16 pernos`.replace(".", ","), 6);
      }
      case "desatracar": {
        const why = this.d.berth.unberth();
        if (why) return this.d.say(why, 6);
        this.d.lookOutside({ kind: "desatraque" });
        return this.d.say("Canadarm2 suelta los pernos del CBM y devuelve el módulo a su IDA: ya puedes volver a su cabina", 6);
      }
      case "soltar": {
        const r = this.d.bishop.deploy();
        if ("why" in r) return this.d.say(r.why, 6);
        this.d.lookOutside({ kind: "bishop", released: r.released });
        return this.d.say(`Bishop: ${DEPLOY_STEPS.join(", ")}. ${r.released.map((i) => i.name).join(" y ")} ya vuela${r.released.length > 1 ? "n" : ""} sola${r.released.length > 1 ? "s" : ""}`, 8);
      }
      case "ajustes":
        return this.d.openSettings();
      case "asearse":
        return this.d.say("Aseo con toallitas, champú sin aclarado y el UWMS: en 0 g el aire arrastra lo que en la Tierra cae", 5);
      case "viaje": {
        const larder = this.d.mothershipLarder();
        if (!larder) return;
        if (this.d.sendTripFood) {
          const said = this.d.sendTripFood();
          return said ? this.d.say(said, 6) : undefined;
        }
        const sent = this.d.crew.sendTripStores(larder, TRIP_STORES_SHARE);
        return this.d.say(sent.length ? `A la despensa de la nodriza: ${sent.map(([i, n]) => `${n.toLocaleString("es-ES")} ${itemName(i)}`).join(", ")}` : "No queda nada que cargar", 6);
      }
    }
    void f;
  }

  /** The task list's chores for the station's areas. */
  taskFacts(): { id: string; title: string; detail: string; category: "comida" | "salud"; area: string }[] {
    return this.d.crew.chores().map((c) => {
      const area = this.d.crew.areaOf(c);
      // The task takes her to the fixture where it is done: her own sleeping bag for the night.
      return { id: c.id, title: c.title, detail: `${STATION_AREA_NAME[area]} · ${c.exercises.length} retos`, category: c.kind === "cocinar" ? "comida" : "salud", area: area === "camarotes" ? OWN_BUNK : area };
    });
  }

  /** A chore of the station's areas, in the shared challenge sheet. */
  startChore(id: string): void {
    if (this.d.otherChore?.(id)) return;
    const chore = this.d.crew.chore(id);
    const session = chore && this.d.crew.start(id);
    if (!chore || !session || this.d.duel.visible) return;
    const run = session.run;
    this.session = session;
    const area = this.d.crew.areaOf(chore);
    const visual = this.d.stepVisual?.(chore, area === "camarotes" ? OWN_BUNK : area);
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.d.duel.onRightPick = undefined;
      visual?.clear();
      this.session = null;
      if (run.status === "done" && chore.kind === "dormir") {
        this.d.say("Duermes en tu camarote, con la puerta plegable cerrada: el ventilador sopla y la luz está apagada", 6);
        this.d.sleepIn?.(OWN_BUNK, () => this.d.say("Despiertas a las 06:00 GMT, más tranquila: la puerta se abre", 5));
      }
      else if (run.status === "done") this.d.say(chore.kind === "cocinar" ? `${chore.title.replace(/^Cocinar /, "")}: hecho con la despensa de la estación` : "Hecho", 5);
    };
    this.d.duel.show(
      {
        get current() {
          return run.current;
        },
        get progress() {
          return run.step;
        },
        goal: run.steps,
        get lives() {
          return run.mistakesLeft;
        },
        maxLives: run.maxMistakes,
      },
      choreText(chore),
      (ans) => {
        const index = run.step;
        const ok = session.answer(ans);
        if (ok) visual?.stepDone(index);
        return { ok };
      },
    );
    // «Paso a paso»: each right pick is acted out at once.
    if (visual)
      this.d.duel.onRightPick = (id, slot) => {
        if (run.current?.id === id) visual.partDone?.(run.step, slot);
      };
  }
}
