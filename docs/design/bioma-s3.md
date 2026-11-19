# Santuario 3: el bioma subantártico (rama `bioma-s3`)

Berón, 2026-11-19: «crear un bioma donde hay animales y plantas de todo tipo para cumplir una cadena alimenticia y que
sigan sus ciclos de vida naturales». Una sexta isla del santuario 3, **Isla subantártica** (centro (760, 230), 300 × 200 m
a escala 1), como Bird Island en Georgia del Sur: tussac, musgo y kelp; kril y peces; pingüinos, albatros, petreles,
págalos y focas que nacen, comen, cazan, se aparean y mueren. Se llega en helicóptero (su máquina de navegación) o con
«Ir» desde Áreas (elegir «Isla subantártica» en sus ajustes). El censo está en la estación de investigación.

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `aerial-sanctuary/data/bioma.ts` | Las 23 especies: datos de ciclo de vida, dieta, tamaños, cada una con **una fuente**; los campos nuestros, en `ours` con el porqué (etiqueta **licencia**) |
| `aerial-sanctuary/data/bioma-island.ts` | La isla: zonas (estación, playa, colonia, tussac, musgo, kelp), cabaña de 12 × 6 × 3,2 m con el tablón del censo, helipuerto, Áreas |
| `aerial-sanctuary/data/bioma-conducta.ts` | Rasgos de conducta para `fauna` (velocidades, miedos, caza; por etapa: `papua:cria`), cortejos, rivalidades y etogramas, con fuente |
| `aerial-sanctuary/domain/bioma.ts` | La cadena alimenticia: determinista y con semilla; pruebas en `bioma.test.ts` (10 años acotados) |
| `aerial-sanctuary/application/biome-life.ts` | La cadena + `fauna/Ecosystem`: cada animal con su intención (huir, cazar, seguir a la madre, cortejar, rivalizar, descansar de noche, pescar en el mar) |
| `adapters/three/s3-biome-models.ts` | La escena: suelo por zonas, plantas instanciadas, bancos de peces y kril, cuerpos de cubos (`animal-bodies.ts`) |
| `aerial-sanctuary/data/bioma-crowd.ts` | Densidades reales con fuente, factores de escala (licencia), parches, meses en tierra y muda de las multitudes |
| `aerial-sanctuary/domain/bioma-crowd.ts` | Cuántos adultos, crías, nidos y huevos se dibujan según la cadena, el calendario de cría y la muda; pruebas en `bioma-crowd.test.ts` |
| `adapters/three/s3-biome-crowd.ts` | Las multitudes dibujadas: cuerpos de cubos cerca, cajas lejos, nidos y huevos (una sola malla instanciada) |
| `aerial-sanctuary/data/bioma-retos.ts`, `application/field-work.ts` | El trabajo de campo de la cabaña (contar nidos, anillar) como retos, con `procedureReto` del santuario 1 |
| `src/s3-biome.ts` | El cableado (dos líneas en `aerial-sanctuary.ts`), la tarjeta del censo y la de la mesa de campo |

## Especies

Todo **real** desde su fuente salvo lo dicho. Fuentes completas en `data/bioma.ts`.

