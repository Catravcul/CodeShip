/**
 * Talking with the people of the Academy (Berón 2026-11-23 18:33: «crea los diálogos con los personajes, se implementan
 * también como retos de código»). Each named person has a conversation that is a challenge: she orders what is said,
 * turn by turn, and the wrong turns are what they would never say. What they say is from their sources; where the
 * idea is written later than 360 a. C., the scenario says so.
 */
import type { Procedure } from "@modules/sanctuary-one/data/retos";

const d = (id: string, title: string, scenario: string, steps: readonly string[], wrong: readonly string[], source: string): Procedure => ({ id: `dialogo-${id}`, title, kind: "trabajar", reward: "compania", scenario, steps, wrong, source, reality: "real" });

/** By person id (data/academia.ts PERSONAS). */
export const DIALOGOS: Readonly<Record<string, Procedure>> = {
  platon: d("platon", "Hablar con Platón: la caverna", "«Imagina unos hombres en una morada bajo tierra…» Ordena lo que cuenta", [
    "unos presos encadenados desde niños solo ven sombras en la pared de la cueva",
    "uno se libera y ve el fuego y las figuras que hacían las sombras",
    "lo sacan fuera; deslumbrado, primero ve reflejos y luego las cosas mismas",
    "al fin mira el sol, que hace ver todo lo visible",
    "vuelve a la cueva a liberar a los demás, aunque se burlen de él",
  ], ["las sombras son lo más real que hay", "el que sale no vuelve nunca"], "Platón, República VII 514a–517a (la alegoría de la caverna)"),
  aristoteles: d("aristoteles", "Hablar con Aristóteles: por qué filosofar", "Aristóteles, con 24 años, anima a estudiar (lo escribirá en su Protréptico)", [
    "todos los seres humanos desean por naturaleza saber",
    "si hay que filosofar, hay que filosofar",
    "y si no hay que filosofar, también hay que filosofar para demostrarlo",
    "así que en cualquier caso hay que filosofar",
  ], ["filosofar solo sirve a los ricos", "saber no da ningún gusto"], "Aristóteles, Metafísica I 980a; Protréptico, fr. 2 Ross (el argumento citado por Alejandro y Olimpiodoro)"),
  espeusipo: d("espeusipo", "Hablar con Espeusipo: ordenar los seres por su parecido", "Espeusipo clasifica plantas y animales en su libro de las Semejanzas", [
    "fíjate en qué se parecen dos seres",
    "junta los que se parecen en lo esencial",
    "sepáralos de los que difieren",
    "da un nombre a cada grupo y sigue con el siguiente",
  ], ["junta los seres por su tamaño solamente", "pon nombre antes de mirarlos"], "Diógenes Laercio IV 2–5; Ateneo II–IX (citas de las Semejanzas, Hómoia, de Espeusipo)"),
  jenocrates: d("jenocrates", "Hablar con Jenócrates: la paciencia", "Jenócrates aprende despacio, pero no se rinde nunca", [
    "Jenócrates tarda en entender lo que otros pillan enseguida",
    "cada día repasa lo que aprendió",
    "no se compara con los rápidos: sigue a su paso",
    "Platón dice que Jenócrates necesita espuela y Aristóteles freno",
    "con los años llegará a dirigir la Academia",
  ], ["quien aprende despacio no aprende", "deja de estudiar cuando algo cuesta"], "Diógenes Laercio IV 6 y 14 (lento de natural; «espuela» y «freno»; escolarca desde 339 a. C.)"),
  heraclides: d("heraclides", "Hablar con Heráclides: el giro de la Tierra", "Heráclides tiene una idea atrevida sobre el cielo", [
    "cada día parece que todo el cielo gira alrededor de nosotros",
    "pero podría ser la Tierra la que gira sobre sí misma",
    "da una vuelta cada día, de oeste a este",
    "por eso las estrellas parecen moverse de este a oeste",
  ], ["la Tierra gira una vez al año sobre sí misma", "las estrellas se apagan de día"], "Simplicio, Comentario al De caelo 444.31 (Heráclides: la Tierra gira y el cielo está quieto)"),
  filipo: d("filipo", "Hablar con Filipo de Opunte: el ciclo de Metón", "Filipo cuenta lunas y años para el calendario", [
    "un mes lunar dura unos {29|35|20} días y medio",
    "doce meses lunares se quedan cortos para un año del sol",
    "Metón vio que {19|12|8} años del sol son casi justos 235 meses lunares",
    "por eso cada 19 años se añaden siete meses y el calendario no se desajusta",
  ], ["un año tiene justo doce lunas", "el mes lunar dura 40 días"], "Diodoro XII 36 (el ciclo de Metón, 432 a. C.); Diógenes Laercio III 37 (Filipo, astrónomo)"),
  axiotea: d("axiotea", "Hablar con Axiotea: el valor de venir", "Axiotea vino desde Fliunte a estudiar con Platón", [
    "leyó en Fliunte un libro de Platón, la República",
    "decidió venir a Atenas a estudiar en la Academia",
    "viste como un hombre para estudiar entre ellos",
    "estudia y discute como cualquiera de los discípulos",
  ], ["vino porque se lo mandaron", "en la Academia solo escucha y nunca habla"], "Diógenes Laercio III 46; Temistio, Discurso 23, 295c (Axiotea leyó la República y vino a Atenas)"),
  lastenia: d("lastenia", "Hablar con Lastenia: la amistad que aprende", "Lastenia de Mantinea estudia con Platón y con Espeusipo", [
    "aprender con amigos es más fácil que aprender sola",
    "se escucha al otro hasta el final",
    "se pregunta lo que no se entiende, sin vergüenza",
    "se ayuda al que va detrás",
  ], ["se esconde lo que uno sabe para ganar", "se calla lo que no entiende"], "Diógenes Laercio III 46 y IV 2 (discípula de Platón y de Espeusipo); la conversación: supuesto"),
  artemis: d("artemis", "Hablar con Ártemis: el fuego del hogar", "Ártemis cuida el hogar de la casa", [
    "por la mañana se aviva la brasa que quedó tapada con ceniza",
    "se añaden ramitas secas y luego leña",
    "sobre el fuego se cuece la comida",
    "por la noche se tapa la brasa con ceniza para que dure hasta el alba",
  ], ["se apaga con agua cada noche", "se echa la leña gruesa la primera"], "Sparkes, B. A., «The Greek kitchen», JHS 82 (1962); Diógenes Laercio III 42 (Ártemis en el testamento de Platón)"),
  paidotriba: d("paidotriba", "Hablar con el paidotriba: cuerpo y alma", "El entrenador explica por qué se entrena", [
    "la gimnasia hace fuerte el cuerpo",
    "la música y el estudio hacen fino el espíritu",
    "solo gimnasia vuelve a uno duro y bruto",
    "solo música lo vuelve blando: hay que equilibrar las dos",
  ], ["basta con entrenar el cuerpo", "la música no sirve para nada"], "Platón, República III 410b–412a (gimnasia y música, en equilibrio)"),
  jardinero: d("jardinero", "Hablar con el jardinero: los olivos de Atenea", "El jardinero cuida los olivos sagrados", [
    "estos olivos son de Atenea, descienden del que plantó en la Acrópolis",
    "su aceite se guarda para los premios de las Panateneas",
    "a los ganadores se les dan ánforas llenas de este aceite",
    "por eso nadie puede arrancarlos ni dañarlos",
  ], ["el aceite se vende en el mercado", "se pueden cortar para leña"], "Aristóteles, Constitución de los atenienses 60 (el aceite de los olivos sagrados, premio de las Panateneas); Lisias VII"),
  carretero: d("carretero", "Hablar con el carretero: las tumbas del camino", "El carretero conoce bien el Dromos", [
    "a los lados del camino se entierra a los atenienses caídos en la guerra",
    "cada año se les hace un funeral público",
    "uno de los ciudadanos pronuncia el discurso por ellos",
    "Pericles lo hizo aquí en el primer año de la guerra",
  ], ["aquí se entierra a los extranjeros", "nunca se les recuerda"], "Tucídides II 34–46 (el funeral público en el Cerámico y el discurso de Pericles); Pausanias I.29"),
};
