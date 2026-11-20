import type { FloorPlan, Placed } from "./kit";

/**
 * THE MUSIC ROOMS AND THE CLASSROOMS, each its own floor (Berón 2026-11-20: «se crean las salas necesarias a lujo de
 * detalle/realismo y se separan en pisos propios… seguramente variarán mucho de tamaño los pisos resultantes… un aula
 * preparada para cada materia»). Each plan is the room's real size plus a 2 m walkway; being smaller than the tower's
 * square, two of them share a side of the trunk (layout.ts `packFloors`). Frame: metres from the centre, x across,
 * z away from the trunk; the strip by the trunk (the door, 2,5 m) is kept clear. Models: models/musica-aulas.ts.
 */
const P = (model: string, x: number, z: number, rot = 0, name?: string, y?: number): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}), ...(y ? { y } : {}) });
const PI = Math.PI;
/** Turned to face +x (into the room from the −x wall) and −x (from the +x wall). */
const FACE_PX = -PI / 2;
const FACE_NX = PI / 2;
const toilets = (x: number, z: number): Placed => P("aseos-1", x, z, PI);

/** The band's rehearsal room: 8 × 7 m inside, the kit at the back facing the room, amps on the sides, the singers' mics in the middle. */
function rehearsal(): FloorPlan {
  return {
    id: "musica-ensayo",
    size: { x: 10, z: 10 },
    items: [
      P("mus-paneles-acusticos", 0, 4.6),
      P("mus-paneles-acusticos", -4.85, 1.2, FACE_PX),
      P("mus-paneles-acusticos", 4.85, 1.2, FACE_NX),
      P("mus-bateria", 0, 2.6, PI, "Batería"),
      P("mus-ampli-guitarra", -3.2, 1.0, -PI / 2, "Amplificador de guitarra"),
      P("mus-ampli-bajo", 3.2, 1.0, PI / 2, "Amplificador de bajo"),
      P("mus-teclado", 3.0, -1.4, -PI / 2, "Piano de escenario"),
      P("mus-microfonos", -1.9, 0.2, 0, "Micrófonos de voz"),
      P("mus-pa-ensayo", -3.6, -1.6, FACE_NX),
      P("mus-sofa", 4.4, -3.4, FACE_NX),
    ],
    source: "Sala de ensayo de banda de 56 m² (salas de ensayo profesionales: 25–60 m², tratadas; Everest, Master Handbook of Acoustics)",
  };
}

/** The recording studio: the control room by the trunk, the live room behind the double window, the vocal booth on its side. */
function studio(): FloorPlan {
  return {
    id: "musica-estudio",
    size: { x: 16, z: 13 },
    items: [
      P("mus-ventana-control", -3, 0),
      P("mus-paneles-acusticos", 3.5, 0, PI),
      P("mus-consola", -3, -2.4, 0, "Consola de grabación"),
      P("mus-rack-equipos", -7.4, -2.6, FACE_PX),
      P("mus-sofa", -7.3, -0.4, FACE_PX),
      P("mus-piano-cola", -4.6, 3.0, 0, "Piano de cola"),
      P("mus-mamparas", -1.9, 2.6, PI / 2),
      P("mus-bateria-estudio", 0.6, 4.2, PI, "Batería de estudio"),
      P("mus-microfonos", 2.4, 1.8, 0, "Micrófonos de la sala de grabación"),
      P("mus-cabina-voz", 6.2, 4.4, FACE_NX, "Cabina de voz"),
      P("mus-rack-equipos", 6.0, -2.6, FACE_NX),
    ],
    source: "Estudio de grabación de dos salas y cabina (Newell, Recording Studio Design, 4.ª ed.: control de 20–30 m², sala de 40–60 m²)",
  };
}

/** Practice rooms: four sound-isolated cabins with an upright piano each, along a corridor, and the instrument lockers. */
function practice(): FloorPlan {
  return {
    id: "musica-cabinas",
    size: { x: 14, z: 10 },
    items: [
      ...[-4.65, -1.55, 1.55, 4.65].map((x, i) => P("mus-cabina-practica", x, 3.2, 0, `Cabina de estudio ${i + 1}`)),
      P("mus-taquillas", -6.5, -0.4, FACE_PX),
      P("mus-estanteria-partituras", 6.6, -0.6, FACE_NX),
    ],
    source: "Cabinas Wenger SoundLok de 2,4 × 3 m en batería, con pasillo de 2 m (conservatorios: aulas de estudio individual)",
  };
}

