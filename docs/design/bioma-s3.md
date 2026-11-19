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
| `src/s3-biome.ts` | El cableado (una línea en `aerial-sanctuary.ts`) y la tarjeta del censo |

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

**Licencia (nuestro):** cuántos caben en la isla (`cap`, de decenas, no de miles: presupuesto del móvil), el reparto de la
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

Suelo radial con colores por zona y la playa en pendiente; tussac (pedestal + abanico de hojas), musgo, hierba pilosa,
rocas con liquen y kelp, todo instanciado: tussac 260, musgo 160, hierba 140, rocas 60, kelp 60. La floración del
fitoplancton como un disco de color en el mar. Bancos: kril 200 (dibujado ×5), linterna 42, pez de hielo 8,
austromerluza 3, calamar 6. Los animales, con los cuerpos de cubos de `fauna`. Más allá de 900 m la escena no se dibuja
(la cadena sigue). ≤ 600 llamadas de dibujo (PX-51).

## El censo

En la cabaña, ante el tablón: el botón naranja abre «Censo de la isla» (reglas §5.8). Cada especie: su número por
etapa, cuánto come si pasa hambre, qué come, quién se la come, sus muertes por causa y sus nacimientos; las plantas,
cuánto cubren de lo que cabe. Los últimos 10 sucesos (nace, muere, caza, llega, se va, se aparea).

## Pruebas

`domain/bioma.test.ts` (10 años con todas las especies presentes o fuera comiendo, nacimientos en su mes, sin macho no
hay crías, determinista), `application/biome-life.test.ts`, `fauna/domain/forage.test.ts`. Recorrido PX-51 (`s3-bioma`).

## Para después

- Más individuos (colonias de miles) con impostores o nubes de puntos.
- Los huevos y nidos que se ven; la muda de los pingüinos y de los elefantes marinos.
- Que ella pueda ayudar (contar nidos, anillar) como en Bird Island.
