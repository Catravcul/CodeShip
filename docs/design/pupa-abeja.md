# La pupa de la abeja (santuario 3)

Berón, 2026-11-26: «quitar el globo de nubes y en su lugar una pupa gigante semitransparente en el centro de la
pirámide, rodeada de los árboles colosales, donde se vea la metamorfosis de *Apis cerana*; que se llegue andando o en
alfombra, no solo por Áreas». Sustituye al globo de nubes (2026-11-25), que flotaba sobre el mar y solo se alcanzaba
con «Ir». Es la hermana del globo de agua del santuario 1 y su huevo de pulpo ([santuario1.md](santuario1.md)).

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `fauna/domain/globe-embryo.ts` | Lo común con el pulpo: etapas (`EmbryoStage`), `stageIn`, rampas suaves y el reloj por minutos de un ajuste (`advanceCycle`) |
| `aerial-sanctuary/domain/abeja.ts` | La abeja: sus 18 etapas con su día, `beeAt(k)` (todo continuo), `advanceBee` y `CELL` (proporciones reales de la celda) |
| `aerial-sanctuary/data/pupa-abeja.ts` | `pupaPlan` (dónde y de qué tamaño, calculado), `buildPupa` (la celda sólida, la galería, el muelle, Áreas y sus puntos), `PUPA_AREA`, `PUPA_POINT`, `PUPA_RULES` |
| `adapters/three/s3-bee-pupa.ts` | El dibujo (`BeePupaView`): la celda hexagonal translúcida de cera, su pie, el opérculo y la abeja de cajas |
| `src/s3-biome.ts` | Avanza el reloj con el ajuste y pone la etiqueta de la etapa cerca de la galería |

## Dónde y de qué tamaño

- **En el centro del hueco** (`HOLLOW` de `data/montana.ts`), de pie en el lago, entre los árboles colosales. Nada es
  un número fijo: `pupaPlan` mira lo que ya hay construido (suelos del campus, troncos, cubiertas de raíces, la
  Starship) y toma el sitio libre alrededor del centro; el radio de la celda va de 10 a 22 m (`PUPA_RULES`) y la
  altura sale de las proporciones de una celda real de obrera (ancho 0,42 y hondo 1,05 de la abeja) bajo el techo
  (`ceilingAt` − 12 m). Si la montaña cambia, la pupa se recoloca sola; si no cabe, `pupa-abeja.test.ts` falla.
- Para dejar libre el centro, el **árbol A** del campus pasó de (−40, 30) a (−65, 80) respecto al hueco.
- Hoy: radio 19 m, celda de ~82 m de alto, abeja de ~78 m.
- **Cómo se llega** (Berón: andando o en alfombra): una **galería** de madera de 6 m alrededor del pie, a la altura de
  las cubiertas de raíces (`GIANT.deckY`), y un **muelle** en L hasta la cubierta del árbol más cercano, donde aterrizan
  las alfombras. Andando desde cualquier estación de alfombra se llega por el muelle (`shortestWay` en la prueba);
  nadando, se da la vuelta a la celda en el lago. En **Áreas**: isla de entrenamiento › «La pupa de la abeja» (punto
  `entrenamiento:pupa:mirador`). Las alfombras rodean o sobrevuelan la celda porque se construye antes que sus rutas.

## La especie: *Apis cerana*, la abeja asiática

*Apis mellifera* es el insecto con más pruebas de cognición: la danza del meneo que dice dirección y distancia (von
Frisch 1967), conceptos de igual y distinto (Giurfa et al. 2001, Nature 410: 930) y hasta el cero (Howard et al. 2018,
Science 360: 1124). Pero no es de Gilgit-Baltistán: allí la abeja nativa es ***Apis cerana*** (Oldroyd y Wongsiri
2006, *Asian Honey Bees*, Harvard), que **baila igual** y aprende igual; las reglas piden especies reales de la región
(reglas.md §1.6), y es además la abeja de la cadena del santuario 3. Por eso la pupa es de una obrera de *A. cerana*.
Su embriología no está descrita etapa a etapa: se usan las etapas de *A. mellifera* (licencia: dos especies hermanas
del mismo género, con el mismo desarrollo y 1–2 días menos en *cerana*).

## Sus etapas (real, aproximado)

La obrera de *A. mellifera* tarda **21 días: 3 de huevo + 6 de larva abierta + 12 operculada** (Winston 1987, *The
Biology of the Honey Bee*); la de *A. cerana*, unos 19–20 (Oldroyd y Wongsiri 2006). Aquí **3 + 5 + 11 = 19 días**.

