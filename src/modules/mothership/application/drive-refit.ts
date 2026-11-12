import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { Mothership } from "../domain/mothership";
import { fitProblem, maxPerMount, PROPELLANT_NAME, type ElectricThruster, type MountFit } from "../domain/propulsion";

/**
 * Use case: refitting the mothership's thrusters in the ship bay. Each option fits some units of one
 * type on a mount; the units come from the station's hangar and the ones taken off go back there.
 * Doing it is a chain of code challenges like the probe's part swaps (`swapChore`).
 */

/** Spare parts by id. The station's `Hangar` satisfies it. */
export interface DriveStore {
  count(partId: string): number;
  take(partId: string): void;
  put(partId: string, n?: number): void;
}

/** One thing the bay offers on a mount. `locked` says why it cannot be done yet. */
export interface DriveOption {
  readonly mountId: string;
  readonly thruster: ElectricThruster;
  readonly count: number;
  readonly label: string;
  readonly detail: string;
  readonly locked?: string;
}

const num = (v: number, d = 2) => v.toLocaleString("es-ES", { maximumFractionDigits: d });

/** Units of `t` the change needs from the store (0 if it only takes units off). */
export function unitsNeeded(before: MountFit | undefined, t: ElectricThruster, count: number): number {
  if (before && before.thruster.id === t.id) return Math.max(0, count - before.count);
  return count;
}

/**
 * What can be done on a mount: add or take off one unit of what is there, or change it all for another
 * type (as many as the hangar has and the mount holds). Without a store every part is free.
 */
export function driveOptions(m: Mothership, mountId: string, catalog: readonly ElectricThruster[], store?: Pick<DriveStore, "count">): DriveOption[] {
  const mount = m.mount(mountId);
  if (!mount) return [];
  const f = m.fitOf(mountId);
  const prop = m.spec.propulsion.propellant;
  const have = (t: ElectricThruster) => (store ? store.count(t.id) : Infinity);
  const what = (t: ElectricThruster) => `${num(t.thrustN, 3)} N · ${num(t.powerKw, 1)} kW · Isp ${t.ispS} s`;
  const out: DriveOption[] = [];
  if (f && f.count > 0) {
    const t = f.thruster;
    const max = maxPerMount(mount, t);
    if (f.count < max) {
      const n = have(t);
      out.push({
        mountId,
        thruster: t,
        count: f.count + 1,
        label: `Añadir un ${t.shortName}`,
        detail: `${f.count + 1} de ${max} que caben · ${what(t)}${store && n > 0 ? ` · ${n} en el hangar` : ""}`,
        ...(n > 0 ? {} : { locked: "No hay en el hangar: fabrícalo en la estación (Planos)" }),
      });
    }
    out.push({ mountId, thruster: t, count: f.count - 1, label: `Quitar un ${t.shortName}`, detail: `Quedan ${f.count - 1}${store ? " · el que sale va al hangar" : ""}` });
  }
  for (const t of catalog) {
    if (f && f.count > 0 && f.thruster.id === t.id) continue;
    const max = maxPerMount(mount, t);
    const n = Math.min(max, have(t));
    const exp = t.experimental ? " · experimental" : "";
    const bad = fitProblem(mount, t, 1, prop);
    if (bad?.kind === "propelente") {
      out.push({ mountId, thruster: t, count: 1, label: `Montar ${t.shortName}`, detail: `${what(t)}${exp}`, locked: `Usa ${bad.needs.map((p) => PROPELLANT_NAME[p]).join(" o ")}; la nodriza lleva ${PROPELLANT_NAME[prop]}` });
    } else if (n <= 0) {
      out.push({ mountId, thruster: t, count: 1, label: `Montar ${t.shortName}`, detail: `${what(t)}${exp}`, locked: "No hay en el hangar: fabrícalo en la estación (Planos)" });
    } else {
      out.push({
        mountId,
        thruster: t,
        count: n,
        label: `Montar ${n} ${t.shortName}`,
        detail: `${what(t)}${exp} · caben ${max}${store ? ` · ${store.count(t.id)} en el hangar` : ""}${f && f.count ? ` · salen ${f.count} ${f.thruster.shortName}` : ""}`,
      });
    }
  }
  // What can be done first, the rest after.
  return out.sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
}

