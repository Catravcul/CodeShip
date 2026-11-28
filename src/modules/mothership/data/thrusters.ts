import type { ElectricThruster } from "../domain/propulsion";

// --- Sources -----------------------------------------------------------------
export const THRUSTER_SRC = {
  x3HighPower: "Hall, S. J. et al. (2019), «High-Power Performance of a 100-kW Class Nested Hall Thruster», IEPC-2017-228: https://ntrs.nasa.gov/citations/20190004993",
  x3Pepl: "Plasmadynamics and Electric Propulsion Laboratory (Univ. de Michigan), X3: Ø80 cm × 20 cm, 230 kg, 2–200 kW, xenón y kriptón: https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster",
  aeps: "Jackson, J. et al. (2018), «Development of High Power Hall Thruster Systems to Enable the NASA Exploration Vision», Space Propulsion 2018 (tabla 1 y §3.1–3.3): https://ntrs.nasa.gov/api/citations/20180003521/downloads/20180003521.pdf",
  aepsPpe: "Cassady, J. et al. (2022), AEPS para el PPE del Gateway, Space Propulsion 2022 (SP2022_438), tabla 1: 608 mN e Isp 2882 s del ETU-1 a 600 V: https://ntrs.nasa.gov/api/citations/20220007037/downloads/SP2022_438_CASSADY.pdf",
  nextC: "L3Harris / Aerojet Rocketdyne, ficha técnica NEXT-C (2022): https://arsuppliernet.l3harris.com/sites/default/files/documents/NEXT-C_Data_sheet_01_2022_FINAL_DIGITAL.pdf",
  nextCNasa: "NASA Glenn, ficha NEXT-C (2021): https://ntrs.nasa.gov/api/citations/20210024276/downloads/NEXT-C_FactSheet_11_1_21_rev4%20(1).pdf",
  vx200: "Longmier, B. W. et al. (2014), «Improved Efficiency and Throttling Range of the VX-200 Magnetoplasma Thruster», Journal of Propulsion and Power 30(1): https://www.adastrarocket.com/technical-papers-archives/Ben-JPP-2014.pdf",
} as const;

/**
 * NASA/Univ. of Michigan X3 nested-channel Hall thruster at its highest-thrust point: 5.4 N at
 * 99 kW and 400 V on xenon (Hall et al. 2019). The paper gives Isp 1800–2650 s over all points;
 * 2250 s is our estimate for this point from P·η = F·g₀·Isp/2 with η ≈ 0.6 (paper: 0.54–0.67).
 */
export const X3: ElectricThruster = {
  id: "hall-x3",
  name: "X3 (propulsor Hall de 3 canales, NASA / Univ. de Michigan)",
  shortName: "X3",
  family: "hall",
  thrustN: 5.4,
  ispS: 2250,
  powerKw: 99,
  thrusterMassKg: 230,
  ppuMassKg: 150,
  diameterM: 0.8,
  propellants: ["xenon", "kripton"],
  sources: [THRUSTER_SRC.x3HighPower, THRUSTER_SRC.x3Pepl],
  note: "Isp estimado para el punto de 5,4 N (el artículo da 1800–2650 s). Fuente de potencia: estimación de ~1,5 kg/kW. Nunca ha volado",
};

/** NASA HERMeS / Aerojet AEPS, the 12.5 kW Hall thruster built for the Gateway's Power and Propulsion Element. */
export const AEPS: ElectricThruster = {
  id: "hall-aeps",
  name: "AEPS / HERMeS (propulsor Hall de 12,5 kW, NASA / Aerojet Rocketdyne)",
  shortName: "AEPS",
  family: "hall",
  thrustN: 0.589,
  ispS: 2800,
  powerKw: 13.3,
  thrusterMassKg: 50,
  ppuMassKg: 50,
  diameterM: 0.516,
  propellants: ["xenon"],
  sources: [THRUSTER_SRC.aeps, THRUSTER_SRC.aepsPpe],
  note: "589 mN e Isp ~2800 s a 600 V con 13,3 kW de entrada (fuente incluida). Masa del propulsor: menos de 50 kg (previsto); fuente de potencia: ~50 kg",
};

/** NASA NEXT-C gridded ion thruster (flew on DART in 2021) at its high-power point. */
export const NEXT_C: ElectricThruster = {
  id: "ionico-next-c",
  name: "NEXT-C (propulsor iónico de rejillas, NASA / Aerojet Rocketdyne)",
  shortName: "NEXT-C",
  family: "ionico",
  thrustN: 0.235,
  ispS: 4155,
  powerKw: 7.33,
  thrusterMassKg: 14,
  ppuMassKg: 36,
  diameterM: 0.7,
  propellants: ["xenon"],
  sources: [THRUSTER_SRC.nextC, THRUSTER_SRC.nextCNasa],
  note: "Punto de alta potencia de la ficha: 235 mN e Isp 4155 s con 7,33 kW de entrada a la fuente. Masas: menos de 14 kg y 36 kg",
};

/**
 * Ad Astra VASIMR VX-200, a lab prototype on argon: 5.8 N and Isp 4900 s at 200 kW of coupled RF power
 * (212 kW of DC input). No flight unit and no published thruster mass.
 */
export const VX200: ElectricThruster = {
  id: "vasimr-vx-200",
  name: "VASIMR VX-200 (motor de magnetoplasma, Ad Astra) · experimental",
  shortName: "VX-200",
  family: "vasimr",
  thrustN: 5.8,
  ispS: 4900,
  powerKw: 212,
  thrusterMassKg: 500,
  ppuMassKg: 128,
  diameterM: 1.2,
  propellants: ["argon"],
  experimental: true,
  sources: [THRUSTER_SRC.vx200],
  note:
    "Prototipo de laboratorio, solo con argón (el kriptón se probó en la etapa helicón, no a plena potencia). Generadores de RF: 128 kg con las masas específicas del artículo (0,85 kg/kW × 48 kW + 0,506 kg/kW × 172 kW). Imán superconductor y cabeza: 500 kg, estimación nuestra. Diámetro: valor de juego",
};

/** Every electric thruster the mothership can carry. */
export const ELECTRIC_THRUSTERS: readonly ElectricThruster[] = [X3, AEPS, NEXT_C, VX200];

export const electricThrusterById = (id: string): ElectricThruster | undefined => ELECTRIC_THRUSTERS.find((t) => t.id === id);
