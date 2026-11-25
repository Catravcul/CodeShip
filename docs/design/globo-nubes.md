# El globo de nubes y su abeja (santuario 3)

Berón, 2026-11-25: «lo más representativo del aire son las nubes, quizás para el equivalente al pulpo se podría crear
un globo de nubes y en el centro al insecto más inteligente que existe recreando sus etapas prenatales». Es el hermano
del globo de agua del santuario 1 y su huevo de pulpo ([santuario1.md](santuario1.md)).

## Dónde está el código

| Archivo | Qué |
| --- | --- |
| `fauna/domain/globe-embryo.ts` | Lo común a los dos globos: etapas (`EmbryoStage`), `stageIn`, rampas suaves (`smooth`, `ramp`) y el reloj que avanza con los minutos de un ajuste y vuelve a empezar (`advanceCycle`). El pulpo (`sanctuary-one/domain/pulpo.ts`) ya lo usa, sin cambiar lo que hace |
| `aerial-sanctuary/domain/abeja.ts` | La abeja: sus 18 etapas con su día, `beeAt(k)` (cómo se ve en cada momento, todo continuo) y `advanceBee` |
| `aerial-sanctuary/data/globo-nubes.ts` | `CLOUD_GLOBE` (centro y radio, dato con fuente), la nube nadable por capas, el rellano de entrada (`CLOUD_LANDING`, `CLOUD_ENTRY`), el panal y su sólido, el área y el punto `bioma:globo-nubes:entrada` |
| `adapters/three/s3-cloud-globe.ts` | El dibujo: capa de nubes, rellano, panal de 7 celdas, la abeja de cajas (unas 7 llamadas de dibujo) |
| `src/s3-biome.ts` | Lo mete en el mundo (aguas, suelo, sólido, Áreas, punto), avanza el reloj con el ajuste, la etiqueta de la etapa y la neblina blanca dentro |

## El globo

- **Dónde** (dato, ficción): centro (1450, 250, −650), es decir sobre el mar al sur de la montaña (que acaba en
  z = −350) y a 250 m de altura, con **140 m de radio** como el globo del santuario 1. Ninguna isla lo toca
  (`globo-nubes.test.ts`).
- **Se nada dentro** (licencia): su nube es «agua de nube», como el agua del globo de las ballenas: capas de cajas de
  12 × 10 m que siguen la esfera (`surfaceAbove` de `walk.ts` las une), así que ella sube, baja y cruza nadando con los
  mismos mandos. Andar sobre nubes sería magia de Cold Sanctuary; nadar en ellas usa lo que ya funciona en el santuario
  1 y deja ir a todas partes del volumen, lo que un suelo de nubes no permite. Una nube real tiene ~0,5 g de agua por
  m³: no sostiene a nadie (ficción declarada).
- **Entrada**: un **rellano de nube densa** de 20 × 20 m en su borde inferior (y = 114 m). Desde él se da un paso al
  borde y se entra nadando. `CLOUD_ENTRY` queda exportado: otro hilo pondrá allí una estación de alfombras voladoras.
  Hasta entonces se llega con «Ir» de **Áreas** (isla de las alturas › «El globo de nubes») en modo teletransporte.
- Dentro, la niebla se vuelve blanca (la nube) y una etiqueta bajo el lugar dice la etapa de la abeja.

## La especie: *Apis cerana*, la abeja asiática

*Apis mellifera* es el insecto con más pruebas de cognición: la danza del meneo que dice dirección y distancia (von
Frisch 1967), conceptos de igual y distinto (Giurfa et al. 2001, Nature 410: 930) y hasta el cero (Howard et al. 2018,
Science 360: 1124). Pero no es de Gilgit-Baltistán: allí la abeja nativa es ***Apis cerana*** (Oldroyd y Wongsiri
2006, *Asian Honey Bees*, Harvard), que **baila igual** y aprende igual; las reglas piden especies reales de la región
(reglas.md §1.6), y es además la abeja de la cadena del santuario 3. Por eso el globo tiene una obrera de *A. cerana*.
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
(~4,5 × 11 mm en *cerana*) con su eje subido ~13°. Como el pulpo del santuario 1 (un tercio del globo), **la abeja
adulta mide un tercio del globo: 93 m** (×9 000 aprox.). Su celda está en el centro de un panal de 7 celdas (las seis
vecinas, selladas); la propia es transparente para ver dentro, y su panal es un sólido con el que se choca nadando.

