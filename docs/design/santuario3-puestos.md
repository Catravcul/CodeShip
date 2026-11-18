# Santuario 3: puestos 1–4 y 7, entrenadoras y vuelos (rama `s3-iniciacion-1`)

La fase 4 de [santuario3-iniciacion.md](santuario3-iniciacion.md) §5.3, con las respuestas de Berón del 2026-11-18 (vuelos con dos
modos, escala para todas las áreas, el muelle fuera de los 300 m). Casos AER-10 a AER-15 en [casos.md](../qa/casos.md); recorrido
PX-46 `s3-iniciacion`.

## Puestos con reto

Cada puesto es un reto de código con pasos reales (`application/stations.ts`). Cada paso bien hecho se ve en el sitio
([reglas.md](reglas.md) §4.2): ella y quien da el reto, con los objetos en las manos o puestos, junto a los muebles reales de la sala
(`data/stages.ts`, `adapters/three/s3-stage.ts`). En «Paso a paso» cada bloque bien puesto se ve al momento; en «Ordenar todo», los
pasos se ven uno tras otro al acertar. Con la hoja abierta solo se ven la hoja y la escena (§4.3); el rótulo del paso sale al cerrarla. La cámara las mira de lado
(las dos caben en la vista estrecha del móvil) y vuelve a ponerse de lado cuando un paso las mueve, salvo si se gira con su
mando; en la cámara hipobárica mira desde la esquina de la escotilla.

| # | Puesto | Pasos (orden) | Pregunta | Se ve | Fuente |
| --- | --- | --- | --- | --- | --- |
| 1 | Tribunal de selección | Solicitud por USAJOBS, requisitos, primera y segunda ronda en Johnson, candidata | ¿Cumple? `master y (años ≥ 3 o horas ≥ 750)` (condicionales) | Sentada ante la mesa: la carpeta, el tribunal escribe, la acreditación en el pecho, el sello | NASA, *Become an astronaut* |
| 2 | Reconocimiento médico | Báscula, tensión sentada, ECG tumbada, tabla de la vista | ¿Qué sale de rango? 148/92 > 140/90 (estatura 62–75 pulgadas, vista corregible a 20/20) | Báscula, manguito en el brazo en la camilla, electrodos tumbada, la tabla en la pared; la doctora va con ella de una a otra | NASA FS-2011-11-057-JSC |
| 3 | Natación y supervivencia | 3 × 25 m, mono y zapatillas, otros 3 × 25 m, 10 min flotando, balsa, izado | ¿Cuántos metros? dos bucles de 3 × 25 m = 150 m | Los largos nadados en la piscina, el mono, flotando, la balsa salvavidas y el arnés con su cable hasta el carril | NASA FS-2011-11-057-JSC; Pensacola (DVIDS 2022) |
| 4 | Cámara hipobárica | Prerrespirar O₂, subir a 25 000 pies, quitarse la máscara, anotar síntomas, ponérsela, bajar | Tiempo de consciencia útil: 3–5 min a 25 000 pies (1–2 a 30 000, 20–30 a 18 000) | Sentada en el banco de la cámara, la máscara puesta, en la mano, mareada con la lista; la entrenadora dentro como observadora | FAA AC 61-107B |
| 7 | Flotabilidad neutra (NBL) | Los pasos del EMU del paseo espacial (`DONNING_STEPS`): LCVG, pantalón, torso rígido, guantes y casco, fugas | Sube 2 kg: los buzos añaden 2 kg de plomo (si baja, espuma) | Se viste en el borde (colores del traje, casco), y en el fondo junto a la maqueta con el lastre en la cintura | NASA, ficha del NBL; Wikipedia NBL |

El puesto 3 tiene su propia máquina en el borde de la NBL («Prueba de natación»); el 7 sigue en «Piscina NBL». Los demás puestos
(5, 6, 8–13) siguen «En construcción». Un puesto superado lo dice su tarjeta (✓ Superado) y queda en la partida (`posts` del estado
del 3).

