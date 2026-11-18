import type { Task } from "@modules/tasks/application/task-list";
import type { S3Layout } from "../data/layout";

/**
 * Doménica's initiation as tasks (docs/design/santuario3-iniciacion.md §4.1–4.2): the thirteen posts in their order,
 * each at the machine of the island where it is done, with «Ir» to walk there. Posts 1–9, 11 and 12 have their challenges
 * (application/stations.ts, s3-iniciacion-1 and -2); 10 and 13 come with s3-lanzamiento and until then say
 * «En construcción».
 */
export const POSTS: readonly { readonly n: number; readonly title: string; readonly machine: string; readonly copies: string }[] = [
  { n: 1, title: "Llegada y selección", machine: "medico-tribunal", copies: "requisitos y entrevistas de la NASA" },
  { n: 2, title: "Reconocimiento médico", machine: "medico-camilla", copies: "reconocimiento de larga duración" },
  { n: 3, title: "Natación y supervivencia en el agua", machine: "nbl-supervivencia", copies: "prueba de la NASA; Pensacola y Fairchild" },
  { n: 4, title: "Cámara hipobárica", machine: "medico-hipobarica", copies: "cámaras de Sonny Carter" },
  { n: 5, title: "Centrífuga", machine: "centrifuga-gondola", copies: "NASTAR y los perfiles de Dragon" },
  { n: 6, title: "Vuelo parabólico", machine: "glaciar-avion", copies: "A310 Zero-G, desde una pista de hielo azul como la de Union Glacier" },
  { n: 7, title: "Piscina de flotabilidad neutra", machine: "nbl-piscina", copies: "NBL de Houston" },
  { n: 9, title: "Robótica", machine: "control-robotica", copies: "Generic Robotics Trainer y VR Lab" },
  { n: 11, title: "Geología: meteoritos en hielo azul", machine: "glaciar-meteoritos", copies: "ANSMET" },
  { n: 12, title: "Supervivencia en frío", machine: "glaciar-supervivencia", copies: "Happy Camper, la escuela de campo antártica de EE. UU." },
  { n: 8, title: "Simuladores de Dragon y del LM", machine: "svmf-dragon-sim", copies: "simuladores de Hawthorne; LMS y LLTV" },
  { n: 10, title: "Control de misión: lanzamiento de un Electron", machine: "lanzadera-control", copies: "Rocket Lab y Sea Launch" },
  { n: 13, title: "Integración y lanzamiento", machine: "plataforma-acceso", copies: "Crew Dragon: traje, brazo de acceso y cuenta atrás" },
];

/** What every post says until its challenge exists. */
export const IN_CONSTRUCTION = "En construcción: el reto de este puesto llega con las ramas de la iniciación";

/** The posts whose challenge exists (application/stations.ts). */
export const READY_POSTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12];

export function initiationTasks(layout: S3Layout): Task[] {
  return POSTS.map((p, i) => {
    const m = layout.machines.find((q) => q.id === p.machine);
    if (!m) throw new Error(`Falta la máquina ${p.machine} del puesto ${p.n}`);
    return {
      id: `s3-puesto-${p.n}`,
      group: "iniciacion",
      title: `${i + 1}. ${p.title}`,
      detail: `Puesto ${p.n}, ${m.label} (copia: ${p.copies}). ${READY_POSTS.includes(p.n) ? "El reto se empieza en su máquina, con quien esté de turno" : IN_CONSTRUCTION}`,
      place: { vehicle: m.island, spot: "isla", area: m.area, point: m.point },
    };
  });
}
