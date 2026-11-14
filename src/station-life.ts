import type { Chore } from "@modules/chores/domain/chore";
import type { ChoreSession } from "@modules/habitat/application/habitat";
import { ITEMS } from "@modules/kitchen/data/items";
import type { Larder } from "@modules/station/application/bio-ops";
import { STATION_AREA_NAME, type StationCrew } from "@modules/station/application/station-crew";
import { TRIP_STORES_SHARE } from "@modules/station/data/galley";
import type { LanderBerth } from "@modules/station/domain/hangar-berth";
import type { Fixture } from "@modules/station/domain/interior";
import type { DuelView, SessionText } from "./ui/duel-view";
import type { StationAction } from "./station-interior";

const itemName = (id: string) => ITEMS.find((i) => i.id === id)?.name ?? id;
const MAX_CHORES_ON_CARD = 3;

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
  readonly crew: StationCrew;
  readonly berth: LanderBerth;
  readonly duel: DuelView;
  /** The lander is on the station's port now. */
  atPort(): boolean;
  /** The mothership's larder, while she is berthed here. */
  mothershipLarder(): Larder | undefined;
  openTasks(): void;
  openInventory(): void;
  openSettings(): void;
  say(text: string, seconds?: number): void;
  /** The hangar changed (the lander came in or went out): redraw it. */
  changed(): void;
}

/**
 * The station's crew areas and the hangar console on their machines' cards (docs/design/estacion-tripulacion.md):
 * the galley cooks from the station's larder with the shared chores engine, the mat opens the
 * settings and yoga, node 1 has the workouts, a cabin lets her sleep; the hangar console holds the
 * whole task list, the arm that berths the lander and the inventory.
 */
export class StationLife {
  /** The chore open in the sheet (for the experience suite's answer key). */
  session: ChoreSession | null = null;

  constructor(private readonly d: StationLifeDeps) {}

  actions(f: Fixture): StationAction[] {
    const a = f.action;
    if (a.kind === "hangar") {
      const atPort = this.d.atPort();
      const lander: StationAction = this.d.berth.inHangar
        ? { id: "sacar", label: "Sacar el módulo a su puerto", enabled: true }
        : { id: "meter", label: "Meter el módulo en el hangar", enabled: atPort, ...(atPort ? {} : { why: "El módulo no está acoplado a la estación: acóplalo en su puerto y el brazo lo meterá aquí" }) };
      return [{ id: "tareas", label: "Tareas", enabled: true }, lander, { id: "inventario", label: "Inventario", enabled: true }];
    }
    if (a.kind !== "tripulacion") return [];
    const chores = (area: Parameters<StationCrew["choresAt"]>[0]) => this.d.crew.choresAt(area).slice(0, MAX_CHORES_ON_CARD).map((c) => ({ id: `chore:${c.id}`, label: c.title, enabled: true }));
    switch (a.area) {
      case "cocina": {
        const dishes = chores("cocina");
        const larder = this.d.mothershipLarder();
        return [
          ...(dishes.length ? dishes : [{ id: "nada", label: "Cocinar", enabled: false, why: "La despensa de la estación no da para ningún plato: sus cultivos (Vida) la llenan" }]),
          { id: "viaje", label: "Víveres para la nodriza", enabled: !!larder, ...(larder ? {} : { why: "La nodriza no está atracada: los víveres para el viaje se cargan con ella aquí" }) },
        ];
      }
      case "esterilla":
        return [{ id: "ajustes", label: "Sentarse en loto: ajustes", enabled: true }, ...chores("esterilla")];
      case "ejercicio":
        return chores("ejercicio");
      case "camarotes":
        return [{ id: "dormir", label: "Dormir en un camarote", enabled: true }];
      case "aseo":
        return [{ id: "asearse", label: "Asearse", enabled: true }];
    }
  }

  act(f: Fixture, id: string): void {
    if (id.startsWith("chore:")) return this.startChore(id.slice(6));
    switch (id) {
      case "tareas":
        return this.d.openTasks();
      case "inventario":
        return this.d.openInventory();
      case "meter": {
        const why = this.d.berth.moveIn(this.d.atPort());
        this.d.changed();
        return this.d.say(why ?? "El brazo de la estación saca el módulo de su puerto y lo posa en la cuna del hangar, como Canadarm2 atraca un Dragon", 6);
      }
      case "sacar": {
        const why = this.d.berth.moveOut();
        this.d.changed();
        return this.d.say(why ?? "El brazo devuelve el módulo a su puerto: ya puedes volver a su cabina", 6);
      }
      case "ajustes":
        return this.d.openSettings();
      case "dormir":
        return this.d.say(this.d.crew.rest(), 6);
      case "asearse":
        return this.d.say("Aseo con toallitas, champú sin aclarado y el UWMS: en 0 g el aire arrastra lo que en la Tierra cae", 5);
      case "viaje": {
        const larder = this.d.mothershipLarder();
        if (!larder) return;
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
      return { id: c.id, title: c.title, detail: `${STATION_AREA_NAME[area]} · ${c.exercises.length} retos`, category: c.kind === "cocinar" ? "comida" : "salud", area };
    });
  }

  /** A chore of the station's areas, in the shared challenge sheet. */
  startChore(id: string): void {
    const chore = this.d.crew.chore(id);
    const session = chore && this.d.crew.start(id);
    if (!chore || !session || this.d.duel.visible) return;
    const run = session.run;
    this.session = session;
    const prev = this.d.duel.onClose;
    this.d.duel.onClose = () => {
      this.d.duel.onClose = prev;
      this.session = null;
      if (run.status === "done") this.d.say(chore.kind === "cocinar" ? `${chore.title.replace(/^Cocinar /, "")}: hecho con la despensa de la estación` : "Hecho", 5);
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
      (ans) => ({ ok: session.answer(ans) }),
    );
  }
}
