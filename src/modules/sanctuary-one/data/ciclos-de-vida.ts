import type { LifeCycle } from "../domain/life-cycle";

/**
 * Each sanctuary-1 species' life cycle (domain/life-cycle.ts). Cold Sanctuary's own numbers where it has the species
 * (StageProfile days and Reproduction.Calendar months, ported as they are); the rest, and every size at birth and
 * birth month, from the literature. All real.
 */
export interface SpeciesCycle extends LifeCycle {
  readonly label: string;
  readonly source: string;
}

const CS = "Cold Sanctuary, Assets/Animals/StageProfile.cs (días de cría, juvenil y adulto) y Reproduction.cs Calendar (gestación e intervalo entre partos)";
const ANAGE = "AnAge, Human Ageing Genomic Resources (genomics.senescence.info: madurez, gestación, longevidad)";
const ADW = "Animal Diversity Web, Universidad de Michigan (animaldiversity.org: tamaño al nacer, época de cría)";

export const LIFE_CYCLES: Readonly<Record<string, SpeciesCycle>> = {
  Bear: { label: "Oso polar", childDays: 180, teenDays: 900, adultDays: 7300, gestationMonths: 8, intervalMonths: 36, birthSize: 0.13, birthMonth: 12, source: `${CS}; ${ADW} (osezno de 0,6 kg y 30 cm, nace en la madriguera en diciembre-enero)` },
  Seal: { label: "Foca", childDays: 45, teenDays: 365, adultDays: 6000, gestationMonths: 10.5, intervalMonths: 12, birthSize: 0.5, birthMonth: 10, source: `${CS}; ${ADW} (foca de Weddell: cría de 1,5 m en septiembre-octubre)` },
  Penguin: { label: "Pingüino", childDays: 60, teenDays: 365, adultDays: 5000, gestationMonths: 2, intervalMonths: 12, birthSize: 0.2, birthMonth: 12, source: `${CS}; ${ADW} (pingüino de Adelia: eclosión en diciembre)` },
  Whale: { label: "Ballena", childDays: 730, teenDays: 2555, adultDays: 14600, gestationMonths: 11.5, intervalMonths: 30, birthSize: 0.3, birthMonth: 2, source: `${CS}; ${ADW} (ballena jorobada: ballenato de 4,5 m, nace en invierno)` },
  Orca: { label: "Orca", childDays: 730, teenDays: 3650, adultDays: 18000, gestationMonths: 17, intervalMonths: 60, birthSize: 0.3, birthMonth: 11, source: `${CS}; ${ADW} (cría de 2,4 m; partos sobre todo de otoño a primavera)` },
  ArcticFox: { label: "Zorro ártico", childDays: 80, teenDays: 270, adultDays: 1095, gestationMonths: 1.7, intervalMonths: 12, birthSize: 0.15, birthMonth: 6, source: `${CS} (Fox); ${ADW} (camada en mayo-junio, crías de 60 g)` },
  Wolf: { label: "Lobo ártico", childDays: 77, teenDays: 730, adultDays: 3285, gestationMonths: 2.1, intervalMonths: 12, birthSize: 0.15, birthMonth: 6, source: `${CS}; ${ADW} (lobeznos de 0,5 kg a finales de mayo-junio)` },
  Walrus: { label: "Morsa", childDays: 730, teenDays: 1825, adultDays: 10950, gestationMonths: 15, intervalMonths: 36, birthSize: 0.4, birthMonth: 5, source: `${ANAGE}; ${ADW} (gestación de 15 meses con implantación diferida, cría de 1,2 m que mama 2 años, un parto cada 3 años)` },
  EmperorPenguin: { label: "Pingüino emperador", childDays: 150, teenDays: 1700, adultDays: 5500, gestationMonths: 2.2, intervalMonths: 12, birthSize: 0.15, birthMonth: 7, source: `${ANAGE}; ${ADW} (incubación de 64-67 días en el invierno austral, el pollo se independiza a los 5 meses, cría a los 5 años)` },
  Reindeer: { label: "Reno", childDays: 150, teenDays: 550, adultDays: 4400, gestationMonths: 7.4, intervalMonths: 12, birthSize: 0.4, birthMonth: 5, source: `${ANAGE}; ${ADW} (gestación de 7,4 meses, partos en mayo-junio, destete a los 5 meses)` },
  MuskOx: { label: "Buey almizclero", childDays: 365, teenDays: 730, adultDays: 6000, gestationMonths: 8.3, intervalMonths: 18, birthSize: 0.35, birthMonth: 5, source: `${ANAGE}; ${ADW} (gestación de 8-8,5 meses, un ternero cada uno o dos años en abril-junio)` },
  ArcticHare: { label: "Liebre ártica", childDays: 60, teenDays: 300, adultDays: 1500, gestationMonths: 1.75, intervalMonths: 12, birthSize: 0.2, birthMonth: 6, source: `${ANAGE}; ${ADW} (gestación de 53 días, una camada al año en el Alto Ártico)` },
  SnowPetrel: { label: "Petrel níveo", childDays: 50, teenDays: 3300, adultDays: 7000, gestationMonths: 1.5, intervalMonths: 12, birthSize: 0.3, birthMonth: 1, source: `${ANAGE}; ${ADW} (incubación de 45 días, el pollo vuela a los 7 semanas, cría hacia los 10 años y vive más de 30)` },
};