## Entrenadoras

Personas de Cold Sanctuary cuyo oficio encaja (`data/trainers.ts`, de `Professions.cs` y `docs/personajes`), con su aspecto
atestiguado como figuras de cubos sencillas y su nombre encima. Su jornada es la de `WorkRoster` (desde el 2026-11-05):
entrenamiento 8–9 y 14–15, tareas 9–11, 12–14 y 15–16, comida 11–12, libre desde las 16 (`domain/roster.ts`). Qué puesto cubre cada
una es nuestro (**licencia**):

| Persona | Oficio en Cold Sanctuary | 9–11 y 15–16 | 12–14 |
| --- | --- | --- | --- |
| Karen | Asuntos legales y lenguas | 1 Tribunal | — |
| Julian | Dirección de proyectos | — | 1 Tribunal |
| Linduarda | La doctora de la iniciación | 2 Reconocimiento | 4 Hipobárica |
| Lizmibet | Médica | 4 Hipobárica | 2 Reconocimiento |
| Adaguchi | Submarinismo | 7 NBL | 3 Natación |
| Luciana | Piloto | 3 Natación | 7 NBL |

Entrenando están en el gimnasio; a comer y libres, en el cruce de la isla. Van andando por los caminos (1,4 m/s) y entran a su sitio
por la puerta de la sala, sin atravesar muebles. El reto lo da quien está de turno y ya ha llegado («viene de camino: llega en …»);
si no hay nadie de turno, la Magnate (Cold Sanctuary: «si no hay nadie libre»; se teletransporta) aparece en el puesto. La hora se ve
arriba; una partida nueva empieza a las 9:00 y una hora es un minuto real (`BOARD_DAYS_PER_REAL_S`).

## Vuelos entre islas (§3.6)

El engranaje de la ventana de navegación elige el modo (se guarda en el dispositivo):

- **Por reto** (por defecto): en el helipuerto se programa el vuelo en la hoja (`application/flight-program.ts`): los pasos del
  helicóptero (arrancar, despegue vertical y ascenso a la altura de crucero, rumbo, 280 km/h, aproximación y toma) o de la alfombra, y
  por tramo el tiempo (subir + distancia ÷ velocidad + bajar) o la altura de la alfombra. Con el programa bien, vuela solo y a la
  vista; la barra dice adónde, la distancia y el tiempo (§3.9); la cámara gira.
- **Manual**: los mandos reales del helicóptero en el pad compartido (`RcsPad` con `helicopter`): **cíclico** (adelante, atrás,
  izquierda, derecha), **colectivo** (sube, baja) y **pedales** (morro a izquierda o derecha); cada toque, un paso, y el aparato llega
  con retardo (`domain/hand-flight.ts`). La alfombra los imita a su velocidad. Nada atraviesa nada: el rotor se para contra paredes y
  torres; sobre el mar se queda en el estacionario más bajo (no amara); solo se posa despacio (≤ 1,5 m/s). Posada en el helipuerto
  o andén de una isla que admite el aparato, «Dejar los mandos» la baja allí.

## Escala y muelle

La escala de presentación agranda todas las áreas por igual ([santuario3-escena.md](santuario3-escena.md), «Escala»); el muelle está
en (−230, 210) y cuenta como habitado en la prueba de los 300 m.

## Preguntas abiertas para Berón

1. **Quién cubre cada puesto** es nuestro: Cold Sanctuary da los oficios, no estos turnos. ¿Vale el reparto de la tabla?
2. **Andando a escala de tiempo.** Una hora de juego es un minuto real y ellas andan a 1,4 m/s: entre la comida y la tarde tardan
   un rato en volver a su puesto (la tarjeta dice cuánto). ¿Prefiere que vayan más deprisa o que salgan antes?
3. **La Magnate** cubre fuera del horario de tareas (entrenamiento, comida, libre). ¿Debe la iniciación pausarse a esas horas en
   vez de darlo ella?
