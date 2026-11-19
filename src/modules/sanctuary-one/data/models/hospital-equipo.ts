import { csx } from "../sources";
import { C, COL, pz, rep, type ModelDef, type Part } from "./kit";

/**
 * The hospital's equipment that our plans lacked, from Cold Sanctuary's exported scene (Infirmary_Area: Triaje,
 * Consulta, Mesa del médico, Telemedicina, Carro de parada, Farmacia; Planta 1: Lavado quirúrgico, Autoclave, Planta de
 * oxígeno, Control de UCI), each box at its exported size and place, plus what a real one has that Cold Sanctuary's
 * lacks (Berón 2026-11-19: «sería ideal que nuestro sanctuary1 sea mejor que el de unity»):
 *  - Consulta y triaje: monitor de constantes de pie (tensión, SpO₂, temperatura; tipo Welch Allyn Connex), equipo de
 *    diagnóstico de pared (otoscopio y oftalmoscopio, tipo Welch Allyn GS 777), silla del paciente y papelera de residuos.
 *  - Carro de parada: monitor-desfibrilador, aspirador de secreciones, tabla de RCP y bolsa-mascarilla (ERC 2021: el carro
 *    lleva desfibrilador, vía aérea, aspiración y fármacos por cajones).
 *  - Farmacia: frigorífico de vacunas a 2–8 °C con registro de temperatura y caja fuerte de estupefacientes.
 *  - Autoclave: lavadora ultrasónica y mesa de empaquetado antes de la esterilización (circuito sucio → limpio).
 *  - Planta de oxígeno PSA: compresor, secador, dos tamices de zeolita y depósito (93 ± 3 % de O₂, OMS 2020).
 * Front (where the person stands or sits to work) is −z, as in every model.
 */
const { steel, darkSteel, white, glass, screen } = COL;
const WOOD = 0xb58e6a;
const GREY = 0x5e636b;
const DISPLAY = 0x3c6e8f;
const S = (what: string) => csx(`Torre_Servicios/Infirmary_Area/${what}`);

/** Cold Sanctuary's desk (Tablero 1,4 × 0,7 m, monitor, teclado, historias, silla at −z), as exported. */
const desk: Part[] = [
  C(0, 0.74, 0, 1.4, 0.05, 0.7, WOOD),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => C(sx * 0.65, 0.37, sz * 0.3, 0.05, 0.74, 0.05, GREY))),
  C(0.1, 1.0, 0.15, 0.55, 0.35, 0.04, GREY), C(0.1, 1.0, 0.127, 0.5, 0.3, 0.005, DISPLAY), C(0.1, 0.8, 0.17, 0.05, 0.1, 0.05, GREY),
  C(0.1, 0.775, -0.1, 0.45, 0.02, 0.15, 0x2b2b2e), C(-0.45, 0.78, -0.05, 0.27, 0.03, 0.33, 0xf3f3ef),
  C(0, 0.41, -0.6, 0.45, 0.08, 0.45, 0x2b2b2e), C(0, 0.71, -0.82, 0.45, 0.55, 0.06, 0x2b2b2e), C(0, 0.185, -0.6, 0.05, 0.37, 0.05, 0xb9bec6),
];
/** Ours: the patient's chair across the desk, the vital-signs monitor on its stand, the wall diagnostic set and the bin. */
const clinic: Part[] = [
  C(0.25, 0.23, 0.75, 0.45, 0.06, 0.45, 0x3d6fa8), C(0.25, 0.5, 0.97, 0.45, 0.5, 0.05, 0x3d6fa8), ...[-1, 1].map((s) => C(0.25 + s * 0.2, 0.11, 0.75, 0.04, 0.22, 0.4, steel)),
  C(-0.85, 0.6, 0.55, 0.05, 1.2, 0.05, steel), C(-0.85, 0.05, 0.55, 0.45, 0.05, 0.45, darkSteel), C(-0.85, 1.25, 0.55, 0.28, 0.22, 0.14, white), C(-0.85, 1.27, 0.48, 0.2, 0.12, 0.005, screen),
  C(0.5, 1.45, 0.4, 0.4, 0.22, 0.08, 0xdedede), C(0.42, 1.4, 0.35, 0.05, 0.15, 0.04, 0x2b2b2e), C(0.58, 1.4, 0.35, 0.05, 0.15, 0.04, 0x2b2b2e),
  C(0.75, 0.2, -0.3, 0.3, 0.4, 0.3, 0xd9a420),
];

