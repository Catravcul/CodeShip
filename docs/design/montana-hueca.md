# La montaña hueca del santuario 3 (Berón, 2026-11-25)

> «La montaña es una pirámide artificial hueca cubierta de tierra y piedra, con cuevas; dentro, árboles gigantes llegan
> al techo como columnas; sus pisos siguen las reglas de los edificios del santuario 1; estaciones de alfombras; un
> Starship lleno de agua donde se nada; la base es un lago de 4 m; luz brillante sin sombras y se ve el fondo.»

Todo es **ficción** (como los edificios-árbol de Cold Sanctuary); las salas del campus dentro de los árboles son
**reales** (cada una con su fuente en `data/campus.ts`). Código: `data/bioma-island.ts` (pirámide y cuevas),
`domain/mountain.ts` (terreno con la cubierta y los túneles), `data/montana.ts` (lago, árboles, pisos, alfombras,
Starship), `data/campus.ts` y `data/campus-fixtures.ts` (servicios), `adapters/three/s3-mountain.ts` (dibujo).
Pruebas: `data/montana.test.ts`, `data/layout.test.ts`, `data/fixtures.test.ts`.

## Pirámide

- Base de 440 m de lado y 320 m de alto, con su centro en (1610, 370); la cubierta de tierra y piedra tiene 15 m sobre
  la cara natural del monte y deja intactos los farallones.
- Hueco: 420 m de lado en el suelo (y 100 m) y techo a 310 m; `ceilingAt(x, z)` da la altura del techo en cada punto.
- **Lago de 4 m** en todo el suelo (`lago-montana`, y 100–104): agua clara, fondo de arena visible.
- **Luz**: dentro, la luz es pareja de todos lados (hemisférica ×2, sol casi apagado) y la niebla toma el color claro de
  las paredes: sin sombras, se ve el fondo del lago.

## Cuevas

Tres túneles por la cara sur (6 m de medio ancho, 9 m de bóveda), **por encima del agua**, cada uno termina en su
estación de alfombras sobre el lago: sur (y 112, con el helipuerto del campus en su boca), suroeste (y 118) y sureste
(y 124). Senderos del monte suben a las bocas; escalones de 0,4 m bajan de la boca a la ladera.

## Árboles gigantes

Cuatro troncos de madera maciza (18 × 18 m) del lago al techo: lo sostienen. Sus pisos siguen las reglas indexadas en
[edificios-y-pisos.md](edificios-y-pisos.md):

| Árbol | Pisos (de abajo arriba) | Cima |
|---|---|---|
| Entrenamiento | supervivencia · gimnasio + trajes · simuladores Dragon + LM · robótica + control · SVMF | NBL |
| Servicios | residencia · restaurante · clínica · centro médico · asambleas | — |
| Ciencias y estudio | aulas · biblioteca · laboratorio · crianza | — |
| Producción y campos | huerto · taller | centrífuga |

21 salas en total. Cada pie y cada piso tiene su estación de alfombras.

## Alfombras

Las del santuario 1 (`sanctuary-one/data/alfombras.ts`, `carpetRoute`): cada estación tiene su carril libre; un piso
vuela a los demás pisos y al pie de su árbol; los pies, las cuevas y el Starship vuelan entre sí. Un enlace solo existe
si su vuelo no toca nada (`flightTouches`, probado para todos). «Ir» encadena saltos de alfombra cuando hace falta
(cueva → pie → piso) y vuela cada uno a la vista. En la estación, su tarjeta lista los destinos.

## Starship inundado

La Starship de la nodriza (`nodriza-starship.md`) a escala del campus, de pie en el lago: sus cubiertas, escotillas y
camarotes son agua. Se entra por la pasarela y la esclusa de la cubierta 3 nadando, y se visita cada cubierta.

## Auditoría del campus (servicios)

| Servicio | Salas | Qué se hace |
|---|---|---|
| Residencia | residencia | **Dormir** en tu cama (8 h del reloj) · reto «Preparar el descanso» |
| Restaurante | restaurante | **Comer** sentada a la mesa · reto «Cata» |
| Hospital | clínica, centro médico | reto «Cuarentena» + la cámara hipobárica |
| Crianza | crianza | retos «Moscas» y «Colmena» |
| Entrenamiento | NBL, centrífuga, SVMF, gimnasio, supervivencia, simuladores, robótica, trajes, control | los puestos de la iniciación |
| Estudio | aulas, biblioteca | retos «Clase» y «Procedimiento» |
| Ciencias | laboratorio | reto «Guantera» |
| Campos | huerto | reto «Veggie» |
| Producción | taller | reto «Impresora 3D» |
| Asambleas | asambleas | reto «Reunión» |
