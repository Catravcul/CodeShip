import type { Species } from "@modules/sanctuary/domain/fauna";
import { SANCTUARY_SPECIES } from "@modules/sanctuary/data/fauna";
import { SANCTUARY_SRC as S } from "@modules/sanctuary/data/sources";
import { ADOPTION_SRC as A } from "./sources";

/**
 * Species of the catalogue that the sanctuary's first list (SANCTUARY_SPECIES) does not have: the domestic
 * animals of the ring and more fish, crustaceans and soil fauna. Same record, so `fit()` and `loopStatus()`
 * judge them by the same rules. Temperatures are husbandry ranges rounded for the game.
 *
 * Mammals and birds: a short flight (Félicette's 5 minutes, Belka and Strelka's day in a capsule) says nothing
 * of weeks floating free, so they count as `sin-datos` and live on the ring.
 */
export const EXTRA_SPECIES: readonly Species[] = [
  { id: "gato", name: "Gato", scientific: "Felis catus", habitat: "tierra", role: "consumidor", zeroG: "sin-datos", tempC: [10, 30], source: A.cat, help: "Caza lo que se cuela en la despensa y acompaña: su ronroneo calma.", note: "Félicette voló 15 min en un cohete sonda (1963), con unos 5 min en ingravidez." },
  { id: "perro", name: "Perro", scientific: "Canis familiaris", habitat: "tierra", role: "consumidor", zeroG: "sin-datos", tempC: [10, 30], source: A.sovietDogs, help: "Avisa con un ladrido cuando algo va mal y saca a pasear a Doménica.", note: "Belka y Strelka pasaron un día en órbita (1960) y volvieron." },
  { id: "gallina", name: "Gallina", scientific: "Gallus gallus domesticus", habitat: "tierra", role: "consumidor", zeroG: "sin-datos", needsLight: true, tempC: [5, 28], source: A.chicken, help: "Pone huevos con luz de día y escarba el compost.", note: "En STS-29 (1989) volaron huevos fecundados." },
  { id: "codorniz", name: "Codorniz japonesa", scientific: "Coturnix japonica", habitat: "tierra", role: "consumidor", zeroG: "no", needsLight: true, tempC: [18, 30], source: A.quail, help: "Pone huevos pequeños desde las seis semanas y come semillas caídas.", note: "En la Mir (1990) eclosionaron codornices, pero los pollos no se sujetaban ni comían en ingravidez." },
  { id: "raton", name: "Ratón doméstico", scientific: "Mus musculus", habitat: "tierra", role: "consumidor", zeroG: "ok", tempC: [20, 26], source: A.mouse, help: "Corre su circuito y avisa del aire: es el primero en notar un cambio.", note: "En la ISS los ratones jóvenes corrían vueltas por su hábitat (Ronca 2019)." },
  { id: "fundulo", name: "Fúndulo (mummichog)", scientific: "Fundulus heteroclitus", habitat: "agua", role: "consumidor", zeroG: "orienta-con-luz", salt: true, tempC: [10, 30], minWaterL: 20, source: S.skylabFish, help: "Come larvas y restos del acuario salado; aguanta cambios de sal." },
  { id: "pez-sapo", name: "Pez sapo", scientific: "Opsanus tau", habitat: "agua", role: "consumidor", zeroG: "sin-datos", salt: true, nocturnal: true, tempC: [12, 28], minWaterL: 80, source: A.toadfish, help: "Canta con la vejiga natatoria: su zumbido marca la noche del acuario salado." },
  { id: "gamba-amano", name: "Gamba amano", scientific: "Caridina multidentata", habitat: "agua", role: "descomponedor", zeroG: "sin-datos", tempC: [18, 28], minWaterL: 20, source: A.amano, help: "Se come las algas filamentosas que los caracoles no alcanzan." },
  { id: "halocaridina", name: "ʻŌpaeʻula (gamba roja de charca)", scientific: "Halocaridina rubra", habitat: "agua", role: "descomponedor", zeroG: "sin-datos", salt: true, tempC: [18, 28], minWaterL: 1, source: A.halocaridina, help: "Pasta el biofilm en un frasco cerrado durante años." },
  { id: "armadillidium", name: "Cochinilla bola", scientific: "Armadillidium vulgare", habitat: "tierra", role: "descomponedor", zeroG: "sin-datos", nocturnal: true, tempC: [10, 28], source: A.pillbug, help: "Recicla hojarasca y se hace bola si algo la asusta." },
  { id: "grillo-bimaculado", name: "Grillo de dos manchas", scientific: "Gryllus bimaculatus", habitat: "tierra", role: "consumidor", zeroG: "sin-datos", nocturnal: true, tempC: [22, 32], source: A.gryllus, help: "Canta de noche y se come hojas viejas del huerto." },
  { id: "zophobas", name: "Supergusano", scientific: "Zophobas morio", habitat: "tierra", role: "descomponedor", zeroG: "sin-datos", tempC: [22, 30], source: A.superworm, help: "Sus larvas roen restos duros: hasta poliestireno." },
  { id: "lombriz-comun", name: "Lombriz de tierra común", scientific: "Lumbricus terrestris", habitat: "tierra", role: "descomponedor", zeroG: "sin-datos", tempC: [5, 20], source: A.nightcrawler, help: "Cava galerías hondas que airean y drenan los bancales." },
];

/** Every species the catalogue can name: the sanctuary's and these. */
export const ALL_SPECIES: readonly Species[] = [...SANCTUARY_SPECIES, ...EXTRA_SPECIES];

export const anySpecies = (id: string): Species | undefined => ALL_SPECIES.find((s) => s.id === id);