/** The orchestra's hall: the podium near the door, three arcs of string desks round it, winds' and percussion's places behind. */
function orchestra(): FloorPlan {
  const podium = { x: 0, z: -1.0 };
  const items: Placed[] = [P("mus-podio", podium.x, podium.z, 0, "Podio del director")];
  // Arcs of desks (two musicians each) facing the podium: 5, 7 and 7 desks at 3, 4,7 and 6,4 m.
  for (const [r, n, span] of [[3, 5, 1.6], [4.7, 7, 1.9], [6.4, 7, 1.7]] as const)
    for (let i = 0; i < n; i++) {
      const a = -span / 2 + (span * i) / (n - 1);
      items.push(P("mus-atriles-cuerda", podium.x + Math.sin(a) * r, podium.z + Math.cos(a) * r, a + PI));
    }
  items.push(
    P("mus-timbales", -1.8, 6.9, PI, "Timbales"),
    P("mus-percusion", 3.4, 6.9, PI, "Percusión"),
    P("mus-arpa", -7.6, 4.6, PI * 0.75, "Arpa"),
    P("mus-contrabajos", 7.6, 4.6, -PI * 0.75, "Contrabajos"),
    P("mus-taquillas", -8.6, -4.2, FACE_PX),
    P("mus-estanteria-partituras", 8.7, -4.2, FACE_NX),
  );
  return { id: "musica-orquesta", size: { x: 19, z: 16 }, items, source: "Sala de ensayo orquestal (disposición alemana de la cuerda en arcos ante el podio; Wenger, Planning Guide for School Music Facilities)" };
}

/** The recital hall: the stage at the far end with its piano and drums, the sound towers, the raked seats and the desk at the back. */
function recital(): FloorPlan {
  return {
    id: "musica-auditorio",
    size: { x: 22, z: 26 },
    items: [
      P("mus-escenario", 0, 9.4, 0, "Escenario"),
      P("mus-piano-cola", -3.2, 9.6, PI, "Piano de cola del escenario", 0.82),
      P("mus-bateria", 2.8, 10.8, PI, "Batería del escenario", 0.82),
      P("mus-microfonos", 0.4, 8.0, PI, "Micrófonos del escenario", 0.82),
      P("mus-line-array", -7.6, 6.0, PI),
      P("mus-line-array", 7.6, 6.0, PI),
      P("mus-graderio", -0.6, 3.6, 0, "Gradas"),
      P("mus-control-sala", 0, -3.8, 0, "Control de sala"),
      toilets(8.2, -11.6),
    ],
    source: "Sala de recitales de 60 plazas (escenario de 12 × 6 m; butacas a 1 m con gradas de 30 cm; control de sala al fondo, como en los auditorios)",
  };
}

/** A classroom: the board wall at the far end, the teacher's desk before it, 24 desks in 4 rows (or the subject's own benches), the subject's furniture on the sides. */
function classroom(id: string, size: { x: number; z: number }, subject: readonly Placed[], desks = true, source = ""): FloorPlan {
  const far = size.z / 2;
  return {
    id,
    size,
    items: [
      P("aula-pared-pizarra", 0, far - 0.2),
      P("aula-mesa-profesor", -2.4, far - 1.7, PI, "Mesa del profesor"),
      ...(desks ? [P("aula-pupitres-24", 0, far - 3.4, 0, "Pupitres")] : []),
      P("aula-armario", size.x / 2 - 0.5, -far + 3.6, FACE_NX),
      ...subject,
    ],
    source: `Aula de ${(size.x * size.z).toFixed(0)} m² para 24 (aulas de secundaria: 50–65 m² más el mobiliario de la materia, guías del Ministerio de Educación y del DfE británico, BB103)${source ? `; ${source}` : ""}`,
  };
}