export const HOSPITAL_EXTRA_MODELS: readonly ModelDef[] = [
  pz("hospital-triaje", "mueble", "hospital", "Puesto de triaje (mesa, monitor de constantes y silla del paciente)", WOOD, [...desk, ...clinic], "real", S("Equipamiento/Triaje")),
  pz("hospital-consulta", "mueble", "hospital", "Consulta (mesa del médico, silla del paciente y equipo de diagnóstico de pared)", WOOD, [...desk, ...clinic], "real", S("Equipamiento/Consulta")),
  pz("hospital-mesa-medico", "mueble", "hospital", "Mesa del médico", WOOD, [...desk, C(-0.75, 0.2, -0.3, 0.3, 0.4, 0.3, 0xd9a420)], "real", S("Equipamiento/Mesa del medico")),
  pz("hospital-telemedicina", "maquina", "hospital", "Telemedicina (pantalla grande con el especialista, cámara y antena)", WOOD, [...desk, C(0, 1.55, 0.3, 1.2, 0.7, 0.05, GREY), C(0, 1.55, 0.27, 1.1, 0.6, 0.005, DISPLAY), C(0, 1.95, 0.28, 0.12, 0.06, 0.06, 0x2b2b2e), C(0.6, 2.2, 0.3, 0.04, 0.9, 0.04, 0xb9bec6)], "real", S("Equipamiento/Telemedicina")),
  pz("hospital-control-uci", "mueble", "hospital", "Control de la UCI (central de monitorización de los seis boxes)", WOOD, [...desk, C(-0.45, 1.05, 0.2, 0.5, 0.32, 0.04, GREY), C(-0.45, 1.05, 0.177, 0.46, 0.28, 0.005, 0x2a5a3a)], "real", csx("Torre_Servicios/Infirmary_Area/Planta_hospitalizacion/Planta1_equipamiento/Control_UCI")),
  pz("hospital-carro-parada", "maquina", "hospital", "Carro de parada (monitor-desfibrilador, oxígeno, aspirador, tabla de RCP y cajones de fármacos)", 0xe07070, [
    C(0, 0.5, 0, 0.7, 0.95, 0.5, 0xe07070), ...rep(4, (i) => [C(0, 0.2 + i * 0.22, -0.255, 0.6, 0.17, 0.01, 0xc85a5a)]),
    C(0, 1.1, 0, 0.4, 0.25, 0.3, 0xf0c330), C(0, 1.12, -0.155, 0.2, 0.12, 0.005, 0x1f3a44), C(0.28, 0.6, 0.15, 0.12, 0.9, 0.12, 0xf2f2f2),
    C(-0.25, 1.02, 0.1, 0.18, 0.1, 0.18, 0x6fa8dc), C(-0.33, 0.6, 0.2, 0.03, 0.9, 0.5, 0xd9a420), C(0.05, 1.02, 0.15, 0.12, 0.08, 0.2, 0x8fc1e3),
  ], "real", S("Equipamiento/Carro_de_parada")),
  pz("hospital-farmacia", "mueble", "hospital", "Farmacia (estantería de medicamentos, mostrador, frigorífico de vacunas y caja fuerte)", 0xf3f3ef, [
    C(0, 1.0, 0.25, 2.4, 2, 0.4, 0xf3f3ef),
    ...rep(4, (lv) => rep(8, (i) => [C(-1.05 + i * 0.3, 0.35 + lv * 0.45, 0.1, 0.22, 0.18, 0.14, [0xf2c46d, 0x8fc1e3, 0xe58e8e, 0xa8d8a0, 0xd6c1e8][(i + lv) % 5])])),
    C(0, 0.5, -0.55, 2.4, 1, 0.5, WOOD),
    C(-0.95, 0.75, -0.55, 0.5, 0.5, 0.45, white), C(-0.95, 0.75, -0.79, 0.4, 0.35, 0.01, glass), C(-0.8, 0.95, -0.79, 0.08, 0.04, 0.005, 0x7cf5b0),
    C(0.95, 0.2, -0.55, 0.4, 0.4, 0.4, darkSteel), C(0.95, 0.25, -0.76, 0.06, 0.06, 0.02, steel),
  ], "real", S("Equipamiento/Farmacia")),
  pz("hospital-lavado-quirurgico", "maquina", "hospital", "Lavado quirúrgico (dos senos con grifo de codo y el protocolo de lavado)", 0xb9bec6, [
    C(0, 0.45, 0, 1.4, 0.9, 0.55, 0xb9bec6), ...[-0.35, 0.35].flatMap((x) => [C(x, 0.86, 0, 0.55, 0.06, 0.4, GREY), C(x, 1.15, 0.22, 0.04, 0.5, 0.04, 0xb9bec6)]), C(0, 1.5, 0.27, 1.4, 0.4, 0.02, 0xcfe3ea),
    ...[-0.6, 0.6].map((x) => C(x, 1.2, 0.25, 0.1, 0.18, 0.06, white)),
  ], "real", csx("Torre_Servicios/Infirmary_Area/Planta_hospitalizacion/Planta1_equipamiento/Lavado_quirurgico")),
  pz("hospital-autoclave", "maquina", "hospital", "Esterilización (lavadora ultrasónica, mesa de empaquetado y autoclave)", 0xd9dee0, [
    C(0, 0.45, 0, 1, 0.9, 0.7, GREY), C(0, 1.3, 0, 1, 0.8, 0.75, 0xd9dee0), C(0, 1.3, -0.38, 0.55, 0.55, 0.03, 0xb9bec6), C(0.38, 1.55, -0.38, 0.15, 0.1, 0.01, 0x7cf5b0),
    C(-1.1, 0.45, 0, 1.0, 0.9, 0.7, 0xb9bec6), C(-1.3, 1.0, 0, 0.4, 0.2, 0.3, 0xdedede), C(-0.9, 0.93, -0.1, 0.4, 0.03, 0.3, 0x6fa8dc), ...rep(3, (i) => [C(-0.95 + i * 0.12, 0.98, 0.15, 0.1, 0.06, 0.2, 0x8fc1e3)]),
  ], "real", csx("Torre_Servicios/Infirmary_Area/Planta_hospitalizacion/Planta1_equipamiento/Autoclave")),
  pz("hospital-planta-oxigeno", "maquina", "hospital", "Planta de oxígeno PSA (compresor, secador, tamices de zeolita y depósito)", 0xdce3e8, [
    C(0, 0.6, 0, 1.2, 1.2, 0.8, 0xdce3e8), C(-0.3, 1.75, 0, 0.3, 1.1, 0.3, 0x6fa8dc), C(0.3, 1.75, 0, 0.3, 1.1, 0.3, 0x6fa8dc), C(0.85, 0.9, 0, 0.4, 1.8, 0.4, 0xf2f2f2),
    C(-0.85, 0.5, 0, 0.4, 1.0, 0.5, 0x9aa6ad), C(0, 2.35, 0, 1.4, 0.06, 0.06, steel), C(0.85, 1.85, -0.2, 0.12, 0.12, 0.02, white),
  ], "real", csx("Torre_Servicios/Infirmary_Area/Planta_hospitalizacion/Planta1_equipamiento/Planta_oxigeno")),
];