/**
 * Make the change on the ship and in the store: the new units leave the hangar, the old ones come in.
 * Throws (and changes nothing) if the store is short or the fit is not possible.
 */
export function applyDriveRefit(m: Mothership, o: Pick<DriveOption, "mountId" | "thruster" | "count">, store?: DriveStore): void {
  const before = m.fitOf(o.mountId);
  const need = unitsNeeded(before, o.thruster, o.count);
  if (store && store.count(o.thruster.id) < need) throw new Error(`Not enough ${o.thruster.id} in the hangar`);
  m.refit(o.mountId, o.thruster, o.count);
  if (!store) return;
  for (let i = 0; i < need; i++) store.take(o.thruster.id);
  if (before && before.count) {
    const back = before.thruster.id === o.thruster.id ? Math.max(0, before.count - o.count) : before.count;
    if (back) store.put(before.thruster.id, back);
  }
}

// --- The chain of challenges ------------------------------------------------------

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
function choice(id: string, skill: ChoiceExercise["skill"], concept: ChoiceExercise["concept"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))].slice(0, 3);
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}
function order(id: string, idea: string, steps: readonly string[]): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept: 1, idea, blocks, solution: blocks.map((b) => b.id) };
}

const line = (mountId: string, f: { thruster: ElectricThruster; count: number } | undefined, gapThrust = false): CodeBlock => {
  if (!f || !f.count) return block("l", `propulsores.${mountId} = []`, `this.propulsores.${mountId} = [];`);
  const t = f.thruster;
  const thrust = gapThrust ? "___" : num(t.thrustN, 3);
  const thrustJs = gapThrust ? "___" : String(t.thrustN);
  return block("l", `propulsores.${mountId} = ${f.count} × ${t.shortName}(${thrust} N, ${num(t.powerKw, 1)} kW, Isp ${t.ispS} s)`, `this.propulsores.${mountId} = repetir(${f.count}, new ${t.shortName.replace(/[^A-Za-z0-9]/g, "")}({ empujeN: ${thrustJs}, potenciaKw: ${t.powerKw}, isp: ${t.ispS} }));`);
};

/**
 * Refitting a mount: complete the new line of the ship's code (the new thruster's real thrust), work out
 * how many units the reactor can feed, predict the new Δv with full xenon (Tsiolkovsky with the mix's
 * Isp), then order the fitting. Generated from the change.
 */
