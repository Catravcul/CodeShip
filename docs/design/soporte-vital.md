# Soporte vital real

Rama `eclss-real`, fase 1, punto 2 del plan de [naves-reales.md](naves-reales.md) §3. Las fuentes y las cifras están en [research/soporte-vital.md](../research/soporte-vital.md). Los casos de QA son SV-01…SV-17 y el recorrido es PX-30 (en [qa/casos.md](../qa/casos.md)).

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

Hay además un **refugio de agua** contra las tormentas solares y la **cuenta del reabastecimiento**. Todo es **real**. Lo inventado son algunas vidas de pieza, la masa de algunos repuestos y algunos tamaños, y están marcados (research §6). Las averías **no son al azar**: cada una tiene su causa y se ve venir («Averías con causa»). La cocina gasta la **despensa**, que llenan los cargueros reales («Despensa»).

## Dominio (sin vehículo)

`src/modules/life-support` no sabe en qué nave está. El anfitrión le da un `LifeSupportConfig`: personas, volumen de aire libre, agua, comida, tanques de O₂ y N₂, y repuestos. La misma clase sirve para Starship y para la estación tipo ISS.

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Balance por persona | `data/crew-balance.ts` | MetMan + `CREW_DAILY` (un test comprueba que coinciden) |
| Máquinas y averías | `data/eclss-machines.ts` | Ritmo, potencia, masa, refrigeración, modos de fallo con repuesto, procedimiento, valor real y **causa con su desgaste** (`wear`) |
| Bastidores | `ECLSS_RACKS` (mismo archivo) | Lo que se coloca: tipo, tamaño **real** y máquinas dentro |
| Simulación | `domain/life-support.ts` | Gases por masa (gas ideal, 22 °C), tanques de orina y de agua sucia, OGA, CDRA, Sabatier, UPA, BPA, WPA, fugas, TCCS, calor y energía |
| Tripulación | `domain/crew-effects.ts` | Síntomas con umbrales de la NASA; un intento menos en los retos mientras se encuentra mal |
| Reabastecimiento | `domain/resupply.ts` | Comida, agua perdida, agua para el O₂, fugas y repuestos por persona y periodo |
| Refugio | `domain/radiation-shelter.ts` | Puntos de RadWorks, agua necesaria y protección con el agua de a bordo |
| Tareas | `application/eclss-chores.ts` | Cada avería activa es una tarea `soporte-vital` (procedimiento en orden y un valor real); cada desgaste al 80 %, un **preventivo** |
| Cargueros | `data/cargo-vehicles.ts`, `application/cargo-resupply.ts` | Dragon y Cygnus reales: lo que llevan presurizado, su tránsito y lo que traen (`resupply`), por la línea de entregas de las importaciones |
| Anfitrión estación | `data/hosts.ts` | Doménica sola, 388 m³, 1200 L, dos meses de comida en la despensa (lo que dejó el último carguero), un repuesto de cada |
| Anfitrión Starship | `mothership/data/starship.ts` (`STARSHIP_LIFE_SUPPORT`) | Doménica sola, 614 m³; agua, comida, tanques y repuestos como la estación. Bastidores con `eclssFixtures` ([nodriza-starship.md](nodriza-starship.md)) |

### Modelo (lo esencial)

- **CO₂.** Lo que quita el CDRA crece con la ppCO₂: 1,6 kg/día por mmHg, medido. Con una persona en 388 m³ el CO₂ se queda en **0,7 mmHg**. Si los lechos de zeolita quedan al 5 %, pasa de **5,3 mmHg en una semana** de a bordo (una semana son 2,8 h reales). Reparado, vuelve bajo 3 mmHg en un día.
- **O₂.** El OGA devuelve el O₂ a 21,3 kPa con su ritmo máximo y el agua que haya. Si no puede, el control de presión tira de los tanques. El N₂ repone las fugas.
- **Agua.** Lo usado va un 37 % a orina y el resto a agua sucia. El UPA destila el 87 % y el BPA sube la orina al 98 %. El WPA trata lo demás. El Sabatier devuelve agua con el H₂ del OGA.
- **Comida.** 2,39 kg envasados al día son **dos comidas de 1,195 kg**, como el modelo de hambre (dos comidas al día, `CREW_TUNING.mealShareOfDay`). La ración de la ISS es para el astronauta de 82 kg de MetMan (≈ 3050 kcal). Doménica necesita ≈ 2280 kcal (JSC-67378), así que la cuenta va con margen. La comida envasada del soporte vital **es la despensa de la cocina** («Despensa»).
- **Refrigeración.** Sin los lazos de refrigeración (ITCS), las máquinas refrigeradas se paran y la cabina se calienta 0,5 °C por hora (valor de juego).
- **Averías.** Ya no hay dados: cada modo de fallo se gasta con lo que hace su máquina y falla al llegar a su vida («Averías con causa»).

## Averías con causa