| Grupo | Especie | Come | Fuente |
| --- | --- | --- | --- |
| Planta | Fitoplancton (diatomeas) | sol y nutrientes (curva de Eppley) | Eppley 1972; Korb et al. 2008 |
| Planta | Kelp gigante *Macrocystis pyrifera* | — (guardería de peces) | Wikipedia |
| Planta | Tussac *Poa flabellata* | — (crece más con guano) | Smith 1985; Wikipedia |
| Planta | Hierba pilosa *Deschampsia antarctica* | — | Wikipedia |
| Planta | Banco de musgo *Chorisodontium*, *Polytrichum* | — | Fenton 1980 |
| Planta | Liquen *Usnea antarctica* | — | Sancho et al. 2007 |
| Banco | Kril *Euphausia superba* | fitoplancton | Wikipedia; CCAMLR; Murphy et al. 2007 (años malos) |
| Banco | Colémbolo *Cryptopygus antarcticus* | musgo, restos | Wikipedia |
| Banco | Mosquito sin alas *Belgica antarctica* | musgo, guano | USAP Antarctic Sun 2020 |
| Banco | Calamar *Martialia hyadesi* | kril, pez linterna | Wikipedia |
| Banco | Pez linterna *Electrona antarctica* | kril | FishBase |
| Banco | Pez de hielo *Chaenocephalus aceratus* | kril, peces | Cold Sanctuary (`Icefish`); FishBase |
| Banco | Austromerluza *Dissostichus mawsoni* | pez de hielo, calamar | Cold Sanctuary (`Toothfish`); CCAMLR |
| Ave | Pingüino papúa *Pygoscelis papua* | kril, peces | Wikipedia; ADW |
| Ave | Petrel damero *Daption capense* | kril, peces | Cold Sanctuary (`CapePetrel`, `FoodChain`) |
| Ave | Albatros viajero *Diomedea exulans* | calamar, peces | Cold Sanctuary (`WanderingAlbatross`); Wikipedia |
| Ave | Págalo polar *Stercorarius maccormicki* | peces, huevos y pollos, carroña | Cold Sanctuary (`PolarSkua`); Wikipedia |
| Ave | Charrán ártico *Sterna paradisaea* (visitante nov–abr) | kril, peces | Cold Sanctuary (`ArcticTern`) |
| Ave | Bisbita de Georgia del Sur *Anthus antarcticus* | colémbolos, mosquitos | Wikipedia; BirdLife |
| Ave | Picovaina nevado *Chionis albus* | kril, huevos, pollos, carroña, algas | Wikipedia |
| Foca | Lobo marino antártico *Arctocephalus gazella* | kril, peces | Wikipedia |
| Foca | Elefante marino del sur *Mirounga leonina* | calamar, peces | Wikipedia |
| Foca | Foca leopardo *Hydrurga leptonyx* | kril, papúas, crías de lobo marino, peces | Wikipedia |

**Licencia (nuestro):** cuántos caben en la isla (`cap`, de decenas, no de miles: presupuesto del móvil; la multitud
que representan, en §Multitudes), el reparto de la
dieta (`pref`), la reserva en días de ayuno de algunas aves, la carroña (se pudre al 8 % al día), el mar a 2–5 °C,
la colocación de las zonas. El clima del aire es **real** (Grytviken).

## Cómo funciona la cadena

Port de `FoodChain` de Cold Sanctuary: una fuente da como mucho `MARGIN` = 0,8 de lo que produce; se suben las fuentes
hasta cubrir a sus consumidores.

- **Tiempo.** El año de la isla dura 28 días de juego (`DaysPerYear` de Cold Sanctuary): un día de juego son 365/28 ≈ 13
  días de vida. Se avanza a pasos de una hora de juego. El día 0 es el 19 de noviembre. Como es determinista con semilla,
  se recalcula desde los días del santuario 3 y no se guarda nada más.
- **Plantas** (`fauna/domain/forage.ts`, genérico): crecen logísticas por la luz del día (modelo CBM de Forsythe, latitud
  −54,3°) × el calor del mes (Grytviken); el fitoplancton con Eppley; el tussac con guano. Se las comen (`graze`) sin
  pasar de lo que pueden dar.
- **Bancos** (kril, peces, calamar, invertebrados del suelo): biomasa continua con crecimiento logístico, menos actividad
  en invierno, el kelp como guardería y los años de kril (malos ≈ 1 de cada 5, Murphy et al.). Una estructura de edades:
  al acabar el desove entran los del año y salen los más viejos.
- **Individuos** (aves y focas): etapas de `fauna/life-cycle` (cría, joven, adulto, anciano), masa ∝ tamaño³, ingesta ∝
  masa^0,75. Las madres alimentan a sus crías; una cría sin madre muere. Una reserva de ayuno que se gasta cuando come
  menos del 80 %. Muertes: de viejos (en la etapa de anciano), cazados, de hambre y sin madre.
- **Celo y partos.** Se aparean en su mes real (`fauna/mating.ts`, `matingMonth`); la hembra preñada pare en su mes real
  (`birthMonth`). Sin macho no hay crías (probado con el elefante marino). En la isla se ven los cortejos y, entre los
  machos de lobo marino y elefante marino, las peleas por el harén (`rivalries`).
