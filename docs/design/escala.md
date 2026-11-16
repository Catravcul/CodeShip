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

Berón (2026-11-16): «La regla de tamaño y de espacio vale para todas las zonas, así que hay que actualizar el anillo y
el habitáculo». Ahora todo se dibuja a 1,5 y la regla de 2 m se comprueba tal como se juega, sin excepciones.

| Sitio | Escala | Cómo se dibuja |
| --- | --- | --- |
| Puente | `WORLD_SCALE` | El modelo se construye a escala (`buildBridge(k)`) y `WalkRoom` multiplica la planta |
| Estación | `MACHINE_SCALE` (la misma constante) | `scaleInteriorPlan` escala el plano antes de dibujarlo y de moverse en él |
| Anillo y cubierta de cultivo | `WORLD_SCALE` | Cámara de planta (`adapters/three/interior/plan-camera.ts`), abajo |
| Habitáculo del módulo | `WORLD_SCALE` | `WalkRoom` con `scale`; la cápsula, en un grupo estirado (1,5; 1; 1,5), abajo |
| Cubo, radio y espina | Tubos de 5,5 m (ya a tamaño de juego) | Las máquinas de la espina (guantera, impresora 3D) miden 1,5 veces más a lo largo de la pared |

### El anillo: una cámara de planta

El anillo tiene mucho código en metros reales: la caminata, los puestos, por dónde pasean gatos, perros y gallinas,
el encuadre de cada paso de una tarea y el ascensor del radio. En vez de reescribirlo, la cámara dibuja la sala
1,5 veces más grande en planta. Con el ojo en el punto real *p*, girado *R*, la vista es *R⁻¹ · S · T(−p)*, con
*S* = (1,5; 1; 1,5). Es como si la sala se hubiera construido 1,5 veces más grande con el ojo en *S·p*.

- La posición del mundo de la cámara sigue siendo la real. La vista, que usan el renderizador,
  `Vector3.project` (los avisos de ambiente) y el recorte, es la dibujada.
- Las alturas no cambian: el ojo va a 1,6 m y las encimeras, las camas y los asideros siguen a la altura del
  cuerpo. El techo y las paredes sí suben (2,6 → 3,9 m), igual que en el puente.
- Lo que tiene que quedar a tamaño real (Doménica, los gatos, los perros, las gallinas, las plantas y la figura del
  yoga) lleva la escala inversa (1/1,5; 1; 1/1,5). Como solo giran sobre la vertical, se dibujan a tamaño real
  donde están.
- Las pantallas de las máquinas suben 1,5 en alto (en ancho ya las agranda la planta). Los carteles crecen 1,5,
  como los del puente. El alcance de las luces se multiplica por 1,5 (`scaleLights`).
- Fuera del anillo (radio, cubo y espina) la cámara dibuja tal cual. Esas zonas están en las mismas coordenadas
  reales que el anillo: el hueco del ascensor cae sobre su columna.
- Andar va en metros reales, así que cruzar el módulo tarda lo mismo. La sala se ve de 6 × 27 m.

### El habitáculo del módulo

La cápsula de `cockpit.ts` va en un grupo estirado (1,5; 1; 1,5). Los asientos, los reposabrazos, las correas y
los mandos de mano llevan `userData.body` y vuelven a su tamaño real. Los rótulos pequeños de la cápsula
también se quedan a tamaño real: en una cabina tan estrecha, uno 1,5 veces mayor tapa la vista. El techo se
queda a 1,7 m (a la altura del cuerpo) y la pantalla de la consola de la mente mide 1,5 veces más. A escala
1,5, sus cinco máquinas no cabían a 2 m, así que **la cabina se alargó 1,93 m hacia popa**. Las cuentas están en
[habitaculo.md](habitaculo.md#tamaño-más-grande-que-una-cápsula-real). El piloto sigue viendo la cápsula real
desde el asiento al volar.

### La regla de 2 m, tal como se juega

`src/modules/habitat/data/spacing.test.ts` comprueba cada zona con los datos reales multiplicados por su escala de
dibujo (`asPlayed` en `src/core/spacing.ts`): anillo, puente y habitáculo a 1,5, estación con su plano a 1,5, y cubo
y espina a su tamaño de juego. No hay excepciones:

- **El habitáculo** dejó de estar exento: se alargó.
- **Los bastidores contiguos de la estación** ya no hacían falta como excepción: con el plano a 1,5, sus aparatos y
  sus puntos de agarre quedan a 2 m o más.
- **Las dos caras de una escotilla** son una sola puerta, que se usa desde cualquiera de los dos lados: cuentan como
  un interactuable.

Capturas (iPhone 13, a la izquierda 1× y a la derecha 1,5×): `docs/screenshots/escala-anillo.png` (el módulo
desde el ascensor) y `docs/screenshots/escala-habitaculo.png` (el habitáculo en 3ª persona, junto a la escotilla EVA).

Medido en un iPhone 13, en ninguna zona se solapan dos tarjetas de acción. Lo comprueban los recorridos PX-01,
PX-02, PX-10, PX-11 y PX-13: una sola tarjeta junto a cada máquina, sin botones solapados.

## Preguntas abiertas

- En el anillo, los utensilios de los pasos de cocina y los peces del acuario se ven 1,5 veces más anchos (son
  piezas pequeñas dentro de una máquina). ¿Se dejan así o se pasan a tamaño real como los animales?
