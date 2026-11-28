# El bosque del Carbonífero y sus insectos gigantes (santuario 3)

> **2026-11-28**: el bosque y sus gigantes están **dentro de la montaña**, en un tramo de la orilla de la nave (la dirección
> de su antigua zona, al noreste; `carbonHallGeo`, `CarbonScene` con `place`); su área es `entrenamiento:bosque-carbonifero`,
> a pie desde el muelle de la compuerta más cercana ([montana-hueca.md](montana-hueca.md)).

Berón, 2026-11-26: insectos gigantes del Carbonífero y el Pérmico (con el oxígeno al ~35 %): *Meganeura monyi* y
*Meganeuropsis permiana*, *Arthropleura*, *Mazothairos* (paleodictiópteros) y las cucarachas primitivas, con su flora
(*Psaronius*, *Lepidodendron*, *Sigillaria*, *Calamites*, *Cordaites*), con fuentes reales: tamaños fósiles «real
(fósil)» y lo inventado «ficción».

## La decisión: acompañan, no sustituyen

- **Acompañan** a los insectos de Gilgit (×400), en su propio bosque: el **Bosque del Carbonífero** al pie noreste de
  la pirámide (`CARBON_ZONE`, en Áreas por su cinturón) y un bosquecillo en la cima (`CARBON_SUMMIT`).
- **Por qué**: la región del santuario 3 es el Karakórum (reglas.md §1.6) y sus insectos se dibujan ×400; los gigantes
  miden de 4 cm a 2,6 m de verdad y a ×400 serían de 1 km. Aquí se dibujan **a su tamaño fósil (×1, `CARBON_SCALE`)**:
  su escala es coherente sin ficción (lo gigante es real, por el oxígeno). Así el mayor dibujado es Arthropleura,
  2,6 m, y ninguno pasa del paso de las cuevas (`CAVE_PASSAGE` de la montaña: el mayor animal + 2 m; hoy lo fija un
  insecto de Gilgit ×400 de ~36 m); una Meganeura ×400 serían ~280 m y no cabría (prueba en `carbonifero.test.ts`). Lo único fuera de su tiempo es que viven en
  el Karakórum de hoy (ficción declarada, como un parque de fósiles vivos).
- **Una sola regla por persona** para todo el santuario (`s3Plan` en `data/bioma.ts` reparte sobre los insectos de
  Gilgit y los del Carbonífero juntos, 70/22/8 por nivel y al menos 2 por especie). Sustituir del todo a los de Gilgit
  sería cambiar `ANIMALS` por `CARBON_ANIMALS`: queda como opción para Berón.

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `aerial-sanctuary/data/carbonifero.ts` | Zona, oxígeno, especies (plantas, banco y 5 animales con fuente y `ours`), clima (licencia), la cadena en palabras |
| `aerial-sanctuary/data/carbonifero-conducta.ts` | Rasgos, nombres y etogramas para `fauna` |
| `aerial-sanctuary/data/bioma.ts` | `carbonBiome(k)`: su `BiomeDef` (escala 1), la regla compartida |
| `aerial-sanctuary/application/biome-life.ts` | `carbonGeo()` y sus vuelos (Meganeura patrulla el bosque, Mazothairos planea) |
| `fauna/domain/animal-body.ts` | Cuerpos: `miriapodo` (28 placas con sus lóbulos y patas), `meganeura`, `meganeuropsis`, `mazothairos` (alitas protorácicas y pico), `cucaracha` (pronoto y cercos) |
| `adapters/three/s3-carbon.ts` | `CarbonScene`: los árboles procedurales (una malla instanciada por especie) y los animales y larvas |
| `src/s3-biome.ts` | Lo vive (`BiomeLife` propia), lo pone en Áreas y en el censo (sección «Bosque del Carbonífero») |

## Las especies (real (fósil), con fuente)

| Especie | Tamaño | Nivel | Come | Fuente |
| --- | --- | --- | --- | --- |
| *Arthropleura armata* | hasta 2,6 m, ~50 kg | 2 | hojarasca | Davies et al. 2021, J. Geol. Soc. 179: jgs2021-115; Lhéritier et al. 2024, Sci. Adv. 10: eadp6362 (la cabeza) |
| *Archimylacris eggintoni* (cucaracha primitiva) | ~4 cm | 2 | hojarasca | Garwood y Sutton 2010, Biol. Lett. 6: 699 |
| *Mazothairos enormis* | ~55 cm de envergadura | 2 | jugos y esporas de los conos (pico chupador) | Kukalová-Peck y Richardson 1983, Can. J. Zool. 61: 1670; Labandeira 1997; Kukalová-Peck 1978, J. Morphol. 156: 53 |
| *Meganeura monyi* | ~68 cm de envergadura | 3 | insectos pequeños, cucarachas | Brongniart 1884; Nel et al. 2009, Palaeontographica A 289: 89 |
| *Meganeuropsis permiana* | ~71 cm de envergadura, cuerpo 43 cm | 4 | además Mazothairos y Meganeura | Carpenter 1939 |

Oxígeno: ~30–35 % al final del Carbonífero (Berner 2006, GCA 70: 5653); el oxígeno alto permite tráqueas más largas
(Harrison et al. 2010, Proc. R. Soc. B 277: 2863). Flora: DiMichele y Phillips 1994 (Palaeo3 106: 39–90) y Wikipedia
de cada género. Clima de pantano ecuatorial, 25–27 °C (Montañez y Poulsen 2013; la serie mensual, licencia).

**Ficción y licencia**: sus ninfas (de Meganeura y Meganeuropsis) no se conocen: se suponen acuáticas y quedan fuera de
la vista (`hiddenYoung`). Meganeuropsis vivió ~25 millones de años después que Meganeura y en Kansas: aquí comparten
bosque (licencia). Cuánto viven, cuántas crías y cuánto comen: nuestro (`ours`).

## La cadena

1. Los árboles del pantano dejan hojarasca y madera caída.
2. Artropleura, las cucarachas primitivas y los insectos pequeños comen esa hojarasca y helechos.
3. Mazothairos chupa los jugos y las esporas de los conos de Sigillaria, Lepidodendron y Cordaites.
4. Meganeura caza al vuelo insectos pequeños y cucarachas; Meganeuropsis, además, Mazothairos y alguna Meganeura.

`carbonifero.test.ts`: tamaños fósiles, fuentes, la cadena se cierra y 10 años estables con varias semillas.

## La flora (formas reconocibles)

| Árbol | Forma procedural | Fuente |
| --- | --- | --- |
| *Lepidodendron* | tronco alto con bandas de cojinetes en rombo, copa de ramas que se bifurcan con conos en las puntas | Wikipedia; DiMichele y Phillips 1994 |
| *Sigillaria* | columna con costillas verticales, un penacho de hojas largas arriba | Wikipedia |
| *Calamites* | tallo con nudos y verticilos de ramas en cada nudo | Wikipedia |
| *Psaronius* | base ensanchada por el manto de raíces, copa de frondes | Wikipedia |
| *Cordaites* | tronco recto, hojas en cinta al final de las ramas | Wikipedia |

En el bosque: 22 + 16 + 30 + 26 + 12 árboles; en la cima de la pirámide, 2 Sigillaria, 4 Calamites, 6 Psaronius y 4
Cordaites. Una llamada de dibujo por especie. En vivo: PX-51. Captura: `docs/screenshots/s3b-carbonifero-movil.png`.