- **Caza.** Cada depredador puede quitar a cada presa el 30 % de lo que produce (`PREY_MARGIN`); acierta como la especie
  real (`huntSuccess`) y prefiere a los más débiles. Respuesta funcional de tipo II: si escasea, come menos.
- **Acotado.** Con hambre, los adultos «se van a comer a otra parte» y vuelven en otra temporada; si falta un sexo llega
  una pareja de otra colonia; por encima del tope los jóvenes se van a otra colonia. En años malos de kril se pasan a peces.
- **Lo que se ve.** Cuando ella está en la isla, las cazas y los apareamientos que se ven en la escena (`Ecosystem`) son
  los que cuenta la cadena.

## Escena y presupuesto (iPhone 13)

Suelo radial con colores por zona y la playa en pendiente; musgo, hierba pilosa, rocas con liquen y kelp, instanciados:
musgo 160, hierba 140, rocas 60, kelp 60. La floración del fitoplancton como un disco de color en el mar. Bancos: kril
200 (dibujado ×5), linterna 42, pez de hielo 8, austromerluza 3, calamar 6. Los animales, con los cuerpos de cubos de
`fauna` (el papúa con su pico rojo anaranjado y la banda blanca). Más allá de 900 m la escena no se dibuja (la cadena
sigue). ≤ 600 llamadas de dibujo (PX-51).

### Tussac a su densidad real

**650 matas por hectárea** (real: Lewis Smith y Clymo 1984, *Nature* 309: 617–620, 600–700/ha en Beauchêne, pedestales
de 1–1,5 m, copas de hasta 4,5 m), en rejilla con ruido sobre la ladera: ~1950 matas. Cada mata: pedestal de turba de
~1 m, abanico de hojas de ~3 m (licencia, dentro de «hasta 4,5 m») y una falda de hojas secas. Nivel de detalle: las
420 más cercanas (a < 42 m) con hojas; las demás, un montículo y un cono en una malla (2 + 1 llamadas).

## Multitudes (colonias, playas y nidos)

La cadena vive uno a uno solo unas decenas de animales. Cada uno **representa a `perAdult` más** (factor de escala,
**licencia**) dibujados a la densidad real a su alrededor: si la cadena pierde papúas, la colonia se vacía; si nacen
pollos, se ven ×50 en sus nidos. `domain/bioma-crowd.ts` cuenta, `adapters/three/s3-biome-crowd.ts` dibuja.

| Multitud | Densidad real (fuente) | Escala (licencia) | Se ven con la cadena llena |
| --- | --- | --- | --- |
| Colonia de papúas (4 grupos, punta este) | nidos **a 1 m** unos de otros (≈ 1 nido/m²), nido de piedras de 45 cm × 10–20 cm (ADW) | ×50 | ~1100 papúas, ~550 nidos |
| Playa de lobos marinos (franja de 9 harenes) | **80 crías por 100 m** de costa (Cooper Bay: 2789 crías en ~3,5 km; Staniland et al. 2011); hasta 20 hembras por macho (Wikipedia) | ×30 | ~420 en ~180 m de playa |
| Harén de elefantes marinos | «varias docenas» de hembras por macho (Wikipedia; 40, nuestro) | ×8 | ~48 |
| Nidos de albatros viajero en el tussac | nido de turba de 1 m de base y 0,5 m de alto, colonias sueltas; 1278 parejas en Georgia del Sur (Mackley et al. 2025) | ×3 | 12, a ~16 m |
| Petreles dameros en las grietas (norte) | nido de piedrecillas bajo una roca o en una grieta (Wikipedia) | ×6 | ~60 |

- **Cuántos en tierra por mes** (licencia, del calendario de cada fuente): lobos de noviembre a abril, casi ninguno en
  invierno; elefantes en la cría (sep–nov) y la muda (dic–abr); papúas todo el año, menos en invierno.
- **Nidos y huevos** siguen el calendario real de la especie (`nestPhase`: nido dos semanas antes de la puesta, huevos
  durante la incubación de la cadena, pollos durante sus `childDays`): papúas con 2 huevos en noviembre-diciembre y
  pollos hasta febrero; el pollo de albatros pasa el invierno en su nido de barro; el damero, un huevo en su grieta en
  diciembre. Hay tantos nidos con huevos como hembras empolladas de la cadena × su escala.
