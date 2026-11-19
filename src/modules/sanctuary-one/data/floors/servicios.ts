import { cs } from "../sources";
import { KITCHEN_BLOCKS } from "../models/servicios";
import { ringLength, ringPoint, type FloorPlan, type Placed } from "./kit";

/** The Servicios floors (40 × 38 m plan on a 40 m floor): restaurant, hospital ×3, cría, carne cultivada, asambleas, guardia. */
const SIZE = { x: 40, z: 38 } as const;
const FS = 40;
const PI = Math.PI;
const D = (deg: number) => (deg * PI) / 180;
const P = (model: string, x: number, z: number, rot?: number, name?: string): Placed => ({ model, x, z, ...(rot ? { rot } : {}), ...(name ? { name } : {}) });
const toilets1 = P("aseos-1", -20 + 2.1, 19 - 0.9, PI);

/** Cold Sanctuary's kitchen strips (KitchenPlan.cs Strip): blocks against each wall, 2,4 m apart, a second row on the ±z sides. */
function strips(): Placed[] {
  const half = { x: 20, z: 19 };
  const byId = new Map(KITCHEN_BLOCKS.map((b) => [b[0], b]));
  const lists: Record<number, string[]> = {
    3: ["recepcion", "almacen-seco", "camaras-frias"],
    2: ["prep-verdura", "prep-carne", "lavado", "molienda", "aceite-panela"],
    0: ["panaderia", "panaderia", "horno-pisos", "pasta", "pasta", "extrusora"],
    1: ["queseria", "queseria", "cava", "fermentos", "fermentos"],
  };
  const out: Placed[] = [];
  for (const side of [0, 1, 2, 3]) {
    const zSide = side >= 2;
    const depth = zSide ? 6 : 5;
    const edge = zSide ? half.z : half.x;
    const L = zSide ? 2 * (half.x - 6) : 2 * (half.z - 2.5);
    const o = side === 0 ? [1, 0] : side === 1 ? [-1, 0] : side === 2 ? [0, 1] : [0, -1];
    const c = { x: o[0]! * (edge - depth / 2), z: o[1]! * (edge - depth / 2) };
    const yaw = Math.atan2(o[0]!, o[1]!);
    const skip = side === 3 ? [[-5, 5]] : [];
    const back = depth / 2 - 0.35;
    let rowZ = back;
    let x = -L / 2;
    let row = 0;
    for (const id of lists[side]!) {
      const [, , w, d] = byId.get(id)!;
      let fits = true;
      for (let guard = 0; guard < 4; guard++) {
        for (const [a, b] of skip) if (x < b! && x + w > a!) x = b!;
        if (x + w <= L / 2) break;
        if (!zSide || row > 0) { fits = false; break; }
        row++;
        rowZ = back - 2.9;
        x = -L / 2;
      }
      if (!fits) continue;
      const lx = x + w / 2;
      const lz = rowZ - d / 2;
      out.push(P(`cocina-${id}`, c.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), c.z - lx * Math.sin(yaw) + lz * Math.cos(yaw), yaw));
      x += w + 2.4;
    }
  }
  return out;
}

function restaurant(): FloorPlan {
  const items: Placed[] = [P("cocina-suelo", 0, 0), P("cocina-barra-servicio", 0, 0, PI), P("cocina-mesa-emplatado", 0, 3.1), P("cocina-encimera-ingredientes", 0, -3, PI)];
  items.push(P("cocina-estanteria", -5.6, 0, D(90), "Despensa"), P("cocina-estanteria", 5.6, 0, D(-90), "Estantería"));
  const st: [number, number, number][] = [[-9.4, 10, 0], [0, 10, 0], [9.4, 10, 0], [12, 0, 90], [9.4, -10, 180], [0, -10, 180], [-9.4, -10, 180], [-12, 0, -90]];
  st.forEach(([x, z, y], i) => items.push(P("cocina-puesto", x, z, D(y), `Puesto ${i + 1}`)));
  items.push(...strips());
  // The gourmet dining on the ring (BuildGourmetDining): tables every 6,2 m, the cash desk, sushi bar, toilets and wine.
  const c = FS / 2 - 2 + 5;
  const arrive = { x: 0, z: c };
  const caja = { x: 4, z: c };
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
  const slots: { x: number; z: number; yaw: number }[] = [];
  for (let s = 3.75; s < ringLength(FS); s += 6.2) {
    const p = ringPoint(FS, s);
    if (p.corner || dist(p, arrive) < 6.5 || dist(p, caja) < 3.5) continue;
    slots.push(p);
  }
  slots.sort((a, b) => dist(b, arrive) - dist(a, arrive));
  const ring: Placed[] = [P("comedor-caja", caja.x, caja.z)];
  const [far] = slots.splice(0, 1);
  ring.push(P("comedor-sushi-cafe", far!.x, far!.z, far!.yaw));
  const [mid] = slots.splice(Math.floor(slots.length / 2), 1);
  ring.push(P("aseos-3", mid!.x, mid!.z, mid!.yaw));
  slots.forEach((p, i) => ring.push(P("comedor-mesa", p.x, p.z, 0, `Mesa ${i + 1}`)));
  ring.push(P("comedor-vinos", c, c, D(45)), P("planta-maceta", -c, c));
  return { id: "restaurante", size: SIZE, items, ring, source: `${cs("KitchenPlan", "KitchenFloorPlan")}; ${cs("Restaurant", "BuildGourmetDining")}` };
}