| Día | Etapa | Fuente |
| --- | --- | --- |
| 0 | Huevo de pie en el fondo de la celda: segmentación (núcleos que se dividen) | DuPraw 1967; Fleig y Sander 1986 |
| 0,5 | Blastodermo: los núcleos suben a la superficie y forman una capa de células | Fleig y Sander 1986 |
| 1 | Banda germinal (gastrulación); el huevo se inclina | Fleig y Sander 1986; Winston 1987 |
| 1,5 | Segmentos: cabeza, 3 del tórax, 10 del abdomen | DuPraw 1967 |
| 2 | Esbozos de boca, antenas y patas; el huevo se tumba | Fleig y Sander 1986; Winston 1987 |
| 2,6 | Cierre dorsal; las tráqueas se llenan de aire | Fleig y Sander 1986 |
| 3 | Eclosión: larva de primer estadio sobre jalea real | Winston 1987 |
| 4–7 | Estadios 2 a 5, enroscada en C; jalea de obrera, miel y polen; crece ~1 500 veces su peso | Winston 1987 |
| 8 | Celda operculada; teje el capullo y se estira (prepupa) | Winston 1987 |
| 10 | Pupa blanca de ojos blancos | Jay 1962 (Can. J. Zool. 40: 661) |
| 12–15 | Ojos rosados, morados, pardos | Jay 1962 |
| 16–18 | La cutícula se oscurece: tórax, cabeza, abdomen; última muda | Jay 1962 |
| 19 | Emergencia: roe el opérculo, sale y vuela | Winston 1987 |

DuPraw 1967 (Annals of the Entomological Society of America 60: 1147–1157) y Fleig y Sander 1986 (Journal of
Morphology 189: 133–158, diez etapas en ~72 h a 35 °C) describen el embrión de *A. mellifera*.

**Tamaños** (unidad: la obrera adulta = 1): huevo 0,14 × 0,03 (1,5 × 0,35 mm), celda de 0,42 de ancho y 1,05 de hondo
(~4,5 × 11 mm en *cerana*) con su eje subido ~13°. La celda gigante guarda esas proporciones y **la abeja mide lo que cabe** bajo el techo
de la pirámide (hoy ~78 m, ×17 000 aprox.; ficción, como el huevo del pulpo del santuario 1). La celda es translúcida
para ver dentro y es un sólido: no se atraviesa ni andando ni nadando.

**Transición fluida**: cada valor (inclinación del huevo, blastodermo, segmentos, largo y curva de la larva, opérculo,
forma de abeja, color de ojos y cutícula, alas, salida) es una rampa suave del día; una prueba recorre todo el ciclo
sin saltos (`abeja.test.ts`). Tras salir, la abeja vuela una vuelta sobre la celda y la reina pone otro huevo (el ciclo
vuelve a empezar), como la paralarva del pulpo que se aleja nadando.

**Ajuste** «**Duración del desarrollo de la abeja**» (`abejaMinutes`, hermano de «Huevo de pulpo»: 1, 3, 10 min o
2 horas; 3 por defecto).

## Pruebas

`aerial-sanctuary/domain/abeja.test.ts` (días, orden de etapas, continuidad, reloj), `aerial-sanctuary/data/pupa-abeja.test.ts`
(en el centro y con proporciones de celda, sin pisar el campus ni los árboles, el muelle se anda, se llega a pie desde
una estación de alfombra, el tamaño sale del sitio). En vivo: PX-51 (`tools/experiencia/s3-bioma.mjs`).

## Para después

- Una estación de alfombras propia en la galería (las estaciones son del hilo de la montaña).
- Nodrizas que alimentan a la larva y operculan la celda.

## Respuesta a Berón

Quité el globo de nubes. En el **centro de la pirámide**, de pie en el lago y rodeada de los árboles colosales, hay
ahora una **celda de cera gigante y translúcida** con una obrera de ***Apis cerana*** dentro, que pasa por sus etapas
reales en 19 días (huevo, larva en cinco estadios, celda tapada, prepupa, pupa que oscurece primero los ojos y luego
el cuerpo, y la adulta que roe la tapa y sale volando). Se llega **andando**: desde la cubierta de raíces del árbol más
cercano (donde paran las alfombras) sale un muelle hasta una galería alrededor de la celda; también se puede nadar
alrededor y está en Áreas. Su tamaño se calcula con el sitio libre del centro, así que sigue cabiendo si la montaña
cambia.