- **Muda**: los papúas mudan 25 días en tierra cuando se van sus pollos (ADW, real: finales de marzo en la isla); los
  elefantes marinos en verano (Wikipedia; reparto por meses nuestro: enero-febrero sobre todo). Se ven pardos a parches.
- **Nivel de detalle**: a menos de 24 m de la cámara, el cuerpo de cubos de su especie (en la misma manada que los de la
  cadena: ninguna llamada de más; tope de 200 papúas, 90 lobos…; un tercio se re-posa cada fotograma, respiran y giran la
  cabeza); más lejos, una o dos cajas con sus colores. Las cajas lejanas, nidos, huevos (solo a < 40 m) y rocas de las
  grietas son **una sola malla instanciada** (una llamada). Se recolocan solo si cambian las cuentas o la cámara se
  mueve 3 m.

Medido en PX-51 (SwiftShader, sin GPU): ver la última corrida en `docs/qa/registro.md`.

## La estación: el censo y la mesa de campo

### Mesa de campo (trabajo de campo como en Bird Island)

Junto a la pared oeste de la cabaña, a más de 2 m del tablón: el cuaderno, el contador manual, los alicates de anillar
y las anillas. El botón naranja abre «Mesa de campo» (nunca se abre sola). Cada trabajo es un procedimiento real, un
reto por paso, con `procedureReto` del santuario 1 (`sanctuary-one/application/challenges.ts`, que ahora acepta su
lista de pasos de distracción) y el reproductor de pasos de las naves (`StepShow`): ella ante la mesa, revisa el
cuaderno, toma el contador o los alicates.

| Trabajo | Pasos (fuente) | Cuándo |
| --- | --- | --- |
| Contar los nidos de papúa | incubación temprana, contador y plano, a ≥ 5 m, nido ocupado = ave sobre el nido, 3 recuentos, repetir si difieren > 10 %, anotar la media — **la media es el total real de la colonia de la cadena** (CCAMLR CEMP A3; normas de visita de Georgia del Sur) | con huevos o pollos en los nidos |
| Anillar un pollo de albatros viajero | permiso y número, acercarse por detrás, paño sobre la cabeza, sujetar alas sin oprimir el pecho, anilla en el tarso que gire, anotar, devolver al nido (BTO; BAS Bird Island) | con un pollo en su nido (marzo–diciembre) |

Fuera de su época el botón sale apagado con el porqué. Lo hecho queda en el **cuaderno de campo** de la tarjeta.

### El censo

En la cabaña, ante el tablón: el botón naranja abre «Censo de la isla» (reglas §5.8). Cada especie: su número por
etapa, cuánto come si pasa hambre, qué come, quién se la come, sus muertes por causa y sus nacimientos; las aves y
focas con multitud, cuántas se ven en la isla (×escala), sus nidos, huevos y si están en muda; las plantas, cuánto
cubren de lo que cabe. Los bancos **por su peso** («≈ 800 000 t» de kril, dos cifras significativas) y en letra pequeña
cuántos («≈ 2,4 billones de individuos») y el reparto por edades en %. Cifras en español: grupos de tres con espacio,
«millones», «mil millones», «billones». Cada fila cabe en 390 px (PX-51). Los últimos 10 sucesos.

## Pruebas

`domain/bioma.test.ts` (10 años con todas las especies presentes o fuera comiendo, nacimientos en su mes, sin macho no
hay crías, determinista), `domain/bioma-crowd.test.ts` (calendario de nidos, muda, escala, cifras legibles),
`application/field-work.test.ts`, `application/biome-life.test.ts`, `fauna/domain/forage.test.ts`. Recorrido PX-51
(`s3-bioma`): densidad a la vista en la colonia (≥ 120 papúas) y la playa (≥ 30 lobos, lo real en noviembre: ~1,6 por metro de playa), nidos con huevos en noviembre,
tussac a su densidad, kril en toneladas, filas en 390 px, el reto de contar nidos completo en la mesa, la muda en marzo.

## Para después

- Que la multitud reaccione (se aparte al pasar ella, los págalos roben huevos de los nidos que se ven).
- Más trabajos de campo: recuento de crías en la playa de estudio, pesar pollos de albatros.