**Transición fluida**: cada valor (inclinación del huevo, blastodermo, segmentos, largo y curva de la larva, opérculo,
forma de abeja, color de ojos y cutícula, alas, salida) es una rampa suave del día; una prueba recorre todo el ciclo
sin saltos (`abeja.test.ts`). Tras salir, la abeja vuela una vuelta por el globo y la reina pone otro huevo (el ciclo
vuelve a empezar), como la paralarva del pulpo que se aleja nadando.

**Ajuste** «**Duración del desarrollo de la abeja**» (`abejaMinutes`, hermano de «Huevo de pulpo»: 1, 3, 10 min o
2 horas; 3 por defecto).

## Comparación con el pulpo

| | Santuario 1 (agua) | Santuario 3 (aire) |
| --- | --- | --- |
| Globo | de agua, nace del mar entre los casquetes | de nubes, flota sobre el mar al sur de la isla |
| Radio | 140 m | 140 m |
| Animal | pulpo común, *Octopus vulgaris* | abeja asiática, *Apis cerana* |
| Por qué | 3 corazones, 9 «cerebros», muy inteligente | el insecto con más pruebas de cognición (danza, conceptos, cero) |
| Desarrollo | huevo → paralarva (Naef I–XX) | huevo → larva → pupa → adulta (19 días) |
| Tamaño | un tercio del globo | un tercio del globo |
| Código | `pulpo.ts` | `abeja.ts`, los dos sobre `globe-embryo.ts` |

## Pruebas

`aerial-sanctuary/domain/abeja.test.ts` (días, orden de etapas, huevo que se tumba, larva, opérculo, ojos antes que el
cuerpo, continuidad, reloj), `aerial-sanctuary/data/globo-nubes.test.ts` (lugar libre, entrar por el rellano, nadar
hasta el centro, el panal sólido), `sanctuary-one/domain/pulpo.test.ts` (el pulpo sigue igual). Captura:
`docs/screenshots/s3-insectos-globo-abeja.png` (huevo, larva, pupa, adulta saliendo y el globo desde fuera).

## Para después

- La estación de alfombras en el rellano (otro hilo) y un camino a pie o en alfombra desde la isla.
- Nodrizas que alimentan a la larva y operculan la celda (obreras visibles en el panal).

## Respuesta a Berón

El equivalente del pulpo en el aire es **la abeja melífera**: es el insecto con más pruebas de inteligencia (baila
para decir dónde están las flores, aprende conceptos como «igual» y «distinto» y entiende el cero), y como el pulpo se
puede ver entera su vida antes de nacer, del huevo a la adulta, en solo 19–21 días. Elegí la **abeja asiática, *Apis
cerana***, porque es la nativa de Hunza y Gilgit (la europea no lo es) y baila y aprende igual. El **globo de nubes**
flota sobre el mar al sur de la Isla de las alturas, del mismo tamaño que el de agua, y dentro **se nada entre las
nubes** como en el globo de las ballenas. En su centro, en una celda de cera de un panal gigante, la abeja pasa por sus
etapas reales: huevo (segmentación, blastodermo, banda germinal, segmentos, patas), larva en cinco estadios, celda
tapada, prepupa, pupa que oscurece primero los ojos y luego el cuerpo, y la adulta que roe la tapa y sale volando. La
transición es fluida y su duración se elige en Ajustes, como la del pulpo, porque los dos comparten el mismo código.
