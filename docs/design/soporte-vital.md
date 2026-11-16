# Soporte vital real

Rama `eclss-real`, fase 1, punto 2 del plan de [naves-reales.md](naves-reales.md) §3. Las fuentes y las cifras están en [research/soporte-vital.md](../research/soporte-vital.md). Los casos de QA son SV-01…SV-11 y el recorrido es PX-30 (en [qa/casos.md](../qa/casos.md)).

## Qué es

El soporte vital de la ISS, máquina por máquina, como algo que se ve, se lee y se repara a bordo:

- **OGA**: hace O₂ con agua.
- **Sabatier**: recupera agua del CO₂.
- **CDRA**: quita el CO₂.
- **TCCS**: quita los contaminantes traza.
- **UPA, WPA y BPA**: devuelven el 98 % del agua.
- **Control térmico**: lleva el calor a los radiadores.
- **Incendios**: detectores y extintores.
- **Galería**: agua caliente y calentador para la comida envasada.

Hay además un **refugio de agua** contra las tormentas solares y la **cuenta del reabastecimiento**. Todo es **real**. Lo único inventado son los ritmos de avería, la masa de algunos repuestos y algunos tamaños, y están marcados (research §6).

## Dominio (sin vehículo)

`src/modules/life-support` no sabe en qué nave está. El anfitrión le da un `LifeSupportConfig`: personas, volumen de aire libre, agua, comida, tanques de O₂ y N₂, y repuestos. La misma clase sirve para Starship y para la estación tipo ISS.

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Balance por persona | `data/crew-balance.ts` | MetMan + `CREW_DAILY` (un test comprueba que coinciden) |
| Máquinas y averías | `data/eclss-machines.ts` | Ritmo, potencia, masa, refrigeración, modos de fallo con repuesto, procedimiento y valor real |
| Bastidores | `ECLSS_RACKS` (mismo archivo) | Lo que se coloca: tipo, tamaño **real** y máquinas dentro |
| Simulación | `domain/life-support.ts` | Gases por masa (gas ideal, 22 °C), tanques de orina y de agua sucia, OGA, CDRA, Sabatier, UPA, BPA, WPA, fugas, TCCS, calor y energía |
| Tripulación | `domain/crew-effects.ts` | Síntomas con umbrales de la NASA; un intento menos en los retos mientras se encuentra mal |
| Reabastecimiento | `domain/resupply.ts` | Comida, agua perdida, agua para el O₂, fugas y repuestos por persona y periodo |
| Refugio | `domain/radiation-shelter.ts` | Puntos de RadWorks, agua necesaria y protección con el agua de a bordo |
| Tareas | `application/eclss-chores.ts` | Cada avería activa es una tarea `soporte-vital` (procedimiento en orden y un valor real) |
| Anfitrión estación | `data/hosts.ts` | Doménica sola, 388 m³, 1200 L, medio año de comida, un repuesto de cada |
| Anfitrión Starship | `mothership/data/starship.ts` (`STARSHIP_LIFE_SUPPORT`) | Doménica sola, 614 m³; agua, comida, tanques y repuestos como la estación. Bastidores con `eclssFixtures` ([nodriza-starship.md](nodriza-starship.md)) |

### Modelo (lo esencial)

- **CO₂.** Lo que quita el CDRA crece con la ppCO₂: 1,6 kg/día por mmHg, medido. Con una persona en 388 m³ el CO₂ se queda en **0,7 mmHg**. Si los lechos de zeolita quedan al 5 %, pasa de **5,3 mmHg en una semana** de a bordo (una semana son 2,8 h reales). Reparado, vuelve bajo 3 mmHg en un día.
- **O₂.** El OGA devuelve el O₂ a 21,3 kPa con su ritmo máximo y el agua que haya. Si no puede, el control de presión tira de los tanques. El N₂ repone las fugas.
- **Agua.** Lo usado va un 37 % a orina y el resto a agua sucia. El UPA destila el 87 % y el BPA sube la orina al 98 %. El WPA trata lo demás. El Sabatier devuelve agua con el H₂ del OGA.
- **Comida.** 2,39 kg envasados al día son **dos comidas de 1,195 kg**, como el modelo de hambre (dos comidas al día, `CREW_TUNING.mealShareOfDay`). La ración de la ISS es para el astronauta de 82 kg de MetMan (≈ 3050 kcal). Doménica necesita ≈ 2280 kcal (JSC-67378), así que la cuenta va con margen. La despensa del hábitat y la comida envasada del soporte vital son reservas distintas (decisión 4).
- **Refrigeración.** Sin los lazos de refrigeración (ITCS), las máquinas refrigeradas se paran y la cabina se calienta 0,5 °C por hora (valor de juego).
- **Averías al azar.** Salen de los modos reales con un tiempo medio de juego y nunca en los dos primeros días: así no aparecen en medio de otros recorridos.

## Bastidores: interfaz para colocarlos (para `base-nodriza-real` y `estacion-real`)

**Datos.** `ECLSS_RACKS` da, para cada `RackKind`:
- su tamaño **real** en metros (ISPR: 1,05 de ancho × 2,0 de alto × 0,86 de fondo; `wrs` ocupa dos bahías);
- cuántas bahías ISPR ocupa;
- las máquinas que lleva;
- su texto y su fuente.