Decisión de Berón (2026-11-17): «las averías supongo que deben tener un motivo, antes que ser random». Cada modo de fallo de `ECLSS_MACHINES` lleva un `wear` con:

- **la causa**, como la cuentan las fuentes, con su enlace;
- **el motor** que la acumula mientras la máquina funciona;
- **la vida**: al llegar a ella, falla. Siempre igual: dos partidas iguales dan las mismas averías el mismo día;
- **la etiqueta** de esa cifra: `real` o `estimacion` (con su nota);
- **el desgaste al empezar** (valor de juego: las máquinas de la ISS no son nuevas; ninguna falla en los primeros días);
- **el preventivo**: su procedimiento, si gasta repuesto y dónde deja el desgaste.

| Modo | Causa (fuente) | Motor | Vida | Etiqueta |
| --- | --- | --- | --- | --- |
| OGA: bomba bloqueada | El niquelado químico de los conectores se degrada y precipita fosfato de níquel en los engranajes (ICES-2024-141) | horas de marcha | 9600 h | estimación |
| OGA: domo de H₂ | Pasivado pobre: el vástago del regulador se corroe (ICES-2024-141) | horas de marcha | 12 000 h | estimación |
| Sabatier: compresor | Arranca en cada medio ciclo del CDRA; la humedad del CDRA en el acumulador lo bloquea (NSF 2013) | medios ciclos del CDRA | 9600 | estimación |
| CDRA: lechos | Cada medio ciclo calienta y enfría la zeolita: se rompe en polvo y, si un sello cede, sale del lecho (NTRS 20050210002) | medios ciclos (16 al día) | 4800 | estimación |
| CDRA: válvula selectora | Se mueve en cada medio ciclo; el polvo de los lechos la atasca (NSF 2013, NTRS 20050210002). **Se gasta más deprisa cuanto más polvo tienen los lechos** | medios ciclos × (1 + desgaste de los lechos) | 8000 | estimación |
| TCCS: LiOH | La humedad apelmaza el LiOH de la entrada (NTRS 20070019823) | m³ de aire (15,3 m³/h) | 257 000 m³ | estimación |
| UPA: destilación | Precipita sulfato de calcio al concentrar la salmuera; el pretratado ácido degrada el sensor de vacío (ICES-2022-098) | kg de orina | 1500 kg | estimación |
| UPA: PCPA | Se gasta el engranaje planetario de su motor (ICES-2022-098) | horas destilando | **2300 h** | **real** |
| WPA: lecho de multifiltración | Las resinas se saturan: ruptura iónica (ICES-2022-098) | kg de agua tratada | **4082 kg (9000 lb)** | **real** |
| WPA: separador | El agua se cuela al lado del aire; la ISS no ha dado con la causa raíz (ICES-2022-098) | horas de marcha | 12 000 h | estimación |
| BPA: bolsa | Las sales de la salmuera seca la llenan | kg de salmuera | 36 kg | estimación |
| ITCS: bomba | Cojinetes gastados y gas en el lazo (NTRS 20040086485) | horas de marcha | 14 400 h | estimación |
| Incendios: detector | Polvo y pelusa en la cámara óptica | horas de marcha | 12 000 h | estimación |

Lo que dice el modelo:

- **Lo que va con el uso depende de la tripulación.** Con Doménica sola el UPA destila 1,4 kg de orina al día y su conjunto de destilación dura años; con cuatro personas, cuatro veces menos. Lo que va por horas (bombas, detectores) se gasta igual con la nave vacía.
- **Una máquina parada no se gasta.** Una pieza nueva (reparación) empieza de cero.
- **Preventivo.** Desde el **80 %** de su vida (valor de juego: la ISS cambia piezas por la tendencia de sus datos, ICES-2024-141) hay una tarea «Preventivo …» en la lista global y en el bastidor, con retos como la reparación. Hecho a tiempo, la máquina no se para:
  - limpiar los lechos del CDRA (como la limpieza de 2023) no gasta repuesto y los deja al 30 %;
  - limpiar el detector de humo no gasta repuesto;
  - lo demás cambia la pieza: gasta el repuesto y la deja a cero.
- **Saltarse el mantenimiento cuesta.** Los lechos con polvo gastan antes la válvula selectora.
- **Se ve venir.** En la tarjeta del bastidor, cada máquina dice su desgaste mayor y en cuántos días falla al ritmo de ahora, y abajo la causa con la cuenta («3613 de 4800 medios ciclos»). El bastidor se pone ámbar cuando hay un preventivo pendiente. El aviso al averiarse dice la causa.
- **Repuestos.** `resupply` cuenta los que tocan en el periodo con la vida de cada modo y lo que gasta esa tripulación al día.

Con Doménica sola en la estación (tests SV-15): el primer preventivo (lechos del CDRA) llega hacia el día 15 y su avería, si no se hace, el 75; después, la bolsa del BPA (día 80/119), la válvula del CDRA (105/155), la PCPA (124/247) y la bomba del OGA (200/280).

