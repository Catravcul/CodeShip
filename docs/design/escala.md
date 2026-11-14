# Escala de interiores y maquinaria

Berón: «La maquinaria debe ser grande para poder apreciarse. A tamaño real a través de la cámara se ve pequeña.
¿1,5 veces está bien? ¿Más? ¿Menos?»

**Decisión: 1,5×.** Es una sola constante, `WORLD_SCALE` en `src/core/scale.ts` (`MACHINE_SCALE` es la misma).
`src/core/machine-scale.ts`, el de la estación, la reexporta. Los datos guardan las medidas reales y los
adaptadores las multiplican al dibujar.

## Qué se escala y qué no

- **Se escala:** la planta de la sala (paredes, techo, distancias entre máquinas) y el ancho, el fondo, las
  pantallas y los interruptores de cada máquina.
- **No se escala:** los personajes. El ojo de Doménica va a 1,45 m de pie y a 1,2 m sentada.
- **Tampoco** las alturas y tamaños donde su cuerpo toca la máquina: superficie de trabajo, asiento, mandos de
  mano, barra de pies y asideros. Si se escalaran, el asiento le quedaría grande y la mesa a la altura del pecho.
- La regla de 2 m entre interactuables se comprueba con los datos reales. Dibujada, la distancia es 2 × 1,5 = 3 m.
- La velocidad al caminar va en metros reales, así que cruzar la sala tarda lo mismo.

## Medidas

Se midió en el iPhone 13 (390 × 664 px visibles) en primera persona, con el objetivo de 72° en vertical.
Los números salen de `bridge.measure()` (proyecta cada pantalla, cartel y mando) y se pidieron con `?prueba&escala=N`.

| Escala | Pantalla de consola de pie: distancia al ojo | Texto de pantalla, de pie (px) | Interruptor de palanca, de pie (px) | Tecla (px) | Pantalla del piloto, sentada: distancia al ojo | Texto, sentada (px) | Mesa: distancia y ángulo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | 0,58 m | 12,9 | 29,9 | 20,2 | 0,65 m | 9,7 | 0,66 m, 30° |
| 1,25× | 0,64 m | 14,5 | 37,1 | 25,2 | 0,66 m | 11,8 | 0,76 m, 38° |
| **1,5×** | **0,71 m** | **15,8** | **44,1** | **30,0** | **0,68 m** | **13,8** | **0,87 m, 45°** |
| 2× | 0,87 m | 16,9 | 56,8 | 38,7 | 0,72 m | 17,3 | 1,14 m, 54° |

Las columnas de texto dan la altura de las mayúsculas del texto normal de pantalla. Las de interruptor y tecla
dan su ancho en pantalla.

Referencias:

- **44 px:** el objetivo de toque mínimo de Apple, que usa también la suite de experiencia (`TOUCH_MIN_PX`).
- **0,33–0,71 m del ojo:** el MSIS §9.2.4. Ver [puente.md](puente.md).
- **Unos 16 px:** un texto que se lee bien en el móvil, cerca del cuerpo de 17 pt de Apple.

## Por qué 1,5×

- Es la escala más pequeña en la que los interruptores de una consola miden 44 px vistos desde donde ella está
  y el texto de la pantalla llega a unos 16 px.
- La pantalla sigue al alcance del MSIS (0,71 m).
- A 2×, la pantalla se va a 0,87 m (fuera del alcance de la mano) y la sala mide 12,8 × 16 m. El avatar en
  tercera persona se ve pequeño (`escala-tercera.png`) y la mesa se mira a 54°.
- A 1× y 1,25×, los interruptores no llegan a 44 px y el texto se queda en 13–15 px.

**Lo que no cambia la escala.** Desde lejos, una máquina 1,5 veces más grande que también está 1,5 veces más
lejos se ve igual (`escala-entrada.png`). Lo que ayuda a distinguir las consolas de lejos son los carteles:
crecen hasta 28 px de alto (texto de unos 12 px) y nunca se tapan entre sí.

## Capturas

Cada imagen pone en fila las cuatro escalas, de izquierda a derecha 1×, 1,25×, 1,5× y 2×:

- Desde la escotilla: `docs/screenshots/escala-entrada.png`
- En el puesto de pilotaje, sentada: `docs/screenshots/escala-piloto.png`
- En una consola de sistemas: `docs/screenshots/escala-consola.png`
- En tercera persona, junto a la sonda: `docs/screenshots/escala-tercera.png`

## Dónde se aplica

| Sitio | Escala |
| --- | --- |
| Puente | `WORLD_SCALE` (rama `puente-real`) |
| Estación | `MACHINE_SCALE` (rama `estacion-hangar`, la misma constante) |
| Habitáculo del módulo | 1×: es la cabina del piloto y se ve igual desde el asiento |
| Anillo | 1×: pendiente |

Escalar el habitáculo alrededor del ojo del piloto no cambiaría lo que ve sentado.

## Preguntas abiertas

- ¿Se escalan también el anillo y el habitáculo del módulo, o se quedan a tamaño real?