/** Beds round a ring (Hospital.cs RingBeds): every 3,2 m from 1,55 m, 2,6 m clear of the corners, the +z middle left free. */
function ringBeds(counts: readonly [string, number][]): Placed[] {
  const out: Placed[] = [];
  let s = 1.55;
  let n = 1;
  for (const [label, count] of counts) {
    let placed = 0;
    for (; s < ringLength(FS) && placed < count; s += 3.2) {
      const p = ringPoint(FS, s, 2.6);
      if (p.corner || (Math.abs(p.x) < 4.6 && Math.abs(p.z) > FS / 2 - 2)) continue;
      out.push(P("hospital-cama", p.x, p.z, p.yaw, `Cama ${n++} (${label})`));
      placed++;
    }
  }
  return out;
}

function hospitalUrgencias(): FloorPlan {
  const items: Placed[] = [P("hospital-suelo", 0, 0), P("aseos-3", -14, 12.3, PI), P("hospital-silla-examen", -13.6, 5.6, D(90))];
  items.push(P("hospital-camilla", -6.3, 5.6, D(90)), P("hospital-camilla", -9.8, 1.4, D(90)), P("hospital-camilla", -9.8, -2.6, D(90)));
  items.push(P("hospital-botiquin", -15.4, -6.4, D(-90)), P("hospital-lavamanos", -6.4, 12.3, PI), P("hospital-lavabotas", -10.2, 9, PI));
  items.push(P("hospital-laboratorio", -13.4, -10.6, PI), P("hospital-analizador", -9.25, -10.6, PI), P("hospital-banco-sangre", -3.4, -10.6), P("hospital-espera", 5.6, 11.2));
  for (let i = 0; i < 2; i++) items.push(P("zona-rayos-x", 4.8 + i * 6, 4.6), P("zona-ecografia", 4.8 + i * 6, 0.2), P("hospital-camilla", 5.4 + i * 6, 0.4));
  for (let i = 0; i < 4; i++) items.push(P("hospital-paritorio", 5.8 + (i % 2) * 6.1, -5.3 - Math.floor(i / 2) * 6.1, 0, `Paritorio ${i + 1}`));
  // From the exported scene (Equipamiento): triage, consulting rooms, telemedicine, crash carts and the pharmacy.
  items.push(P("hospital-triaje", -14, 8.6, PI, "Triaje 1"), P("hospital-triaje", -6.4, 9, PI, "Triaje 2"), P("hospital-triaje", -2.3, 5.6, D(90), "Triaje 3"), P("hospital-triaje", 14.6, 8.4, PI, "Triaje 4"));
  items.push(P("hospital-mesa-medico", -10.1, 5.6, PI), P("hospital-consulta", -13.6, 1.4, PI, "Consulta 2"), P("hospital-consulta", -5.6, 1.4, PI, "Consulta 3"), P("hospital-consulta", -13.6, -2.6, PI, "Consulta 4"), P("hospital-telemedicina", -5.6, -2.6, PI));
  items.push(P("hospital-carro-parada", -12, -6.6, D(-90)), P("hospital-carro-parada", -6.4, -6.6, D(-90)), P("hospital-farmacia", 10, 12.2));
  return { id: "hospital-urgencias", size: SIZE, items, ring: ringBeds([["observación de urgencias", 6], ["maternidad", 12]]), source: cs("Hospital", "BuildHospital (planta baja: urgencias y maternidad)") };
}