| Tipo | Contenido | Bahías | Dónde va en la ISS |
| --- | --- | --- | --- |
| `ar` | CDRA + TCCS | 1 | Destiny y Tranquility |
| `ogs` | OGA + Sabatier | 1 | Tranquility |
| `wrs` | UPA + WPA + BPA | 2 | Tranquility (el BPA va en un EXPRESS al lado: aquí juntos, «distribución nuestra») |
| `itcs` | bombas de los lazos | 1 | En los bastidores de cada módulo |
| `incendios` | extintor, mascarilla y detector | 0 (pared) | En cada módulo |
| `galeria` | agua caliente y calentador | 0 | Unity |
| `refugio` | camarote forrado de bolsas de agua | 1 | (no existe en la ISS: propuesta de RadWorks) |
| `consola` | portátil de soporte vital | 0 | — |

**Fixtures.** Para cada bastidor:
- `eclssFixtures(volumen, colocaciones)` (`src/modules/station/data/eclss-placement.ts`) da los fixtures con la acción `{ kind: "soporte-vital", rack }` y el id `sv-<tipo>`.
- Las colocaciones son `{ rack, side: 0 | 1 | "techo", along }`, en metros reales desde el centro del módulo.

**Modelo 3D.** `src/adapters/three/eclss-racks.ts`:
- `eclssRackModel(tipo, { scale, size, fixtureId })` dibuja a **tamaño real × la escala que pase el anfitrión**. Por defecto lee `WORLD_SCALE` de `src/core/scale.ts` en el momento de la llamada: no lleva ningún 1,5 dentro, así que el ajuste «Escala de interiores» lo cambiará sin tocar el kit.
- Origen en el centro del frente, +z hacia el pasillo. Se coloca con `mountOnWall(modelo, frente, normalDelPasillo)`.
- `setState(estado, piezaRota)` enciende la luz y pone en rojo la pieza.
- `repairVisual(pieza, pasos)` es el `StepVisual` de la reparación: una luz por paso encima de la pieza, que destella al cambiarla.
- `focus(pieza)` da el punto que la cámara debe encuadrar.
- `tick(dt)` se llama en cada fotograma.

**Lo que tiene que hacer el anfitrión:**
- Poner los fixtures `sv-*` a 2 m entre sí. El test de separación de la estación los cuenta.
- Dar al juego `actions`/`act`/`readout`/`rackState` (en la estación, `StationInteriorDeps`).
- Pasar `frame`/`unframe` para que la reparación se vea encima de la hoja.

**En la estación (la ISS de `estacion-real`).** Los bastidores van donde los tiene la ISS:
- Tranquility (Nodo 3): agua en la pared de proa, oxígeno en la de popa, aire en el techo y el puesto de incendios en el techo.
- Destiny: las bombas de los lazos de refrigeración (ITCS) en la pared de babor y el portátil de soporte vital en el techo.

En la Starship, `base-nodriza-real` los pone en su distribución con su propio `LifeSupportConfig` (614 m³).

**Quién está a bordo.** La estación y la Starship van con el mismo reloj. Cada una cuenta solo la tripulación que lleva dentro: Doménica está en una sola, o en el módulo (`crewIn` en `main.ts`). Un vehículo vacío sigue con sus máquinas en marcha, pierde aire por el casco y puede tener averías, pero nadie respira, come ni bebe en él. Los síntomas solo salen del aire y el agua del vehículo donde está ella (SV-12, SV-13).

## En el juego

- **Lecturas.** Siguen el estilo HUD: ppO₂, ppCO₂ (ámbar por encima de 3 mmHg, **alarma roja desde 5,3 mmHg**, con flecha de tendencia), agua, días de comida y energía.
  - Solo salen en la tarjeta de un bastidor mientras ella lo mira, o en la consola, que además da las máquinas, la recuperación de agua, la temperatura, el calor, los tanques, el refugio y la cuenta por año.
  - Fuera de las máquinas no hay nada en el HUD.
- **Avisos.** Hay un aviso al saltar la alarma de CO₂, al averiarse algo y cuando a Doménica le aparecen síntomas (dolor de cabeza, cansancio, hipoxia, deshidratación, calor).
- **Tareas.**
  - Cada avería es una tarea de la lista global, en el grupo Estación, con «Ir» hasta su bastidor.
  - En la tarjeta del bastidor, el botón dice la reparación. Sin repuesto, está desactivado y dice por qué.
  - El reto ordena el procedimiento real y pide un valor real (el medio ciclo de 90 min del CDRA, las 9000 lb del lecho del WPA…).
- **Pasos visibles.** Mientras el reto está abierto:
  - la cámara se aparta al pasillo y encuadra la pieza encima de la hoja;
  - cada bloque bien puesto enciende su luz;
  - al terminar, la pieza deja de estar en rojo y se gasta el repuesto.
- **Salud.** Con síntomas, el reto tiene un intento menos.

## Decisiones abiertas (para Berón)

1. **Alarma de CO₂.** El diseño pide 5,3 mmHg, el antiguo límite de 180 días de la ISS. La norma actual (NASA-STD-3001) pone 3 mmHg en 1 h, que en el juego es el aviso ámbar. ¿Mantenemos la alarma en 5,3 o la bajamos a 3–4?
2. **Ritmo de averías.** Ahora hay una avería cada 200–700 días de a bordo por cada modo (≈ 1 cada 2–3 semanas de a bordo en total). ¿Más, menos, o solo provocadas por sucesos?
3. **Tripulación.** En la estación está Doménica sola: el CO₂ sube despacio. Con la tripulación de la nodriza (¿cuatro?) todo va cuatro veces más deprisa.
4. **Comida.** Medio año de comida envasada en la estación. El huerto real (Veggie, APH) es la fase 2: ¿cuánta comida resta?
5. **Masas y potencias sin publicar** (research §6): ¿sustituirlas cuando tengamos el BVAD?
