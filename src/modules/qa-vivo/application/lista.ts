import { MOTIONS } from "@modules/sanctuary-one/data/animaciones";
import { FLOOR_PLANS } from "@modules/sanctuary-one/data/floors";
import { EDIFICIOS, PERSONAS } from "@modules/microcosmos/data/academia";
import { REVISADO } from "../data/revisado";

/** Something created that should be seen live: its id, kind and name, and its review if any. */
export interface Fila {
  readonly id: string;
  readonly tipo: string;
  readonly nombre: string;
  readonly fecha?: string;
  readonly visto?: string;
}

/** The systems reviewed as wholes (each added here when it is built). */
const SISTEMAS: Readonly<Record<string, string>> = {
  pulpo: "Huevo de pulpo del globo (fases hasta nacer)",
  pecera: "Gran pecera de simulación de la plaza",
  "retos-equipo": "Retos de equipo desde la estación de alfombras",
  carga: "Pantalla de carga del santuario 1",
  caidas: "Caer desde los pisos",
  literas: "Literas de las habitaciones",
  ropa: "Ropa de trabajo según el horario (santuario 1) y de época (microcosmos)",
  "portal-microcosmos": "Portal de vuelta del microcosmos",
  "misiones-microcosmos": "Ventana de misiones del microcosmos",
  "camara-retos-microcosmos": "Cámara de los retos del microcosmos",
  "dialogos-microcosmos": "Diálogos con los personajes de la Academia",
};

/** Everything created that should be reviewed live, from the catalogues, with its review. */
export function lista(): Fila[] {
  const rows: Omit<Fila, "fecha" | "visto">[] = [
    ...Object.entries(SISTEMAS).map(([id, nombre]) => ({ id: `sistema:${id}`, tipo: "Sistema", nombre })),
    ...Object.entries(MOTIONS).map(([id, m]) => ({ id: `movimiento:${id}`, tipo: "Animación", nombre: m.label })),
    ...[...FLOOR_PLANS.keys()].map((id) => ({ id: `piso:${id}`, tipo: "Piso del santuario 1", nombre: id })),
    ...EDIFICIOS.filter((e) => !e.id.startsWith("choza-") || e.id === "choza-0").map((e) => ({ id: `microcosmos:${e.id.startsWith("choza") ? "chozas" : e.id}`, tipo: "Microcosmos: edificio", nombre: e.id.startsWith("choza") ? "Chozas de los discípulos" : e.label })),
    { id: "microcosmos:carro", tipo: "Microcosmos: transporte", nombre: "Carro del Dromos" },
    ...PERSONAS.map((p) => ({ id: `persona:${p.id}`, tipo: "Microcosmos: persona", nombre: p.name })),
  ];
  return rows.map((r) => ({ ...r, ...REVISADO[r.id] }));
}

/** The document (docs/qa/revision-en-vivo.md). */
export function documento(): string {
  const rows = lista();
  const done = rows.filter((r) => r.fecha).length;
  const by = new Map<string, Fila[]>();
  for (const r of rows) by.set(r.tipo, [...(by.get(r.tipo) ?? []), r]);
  const out = [
    "# Revisión en vivo",
    "",
    "Todo lo creado que hay que ver funcionando en el juego, y si se ha revisado en vivo (Playwright en un iPhone 13 o",
    "Berón) y cuándo. Generado de los catálogos y de `src/modules/qa-vivo/data/revisado.ts`: al añadir algo aparece aquí",
    "como pendiente; al revisarlo se anota allí con su fecha y lo visto, y se regenera con",
    "`REVISION_ESCRIBIR=1 npx vitest run src/modules/qa-vivo`. Una prueba falla si este archivo no está al día.",
    "",
    `**Revisado: ${done} de ${rows.length}.**`,
  ];
  for (const [tipo, list] of by) {
    out.push("", `## ${tipo} (${list.filter((r) => r.fecha).length}/${list.length})`, "", "| Qué | Revisado | Lo visto |", "| --- | --- | --- |");
    for (const r of list) out.push(`| ${r.nombre} | ${r.fecha ?? "pendiente"} | ${r.visto ?? ""} |`);
  }
  return out.join("\n") + "\n";
}
