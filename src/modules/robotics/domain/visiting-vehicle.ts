/**
 * A cargo vehicle caught by the arm and berthed on a CBM (Cygnus; HTV did the same), as on the ISS
 * (docs/design/brazo-robotico.md, «Captura»): it flies itself to the capture point 10 m from the station and
 * holds; the crew commands free drift (its thrusters off); the arm's LEE closes its snares on the grapple
 * fixture; the arm brings it to the CBM, four latches pull it in (first stage) and 16 bolts close (second stage);
 * then the arm lets go. Each step only after the one before.
 */
export type VisitorPhase = "en-camino" | "punto-captura" | "deriva-libre" | "capturado" | "primera-etapa" | "atracado";

export const VISITOR_PHASE_NAME: Readonly<Record<VisitorPhase, string>> = {
  "en-camino": "en camino",
  "punto-captura": "esperando en el punto de captura",
  "deriva-libre": "en deriva libre",
  capturado: "capturado por el brazo",
  "primera-etapa": "arrimado al CBM (primera etapa)",
  atracado: "atracado",
};

export class VisitingVehicle {
  private _phase: VisitorPhase = "en-camino";
  /** The CBM it is berthed on. */
  cbm: string | undefined;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly massKg: number,
  ) {}

  get phase(): VisitorPhase {
    return this._phase;
  }

  private step(from: VisitorPhase, to: VisitorPhase, why: string): string | undefined {
    if (this._phase !== from) return why;
    this._phase = to;
    return undefined;
  }

  /** It reached the capture point and holds there. */
  arrive(): string | undefined {
    return this.step("en-camino", "punto-captura", "Ya ha llegado");
  }
  /** The crew commands free drift: its thrusters stop so the arm can catch it. */
  freeDrift(): string | undefined {
    return this.step("punto-captura", "deriva-libre", this._phase === "en-camino" ? "Aún no ha llegado al punto de captura" : "Ya está en deriva libre");
  }
  /** The LEE closes on its grapple fixture. Never with its thrusters on. */
  capture(): string | undefined {
    if (this._phase === "punto-captura") return "Con los propulsores encendidos no: primero la deriva libre";
    return this.step("deriva-libre", "capturado", "No está esperando a que la capturen");
  }
  /** At the CBM: the four latches pull it in. `cbmFree`: nothing else berthed there. */
  firstStage(cbm: string, cbmFree: boolean): string | undefined {
    if (!cbmFree) return "El CBM está ocupado";
    const why = this.step("capturado", "primera-etapa", "El brazo no la ha capturado");
    if (!why) this.cbm = cbm;
    return why;
  }
  /** The 16 bolts drive home: berthed; the arm can let go. */
  secondStage(): string | undefined {
    return this.step("primera-etapa", "atracado", "Primero los pestillos de la primera etapa");
  }
}