function hospitalQuirofanos(): FloorPlan {
  const items: Placed[] = [P("hospital-suelo", 0, 0)];
  for (let i = 0; i < 4; i++) items.push(P("hospital-quirofano", -15.3 + i * 8.4, -8.8, 0, `Quirófano ${i + 1}`));
  for (let i = 0; i < 6; i++) items.push(P("hospital-uci", 9.2 + (i % 3) * 3.8, 11.55 + Math.floor(i / 3) * 4.7, 0, `UCI ${i + 1}`));
  items.push(P("hospital-sala-uci", 13, 13.9));
  for (let i = 0; i < 4; i++) items.push(P("hospital-aislamiento", -16.8 + i * 5.35, 16.15, 0, `Aislamiento ${i + 1}`));
  items.push(P("hospital-esclusa", -8.8, 16.15 - 4.91), P("hospital-epi", 3, 16.15 - 11.15, D(-90)), toilets1);
  // From the exported scene (Planta1_equipamiento): surgical scrub sinks, sterilisation, the oxygen plant and the ICU desk.
  items.push(P("hospital-lavado-quirurgico", -11.1, -2.2), P("hospital-lavado-quirurgico", 5.7, -2.2), P("hospital-autoclave", -18.3, -1.9, D(90)), P("hospital-planta-oxigeno", 16.8, -1.6, PI), P("hospital-control-uci", 12.9, 5.2));
  return { id: "hospital-quirofanos", size: SIZE, items, ring: ringBeds([["recuperación postquirúrgica", 10], ["hospitalización", 20]]), source: cs("Hospital", "BuildHospital (planta 1: quirófanos, UCI y aislamiento)") };
}

function hospitalVet(): FloorPlan {
  const layZ = 13;
  const items: Placed[] = [P("hospital-suelo", 0, 0)];
  for (let i = 0; i < 8; i++) items.push(P("vet-perrera", -14.6 + i * 1.45, -layZ + 2.4, 0, `Box ${i + 1}`), P("vet-perrera", -14.6 + i * 1.45, -layZ + 6.2, PI, `Box ${i + 9}`));
  items.push(P("vet-jaulas", -13.6, 1.8), P("vet-jaulas", -10.2, 1.8), P("vet-pediluvio", -4.2, -layZ + 4.3), P("vet-bascula", -13.4, 9.6));
  for (let i = 0; i < 4; i++) items.push(P("vet-quirofano", 6.2 + (i % 2) * 8, -10.1 + Math.floor(i / 2) * 6.05, 0, `Quirófano veterinario ${i + 1}`));
  // The bird refuge: 6 recovery boxes in a row (Refugio_aves).
  for (let i = 0; i < 6; i++) items.push(P("vet-caja-aves", -14.6 + i * 1.4, 5.6, 0, `Caja de aves ${i + 1}`));
  items.push(P("vet-sala-fria", 7.1, 4.15));
  for (let i = 0; i < 3; i++) items.push(P("vet-jaulas", 4.9 + i * 2.2, 4.15));
  items.push(P("vet-aislamiento", 15.9, 4.15), P("vet-perrera", 15.2, 4.15), P("vet-perrera", 16.65, 4.15), P("zona-rayos-x", 12.6, 10.5));
  items.push(P("hospital-laboratorio", 17.6, 12, D(-90)), P("hospital-botiquin", 18.6, 17, D(-90)), P("vet-dietas", 11, 16.8), toilets1);
  // The large-animal ring: 6 bear boxes and 4 for reindeer or wolves, the squeeze cage and 2 seal pens.
  const ring: Placed[] = [];
  let stall = 0;
  let last = 0;
  for (let s = 2; stall < 10; s += 4) {
    const p = ringPoint(FS, s);
    if (p.corner || (Math.abs(p.x) < 4.6 && Math.abs(p.z) > FS / 2 - 2)) continue;
    ring.push(P("vet-cuadra", p.x, p.z, p.yaw, stall < 6 ? `Box de oso ${stall + 1}` : `Box de reno ${stall - 5}`));
    last = s;
    stall++;
  }
  let js = last + 6;
  for (let g = 0; g < 40 && ringPoint(FS, js).corner; g++) js += 1;
  const jp = ringPoint(FS, js);
  ring.push(P("vet-contencion", jp.x, jp.z, jp.yaw));
  let pen = ringLength(FS) / 2 + 4;
  for (let i = 0; i < 2; i++, pen += 7) {
    for (let g = 0; g < 80 && ringPoint(FS, pen).corner; g++) pen += 1;
    const p = ringPoint(FS, pen);
    ring.push(P("vet-corral-foca", p.x, p.z, p.yaw, `Corral de foca ${i + 1}`));
  }
  return { id: "hospital-veterinario", size: SIZE, items, ring, source: cs("Hospital", "BuildHospital (planta 2: veterinario y anillo de grandes animales)") };
}