export function driveRefitChore(m: Mothership, o: Pick<DriveOption, "mountId" | "thruster" | "count">): Chore {
  const mount = m.mount(o.mountId)!;
  const before = m.fitOf(o.mountId);
  const next = m.withFit(o.mountId, o.thruster, o.count);
  const t = o.thruster;
  const id = `cambiar-nodriza-${o.mountId}-${t.id}-${o.count}`;
  const old = line(o.mountId, before, o.count === 0);
  const neu = line(o.mountId, o, o.count > 0);
  const valueEx = choice(
    `${id}-valor`,
    "completar",
    2,
    "Una pieza nueva en la nodriza",
    `¿Qué empuje real tiene cada ${t.shortName}?`,
    [block("old", `− ${old.pseudo}`, `// ${old.js}`), block("new", `+ ${neu.pseudo}`, neu.js)],
    `${num(t.thrustN, 3)} N`,
    [`${num(t.thrustN * 10, 3)} N`, `${num(t.thrustN / 10, 4)} N`, `${num(t.powerKw, 1)} N`],
  );

  const d = next.drive;
  const reactor = m.spec.power.electricKw.value;
  const hotel = m.spec.propulsion.hotelLoadKw.value;
  const mounts = next.fitted.filter((f) => f.count);
  const powerEx = choice(
    `${id}-potencia`,
    "predecir",
    4,
    "El reactor no da para todo",
    "¿Cuántos propulsores podrán encenderse a la vez?",
    [
      block("r", `libres = ${num(reactor)} kW del reactor − ${num(hotel)} kW del resto de la nave`, `const libres = ${reactor} - ${hotel};`),
      ...mounts.map((f, i) => block(`m${i}`, `${f.mountId}: ${f.count} × ${f.thruster.shortName} de ${num(f.thruster.powerKw, 1)} kW`, `const ${f.mountId} = { n: ${f.count}, kw: ${f.thruster.powerKw} };`)),
      block("e", "encender de uno en uno, alternando módulos, mientras quepan en libres", "const encendidos = encenderMientrasQuepan(libres);"),
    ],
    String(d.firingUnits),
    [String(d.fittedUnits), String(d.firingUnits + 1), String(Math.max(0, d.firingUnits - 2)), String(d.firingUnits * 2)],
  );

  const isp = Math.round(d.ispS);
  const m0 = Math.round(next.massKg / 1000);
  const mf = Math.round(next.dryMassKg / 1000);
  const dv = Math.round(next.deltaV());
  const dvEx = choice(
    `${id}-dv`,
    "predecir",
    3,
    "¿Hasta dónde llegaremos ahora?",
    "Con el xenón lleno, ¿qué Δv tendrá la nodriza?",
    [
      block("isp", `isp = ${isp} s (la mezcla de los que encienden); g0 = 9,81 m/s²`, `const isp = ${isp}, g0 = 9.80665;`),
      block("m", `m0 = ${num(m0)} t; mf = ${num(mf)} t`, `const m0 = ${m0}, mf = ${mf};`),
      block("dv", "dv = isp · g0 · ln(m0 / mf)", "const dv = isp * g0 * Math.log(m0 / mf);"),
    ],
    `${num(dv, 0)} m/s`,
    d.firingUnits ? [`${num(Math.round(dv / 9.80665), 0)} m/s`, `${num(Math.round(isp * 9.80665 * (m0 / mf - 1)), 0)} m/s`, `${num(Math.round(dv * 1.5), 0)} m/s`] : ["4100 m/s", "1000 m/s"],
  );

  const swapType = !before || !before.count || before.thruster.id !== t.id;
  const fewer = !swapType && o.count < before!.count;
  const steps = [
    `cierra la válvula de ${PROPELLANT_NAME[m.spec.propulsion.propellant]} del módulo ${o.mountId}`,
    "desconecta y bloquea las fuentes de potencia",
    swapType && before?.count ? `desmonta los ${before.count} ${before.thruster.shortName}` : fewer ? `desmonta un ${t.shortName}` : `abre un hueco en la rejilla`,
    fewer ? "tapa el hueco de la rejilla" : `monta ${swapType ? `los ${o.count}` : "el"} ${t.shortName} nuevo${swapType && o.count !== 1 ? "s" : ""}`,
    "conecta el cátodo y la línea de propelente",
    "haz un encendido de prueba",
  ];
  const n0 = before?.count ?? 0;
  return {
    id,
    kind: "cambiar-pieza",
    targetId: `nodriza:${o.mountId}:${t.id}:${o.count}`,
    title: `Propulsores de la nodriza: ${o.count} × ${t.shortName}`,
    scenario: `${mount.name}: ${n0 ? `${n0} × ${before!.thruster.shortName}` : "vacío"} → ${o.count ? `${o.count} × ${t.shortName}` : "vacío"} · ${num(d.thrustN, 1)} N en total`,
    exercises: [valueEx, powerEx, dvEx, order(`${id}-montaje`, "Con cuidado: hay alta tensión y xenón", steps)],
  };
}