const CLASSROOMS: readonly FloorPlan[] = [
  classroom("aula-matematicas", { x: 12, z: 11 }, [
    P("mat-material", 5.0, 1.0, FACE_NX, "Material de matemáticas"),
    P("mat-estante-poliedros", -5.6, 1.6, FACE_PX, "Vitrina de poliedros"),
    P("mat-mural", -5.9, -2.2, FACE_PX),
  ]),
  classroom("aula-lengua", { x: 12, z: 11 }, [
    P("len-rincon-lectura", 4.7, 1.4, FACE_NX, "Rincón de lectura"),
    P("len-biblioteca", -5.7, 1.4, FACE_PX, "Biblioteca de aula"),
    P("len-mural", -5.9, -2.6, FACE_PX),
  ]),
  classroom("aula-ciencias", { x: 13, z: 13 }, [
    P("cie-mesa-demostracion", 0, 4.6, PI, "Mesa de demostración"),
    ...[2.0, -0.8].flatMap((z, r) => [-2.1, 2.1].map((x, c) => P("cie-mesa-laboratorio", x, z, 0, `Mesa de laboratorio ${r * 2 + c + 1}`))),
    P("cie-mesa-laboratorio", -2.1, -3.6, 0, "Mesa de laboratorio 5"),
    P("cie-vitrina", -6.0, 2.4, FACE_PX, "Vitrina de ciencias"),
    P("cie-esqueleto", 5.6, 3.0, FACE_NX, "Esqueleto"),
    P("cie-lavaojos", 6.0, -1.4, FACE_NX),
  ], false, "laboratorio escolar de 5 mesas de 4 (ASE/CLEAPSS, Guide L14: laboratorios escolares)"),
  classroom("aula-historia", { x: 12, z: 12 }, [
    P("his-globo", 4.8, 3.0, 0, "Globo terráqueo"),
    P("his-vitrina", 5.3, -0.6, FACE_NX, "Vitrina de objetos del mundo"),
    P("his-mapa-mural", -5.9, 2.2, FACE_PX, "Mapamundi"),
    P("his-linea-tiempo", -5.9, -2.0, FACE_PX, "Línea del tiempo"),
  ]),
  classroom("aula-idiomas", { x: 12, z: 12 }, [
    ...[2.4, -0.8].flatMap((z, r) => [-3.3, 3.3].map((x, c) => P("idi-cabinas", x, z, 0, `Laboratorio de idiomas, puestos ${r * 12 + c * 6 + 1}–${r * 12 + c * 6 + 6}`))),
    P("idi-mural", -5.9, -3.8, FACE_PX),
  ], false, "laboratorio de idiomas de 24 puestos (Sanako)"),
  classroom("aula-arte", { x: 13, z: 12 }, [
    P("art-caballetes", -2.8, 2.6, 0, "Caballetes"),
    P("art-caballetes", -2.8, -0.4, 0, "Caballetes"),
    P("art-mesas-dibujo", 2.6, 2.6, 0, "Mesas de dibujo"),
    P("art-mesas-dibujo", 2.6, -0.4, 0, "Mesas de dibujo"),
    P("art-fregadero", 6.0, 3.2, FACE_NX, "Fregadero del taller"),
    P("art-ceramica", 2.8, -3.2, 0, "Torno y horno de cerámica"),
    P("art-estanteria", -6.1, -1.0, FACE_PX, "Materiales de plástica"),
  ], false, "taller de plástica con caballetes, dibujo técnico y cerámica (DfE BB103: art room 90 m²)"),
];

/** The study room and library (the Aula's sala de estudio of Cold Sanctuary): the stacks, four study tables and the computers. */
function study(): FloorPlan {
  return {
    id: "aula-estudio",
    size: { x: 20, z: 16 },
    items: [
      P("aula-biblioteca", 8.6, 0.6, 0, "Biblioteca"),
      ...[[-4.6, -1.4], [-4.6, 3.6], [3.4, -1.4], [3.4, 3.6]].map(([x, z], i) => P("aula-mesa-estudio", x!, z!, 0, `Mesa de estudio ${i + 1}`)),
      ...[-6, -3, 0, 3].map((x) => P("puesto-ordenador", x, 6.8, PI)),
      P("aseos-1", -8, -6.6, PI),
    ],
    source: "Sala de estudio y biblioteca (Cold Sanctuary, Informatica.cs FurnishAulaFloor: biblioteca, mesas de estudio y ordenadores)",
  };
}

/** Each with its floor finish (models/musica-aulas.ts FLOOR_FINISH_MODELS) under everything. */
export const MUSICA_AULAS_FLOORS: readonly FloorPlan[] = [recital(), rehearsal(), studio(), practice(), orchestra(), ...CLASSROOMS, study()].map((f) => ({ ...f, items: [P(`suelo-${f.id}`, 0, 0), ...f.items] }));
