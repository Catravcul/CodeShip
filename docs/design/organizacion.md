# Organización de edificios y pisos, y la cima de la Residencia

Pedido de Berón (2026-11-24): «¿es posible hacer un tobogán real? … transformas las literas en castillos o fuertes que
rodeen el ring de almohadas … guerras de almohadas … este piso de habitaciones y plaza podría pasar a ser un piso más
grande que se encuentre en la cima del árbol … debemos tener reglas que permitan este tipo de cambios … quizás por
cálculos?». Respuestas: dónde va la Residencia, «que lo decidan las reglas»; 4 castillos; la pecera, con Informática.

## Marcas (tags)

- **Piso**: sus componentes (`id`, categoría, **cuota**: la parte de un piso de 40 × 40 m que necesita). Un componente:
  piso **puro**; varios: **mixto**. Ej.: Informática = informática 0,8 + simulación 0,15 (mixto).
- **Edificio**: sus pisos, su **cima** si la tiene y su categoría (la más común de sus pisos).
- Las marcas viven en `data/site.ts` (`PISO_TAGS`, `CATEGORIA`); las reglas, en `domain/organizacion.ts` (puro, con pruebas).

## Reglas (`revisar` / `reorganizar`)

| # | Regla | Cálculo |
| --- | --- | --- |
| 1 | Dónde cabe un componente (`ubicar`) | cuota ≤ 1: piso · ≤ 1,9: piso con anillo · ≤ 9: **cima** (piso gigante en la copa, 120 × 120 m como mucho) · ≤ 11,25: cima con anillo · más: se reparte en ⌈cuota / 1,9⌉ pisos |
| 2 | Piso mixto desbordado | si la ocupación pasa de 1, los componentes que no crecen van a un piso de su categoría con sitio (o al más vacío; si no, a un piso nuevo) |
| 3 | Edificio solo con su cima | la cede al edificio con menos pisos y cima libre, y desaparece (un árbol menos, viajes más cortos) |
| 4 | Edificios desequilibrados | se marca el que tenga menos de la mitad de pisos que el más lleno (para fusionar o traer pisos) |

Al aplicarlas hoy (`REORGANIZACION` en `site.ts`): la Residencia con castillos y ring (cuota 7,6: 110 × 110 m) no cabe en
un piso → sube a la cima de la Residencia con sus 6 pisos de vivienda → la Residencia se queda solo con su cima → la cede
a **Ciencias** (2 pisos, el de menos) y desaparece. Quedan 5 árboles; la pecera de simulación va al piso de Informática.

## La cima (datos: `data/castillos.ts`, `data/floors/residencia-cima.ts`; dibujo: `adapters/three/s1-models.ts` `crown`)

- Un cuadrado de 110 × 110 m sobre el tronco, con **tornapuntas** desde el tronco y el **jardín** por el borde (arbolitos y
  macetas cada 6 m). La **entrada** es la copa del tronco, en el centro; alrededor, un paseo de 2 m y el **ring de
  almohadas** (colchón de 12 m de ancho con unas 260 almohadas); luego un camino y los **4 castillos**, uno por lado.
- La **estación de alfombras** de la copa es un apéndice del borde de la cima (`alfombras.ts`), como la de un piso.
- **Castillos** (como las estructuras de juego de las fotos): dos cubiertas a media altura de diferencia (4,2 y 5,4 m)
  unidas por un puente escalonado, la cubierta alta (9,6 m) y la torre (13,8 m) con tejado del color del equipo. Para
  subir: 5 tramos de escalera con rellano, una red al nivel bajo y otra a la torre; quitar cualquier escalón no deja
  aislada la cubierta alta (prueba). Barandas transparentes de 1 m con huecos donde llega una escalera, red o tobogán;
  postes rojos.
- **Aposentos**: las 30 habitaciones de la Residencia repartidas 8, 8, 7, 7 por castillo, a la altura de sus cubiertas,
  con sus literas; las camas de la gente (`jornada.ts`) están en «Aposento de …».
- Entre castillos: el **aula** de historia, la **lectura** y la biblioteca, la **cocina compartida**, los **aseos**.
- **Toboganes reales** (`domain/tobogan.ts`): uno de tubo desde la torre (rampa, hélice de 2 vueltas, salida casi llana)
  y otro recto desde la cubierta baja; los dos acaban **a orillas del ring**. Al entrar por la boca andando, se sienta y
  baja por gravedad: a = g (sen θ − μ cos θ), μ = 0,25 (ropa sobre polietileno, real), sale a paso de andar (EN 1176-3:
  tramo de salida; licencia).
- **Guerra de almohadas** (`domain/guerra-almohadas.ts`, `src/s1-castillos.ts`): Rojo, Azul, Amarillo y Verde; cada uno
  guarda su **tesoro** bajo su torre. Junto a tu tesoro: «Empezar la guerra» (5 min). Coges los tesoros ajenos (de otro
  castillo o del suelo) y los dejas en el tuyo; dentro de un castillo ajeno sus defensores te lanzan almohadas y se te
  puede caer. Gana al instante quien tenga todos; si no, quien tenga más al acabar; igualados, empate. Tu equipo es Rojo.

## Pendiente

- Que la gente del santuario juegue también (defensores y asaltantes visibles con almohadas en la mano).
- Elegir equipo (hoy, Rojo: donde están los primeros aposentos).