/** Cría (Cria.cs FurnishCria), its 26 × 20 m layout in the middle of the floor. */
function cria(): FloorPlan {
  const hx = 13;
  const hz = 10;
  const items: Placed[] = [P("cria-recinto-oseznos", -8.5, -6.5), P("cria-recinto-focas", 0, -6.5), P("cria-recinto-pinguinos", 8.5, -6.5), P("cria-recinto-cachorros", -9.5, 4.5)];
  for (let i = 0; i < 2; i++) items.push(P("osezno", -9.5 + i, -6.1, i), P("cria-foca", -1 + i, -6.1, i));
  for (let i = 0; i < 3; i++) items.push(P("polluelo-pinguino", 7.5 + i, -6.1, i), P("cachorro-malamute", -9.1, 3.5 + i, i));
  items.push(P("cria-cocina-leche", hx - 3.2, 3.5, D(-90)), P("cocina-estanteria", hx - 0.6, -1.4, D(-90), "Almacén de cría"), P("cria-pizarra", 3.5, -2.9), P("aseos-1", -4.2, hz - 0.9, PI));
  return { id: "cria", size: SIZE, items, source: cs("Cria", "FurnishCria (distribución de 26 × 20 m)") };
}

function culturedMeat(): FloorPlan {
  const hx = 13;
  const hz = 10;
  const items: Placed[] = [P("lab-campana", -hx + 1.2, -hz + 1), P("lab-microscopio", -hx + 2.4, -hz + 0.9), P("lab-criogenico", -hx + 0.8, 0.2), P("lab-incubadora", -hx + 0.8, 3.2, D(90))];
  items.push(P("lab-medio", -hx + 1.2, hz - 1.3), P("lab-autoclave", -hx + 5.2, hz - 1), P("lab-biorreactor-semilla", -3.2, -hz + 1.4));
  items.push(P("lab-biorreactor", 1.4, -hz + 1.6, 0, "Producción 1"), P("lab-biorreactor", 5.75, -hz + 1.6, 0, "Producción 2"), P("lab-biorreactor", -1, -4, 0, "Producción 3"));
  for (let u = 0; u < 6; u++) items.push(P("lab-perfusion", hx - 1.5 - (u % 3) * 3.9, u < 3 ? -0.4 : -3.6));
  items.push(P("lab-centrifuga", hx - 1, hz - 1.4), P("lab-centrifuga", hx - 7, hz - 1.4), P("lab-formadora", hx - 4, hz - 1.3), P("lab-formadora", hx - 10, hz - 1.3, 0, "Formadora 2"), P("lab-raciones", 7.5, 4.5));
  items.push(P("lab-camara-fria", hx - 0.6, 3.5), P("lab-consola-lote", 0, 0.8));
  items.push(P("aseos-1", hx - 0.2 - 1.9, -hz + 0.9));
  return { id: "carne-cultivada", size: SIZE, items, source: "Cold Sanctuary, Assets/Scripts/World/CulturedMeatLab.cs Build (distribución de 26 × 20 m)" };
}

function assembly(): FloorPlan {
  const c = { x: 0, z: 2 };
  const items: Placed[] = [P("asamblea-suelo", 0, 0), P("asamblea-centro", c.x, c.z)];
  const sides: [number, number, number][] = [[0, 1, 0], [1, 0, 90], [0, -1, 180], [-1, 0, 270]];
  sides.forEach(([dx, dz, y], k) => items.push(P("asamblea-fila-8", c.x + dx * 6, c.z + dz * 6, D(y), `Fila interior ${k + 1}`), P("asamblea-fila-10", c.x + dx * 9.75, c.z + dz * 9.75, D(y), `Fila exterior ${k + 1}`)));
  items.push(P("asamblea-toguna", -15.8, 10), P("asamblea-mesa-comision", -15.8, 0), P("asamblea-archivo", -15.8, -8.5));
  items.push(P("asamblea-marcador", 16, 10), P("asamblea-interpretes", 16, 0), P("asamblea-kleroterion", 16, -8.5));
  for (const x of [-5, 0, 5]) items.push(P("asamblea-arbol", x, 16.2));
  items.push(toilets1);
  return { id: "asambleas", size: SIZE, items, source: cs("Asamblea", "FurnishAssembly") };
}

function guard(): FloorPlan {
  const items: Placed[] = [P("guardia-suelo", 0, 0)];
  for (let i = 0; i < 6; i++) items.push(P("guardia-pantalla", (i - 2.5) * 4.4, 14.5));
  for (const z of [9.5, 5.5]) for (let i = 0; i < 6; i++) items.push(P("guardia-consola", (i - 2.5) * 2.6, z));
  items.push(P("guardia-radar", -14, -3), P("guardia-carta-hielo", -7, -3), P("guardia-sismografo", 7, -3), P("guardia-mareografo", 14, -3));
  items.push(P("guardia-radio", -14, -10), P("guardia-tablero", -6, -10), P("guardia-respaldo", 14, -10), toilets1);
  return { id: "guardia", size: SIZE, items, source: cs("GuardRoom", "FurnishGuardRoom") };
}

export const SERVICIOS_FLOORS: readonly FloorPlan[] = [restaurant(), hospitalUrgencias(), hospitalQuirofanos(), hospitalVet(), cria(), culturedMeat(), assembly(), guard()];