## Despensa

Decisión de Berón (2026-11-17): «se gasta despensa; al principio se llena con importaciones hasta que podamos ir creando los módulos de autosuficiencia».

- **La despensa es la comida envasada del soporte vital** de cada vehículo: la estación y la Starship tienen la suya.
- **La cocina cocina de ella** (`Pantry` en `station-crew.ts`, `LifeSupportGame.pantry`). Con la nave real se cocinan los platos de la ISS (`kitchen/data/iss-food.ts`): cada plato saca **una comida** (1,195 kg) de la despensa. Lo que ya salió para un plato se come antes de volver a tocar la despensa, así que no se gasta dos veces. Sin una comida en la despensa no hay platos.
- **La tarjeta de la cocina** da la despensa en kg y los días que quedan (ámbar por debajo de 45 días, rojo por debajo de 14) y el carguero que viene.
- **Al principio, importaciones.** La estación empieza con dos meses (lo que dejó el último carguero, valor de juego). En la cocina de Unity se piden los cargueros reales, uno a la vez (`cargo-vehicles.ts`):

  | Vehículo | Presurizado | Tránsito | Llega |
  | --- | --- | --- | --- |
  | Dragon de carga | 2507 kg | 18 h (CRS-28) | se acopla sola en el IDA de Harmony |
  | Cygnus | 3749 kg (NG-19) | 60 h (NG-19) | Canadarm2 la atraca en el CBM de nadir de Unity |

  Cada uno trae la cuenta de `resupply()` para 180 días (valor de juego): comida, el agua que pierde el lazo y la del OGA, O₂ y N₂ de las fugas y los repuestos (20 kg cada uno, estimación). Si la tripulación es grande, trae los días que caben. Vuela por la `DeliveryLine` de las importaciones (fuente `carguero:<id>`) con el reloj de a bordo y, al llegar, descarga en el soporte vital.
- **La Starship** se carga en la estación: «Víveres para la nodriza», con la nave atracada, pasa la mitad de la despensa de la estación a la suya.
- **Autosuficiencia.** Solo entra lo real: Veggie y APH (lechuga, mizuna; [estacion.md](estacion.md)), que dan verdura fresca pero no una dieta. Granjas, carne cultivada y demás módulos siguen en el backlog ([pendientes.md](../pendientes.md)).

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

**Quién está a bordo.** La estación y la Starship van con el mismo reloj. Cada una cuenta solo la tripulación que lleva dentro: Doménica está en una sola, o en el módulo (`crewIn` en `main.ts`). Un vehículo vacío sigue con sus máquinas en marcha, pierde aire por el casco y puede tener averías, pero nadie respira, come ni bebe en él. Los síntomas solo salen del aire y el agua del vehículo donde está ella (SV-12, SV-13). El módulo tiene su propio soporte vital, el ECS de circuito abierto del LM: O₂, agua del sublimador, cartuchos de LiOH que se cambian a mano y baterías (SV-14, [modulo-lunar-juventas.md](modulo-lunar-juventas.md)).

## En el juego

- **Lecturas.** Siguen el estilo HUD: ppO₂, ppCO₂ (ámbar por encima de 3 mmHg, **alarma roja desde 5,3 mmHg**, con flecha de tendencia), agua, días de comida y energía. Cada máquina, con su desgaste mayor y los días que le quedan.
  - Solo salen en la tarjeta de un bastidor mientras ella lo mira, o en la consola, que además da las máquinas, la recuperación de agua, la temperatura, el calor, los tanques, el refugio y la cuenta por año.
  - Fuera de las máquinas no hay nada en el HUD.
- **Avisos.** Hay un aviso al saltar la alarma de CO₂, al averiarse algo (con su causa), al pedir un preventivo, al lanzar y al llegar un carguero, y cuando a Doménica le aparecen síntomas (dolor de cabeza, cansancio, hipoxia, deshidratación, calor).
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

1. ~~**Alarma de CO₂.**~~ Decidido (2026-11-17): se queda en 5,3 mmHg; 3 mmHg es el aviso ámbar.
2. ~~**Ritmo de averías.**~~ Decidido (2026-11-17): averías con causa, sin azar («Averías con causa»). Quedan abiertas las vidas marcadas como estimación (sustituirlas cuando haya cifras publicadas) y el umbral del preventivo (80 %).
3. **Tripulación.** En la estación está Doménica sola: el CO₂ sube despacio. Con la tripulación de la nodriza (¿cuatro?) todo va cuatro veces más deprisa.
4. **Comida.** Decidido (2026-11-17): la despensa se gasta y la llenan los cargueros («Despensa»). Abierto: ¿los cargueros cuestan créditos del monedero de las importaciones? Ahora son gratis. ¿Cuánto resta Veggie cuando entre (fase 2)?
5. **Masas y potencias sin publicar** (research §6): ¿sustituirlas cuando tengamos el BVAD?
