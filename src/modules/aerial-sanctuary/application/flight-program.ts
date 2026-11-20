import type { Chore } from "@modules/chores/domain/chore";
import type { Exercise } from "@modules/mind-duel/domain/exercise";
import type { CraftSpec, Leg } from "../domain/travel";
import { block, choice, num, order } from "./challenge-kit";

/**
 * «Por reto» (reglas.md §3.6): the island flight programmed as a code challenge, then flown by itself and seen. The
 * steps are a real helicopter's (start, vertical take-off to a hover and the climb, the heading, the cruise, the
 * approach and the landing on the deck); the carpet's are Cold Sanctuary's (it unrolls, rises, flies its 30 s and
 * comes down on the next platform). The question uses this trip's own distance, speed and heights.
 */
export function flightSteps(leg: Leg, c: CraftSpec, to: string): string[] {
  const cruise = Math.round(Math.max(leg.a.y, leg.b.y) + c.cruiseAboveM);
  const heading = Math.round(((Math.atan2(leg.b.x - leg.a.x, leg.b.z - leg.a.z) * 180) / Math.PI + 360) % 360);
  if (leg.craft === "alfombra")
    return [`desenrollar la alfombra en el andén y sentarse`, `elevarse a ${cruise} m`, `poner rumbo ${heading}°`, `volar ${c.fixedS ?? 30} s hasta ${to}`, `bajar al andén y posarse`];
  return [`arrancar los motores y el rotor`, `despegar en vertical y subir a ${cruise} m`, `poner rumbo ${heading}°`, `acelerar a ${Math.round(c.cruiseMs * 3.6)} km/h`, `aproximarse y posarse en el helipuerto de ${to}`];
}

/** The trip's challenge: the first leg's steps in order and, for each leg, its time or height worked out. */
export function flightChore(legs: readonly Leg[], crafts: Readonly<Record<Leg["craft"], CraftSpec>>, name: (island: string) => string): Chore {
  const first = legs[0]!;
  const c0 = crafts[first.craft];
  const exercises: Exercise[] = [order("s3-vuelo-pasos", first.craft === "alfombra" ? "La alfombra sube, vuela su tiempo fijo y baja al andén de la otra isla" : "Un helicóptero despega en vertical, sube, pone rumbo, acelera y solo se posa despacio", flightSteps(first, c0, name(first.to)), first.craft === "alfombra" ? "saltar de la alfombra en vuelo" : "acelerar en el suelo antes de despegar")];
  legs.forEach((leg, i) => {
    const c = crafts[leg.craft];
    if (leg.craft === "alfombra") {
      const h = Math.max(leg.a.y, leg.b.y) + c.cruiseAboveM;
      exercises.push(
        choice(
          `s3-vuelo-${i}-altura`,
          { concept: 4, skill: "predecir", idea: "Se vuela por encima del más alto de los dos andenes", question: `¿A qué altura vuela la alfombra a ${name(leg.to)}?`, code: [block("a", `origen = ${num(leg.a.y)} m`, `const origen = ${leg.a.y};`), block("b", `destino = ${num(leg.b.y)} m`, `const destino = ${leg.b.y};`), block("c", `altura = max(origen, destino) + ${c.cruiseAboveM}`, `const altura = Math.max(origen, destino) + ${c.cruiseAboveM};`)] },
          `${num(h)} m`,
          [`${num(c.cruiseAboveM)} m`, `${num(leg.a.y + leg.b.y + c.cruiseAboveM)} m`, `${num(Math.min(leg.a.y, leg.b.y) + c.cruiseAboveM / 2)} m`],
        ),
      );
      return;
    }
    const cruiseS = leg.distanceM / c.cruiseMs;
    const total = 2 * c.climbS + cruiseS;
    const fmt = (s: number) => `${num(s / 60, 1)} min`;
    exercises.push(
      choice(
        `s3-vuelo-${i}-tiempo`,
        { concept: 4, skill: "predecir", idea: "Tiempo = subir + distancia ÷ velocidad + bajar", question: `¿Cuánto dura el vuelo a ${name(leg.to)}?`, code: [block("a", `distancia = ${num(leg.distanceM, 0)} m`, `const distancia = ${Math.round(leg.distanceM)};`), block("b", `velocidad = ${num(c.cruiseMs)} m/s`, `const velocidad = ${num(c.cruiseMs).replace(",", ".")};`), block("c", `tiempo = ${c.climbS} + distancia / velocidad + ${c.climbS}`, `const tiempo = ${c.climbS} + distancia / velocidad + ${c.climbS};`)] },
        fmt(total),
        [fmt(cruiseS), fmt(cruiseS + c.climbS), fmt(leg.distanceM / 280)],
      ),
    );
  });
  return { id: `s3-vuelo:${first.from}:${legs.at(-1)!.to}`, kind: "programar-viaje", title: `Programar el vuelo a ${name(legs.at(-1)!.to)}`, scenario: `${legs.length > 1 ? `Dos tramos, con escala en ${name(first.to)}` : "Un tramo"}: el piloto automático lo vuela cuando el programa está bien`, exercises };
}
