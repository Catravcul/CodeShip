# Bahía de la nave

Berón preguntó dónde se personaliza la nave. La respuesta es una **segunda estación**, la bahía de la nave (puesto de ingeniería). Muestra la nave desde fuera y cambia en cuanto se monta una pieza. En la misma pantalla se ve qué piezas hay que revisar y qué recursos faltan.

## Cómo se llega

- **Desde la cabina:** botón **Bahía de la nave** en la barra de vuelo, o la tecla **B**.
- **Desde el módulo habitable:** por la escotilla con marco ámbar de la pared izquierda, entre la enfermería y la esterilla de yoga. Al acercarse aparece **Entrar en la bahía de la nave**.
- **Volver** (o Esc) devuelve a donde estabas. Mientras estás en la bahía, la nave sigue a la deriva sin órdenes, igual que con el interior abierto.

## Qué se ve

- **La nave por fuera** con una cámara que orbita. Se mueve arrastrando la pantalla, con el mando **Orbitar** o con las flechas, y la rueda acerca o aleja. Al tocar una pieza, la cámara gira hasta verla de tres cuartos y la recuadra en cian.
- **Las piezas que piden atención laten en 3D**: naranja si es un aviso, rojo si es crítico. Las máquinas del soporte vital, la cubierta de cultivo y la bodega están dentro del casco. Por eso salen como **balizas** en el lomo de la nave, una por sistema.
- **El panel** va a la derecha en horizontal y abajo en vertical. Arriba están las piezas que **necesitan revisión**, de más a menos urgente, y debajo el resto. Cada fila lleva un punto de color, su barra de estado o de nivel y el primer problema.
- **La ficha de una pieza** reúne su estado, sus problemas, sus datos reales con enlace a la fuente y las **acciones**. Cada acción es una cadena de retos de código que se abre en la hoja de retos (`DuelView`), con la nave visible encima.

| Pieza | Estado que se lee | Avisa cuando… | Acciones |
| --- | --- | --- | --- |
| Casco | `Ship.hullIntegrity` | hay cualquier daño; es crítico por debajo del 50 % | Reparar la nave (reto de la mente de la nave) |
| Motor principal | propelente de su tanque, Δv que queda | queda menos de ¼ de su propelente; es crítico si no queda nada | Cambiar el motor |
| RCS | número de propulsores, modelo, aceleración al avanzar | queda menos de ¼ de hidracina | Cambiar el modelo de RCS |
| Tanques | nivel, capacidad, densidad y volumen | queda menos de ¼, está vacío o **ningún propulsor lo usa** (masa muerta) | Cambiar el tamaño |
| Fuente de energía, batería, escudo MMOD, sistemas fijos | balance de energía a la distancia de Bennu, autonomía, diámetro crítico de escombros | el balance es negativo o la batería no aguanta una salida | Cambiar la pieza (ver `componentes.md`) |
| Energía auxiliar y blindaje de la nodriza | kW auxiliares, propulsores que encienden, dosis anual | el límite de carrera llega en menos de 2 años | Cambiar la pieza (ver `componentes.md`) |
| Máquinas del soporte vital | `Machine.condition` | están por debajo del 80 % (desgaste); son críticas si están averiadas | Reparar la máquina |
| Cubierta de cultivo | bancales, área, autosuficiencia | la autosuficiencia baja del 100 %, o un bancal está por debajo del 70 % o se ha perdido | Las tareas de sus bancales |
| Bodega y despensa | pienso de gatos y de gallinas, medio de cultivo | queda menos de ¼ de lo que se llevó al salir; es crítico si no queda nada | — (se repone con recursos, pendiente) |

Los umbrales son **ajuste de juego** y están en `ATTENTION_TUNING` (`modules/ship-bay/domain/attention.ts`).

## La maqueta exterior refleja el diseño

`ShipModel` (`src/adapters/three/ship-model.ts`) ya no es un dibujo fijo: se construye a partir de `ShipDesign` y se rehace al cambiar una pieza, tanto en la bahía como en la cámara exterior de la cabina.

- **Motor principal:** su forma depende del modelo real. Un bipropelente MMH/NTO como el R-4D lleva una tobera oscura larga y una llama visible. Un monopropelente de hidracina como el MR-104H lleva una cámara de catalizador con calentador, una tobera corta y un escape casi transparente. El tamaño crece con la raíz del empuje.
- **RCS:** hay una tobera por propulsor del diseño (24), en el punto y con la dirección que da `buildRcsLayout`. El tamaño de cada tobera depende de su empuje: el MR-111G de 4 N se ve pequeño y el MR-107T de 110 N, grande. Las plumas se encienden con la misma regla que `Ship.fire`, así que ahora también se ven al girar. Los soportes del centro de las caras de proa y popa se dibujan un poco desplazados para que no tapen el morro ni el motor.
- **Tanques:** son esferas cuyo volumen sale de dividir la capacidad entre la densidad real del propelente. La hidracina tiene 1021 kg/m³. El MMH/NTO va en dos esferas, una de combustible y otra de oxidante, con la proporción de mezcla 1,65 (valor de juego). Un tanque de 300 kg se ve más grande que uno de 180 kg.

## Cambiar una pieza

El reto se **genera a partir del cambio real** (`swapChore` en `chores/application/catalog.ts`), como proponía [vida-a-bordo.md](vida-a-bordo.md#la-mente-de-la-nave):

1. **Completar**: la línea cambiada del código de la nave aparece como un diff (`− motor = R-4D(…)` / `+ motor = MR-104H(empuje ___ N, …)`) y hay que poner el valor real nuevo.
2. **Predecir** el Δv de la nave nueva con los tanques llenos usando Tsiolkovsky (`dv = isp · g0 · ln(m0 / mf)`). Las opciones incorrectas salen de errores típicos: olvidar `g0` o cambiar el logaritmo por una resta.
3. **Ordenar** el montaje: cerrar válvulas, purgar con helio, desmontar, montar, comprobar fugas y probar o presurizar.

Al terminar, `Habitat` aplica `withPart` al diseño y llama a `Ship.refit`. La masa, la inercia, el empuje y el Δv cambian de verdad. El propelente que no cabe en un tanque más pequeño se ventea. Si fallas, la pieza vieja sigue montada.

Piezas en el almacén (`ship/data/parts.ts`):

| Hueco | Pieza | Datos | Fuente |
| --- | --- | --- | --- |
| Motor | R-4D (de serie) | 490 N, Isp 312 s, 3,6 kg, MMH/NTO | [Wikipedia](https://en.wikipedia.org/wiki/R-4D) |
| Motor | MR-104H | clase de 510 N (201–554 N), Isp 223–237 s, 2,4 kg, hidracina | [SatCatalog](https://satcatalog.com/component/mr-104h-510n/) |
| RCS | MR-106L (de serie) | 22 N (10–34 N), Isp 228–235 s, 0,59 kg | [SatCatalog](https://satcatalog.com/component/mr-106l-22n) |
| RCS | MR-111G | clase de 4 N (1,8–4,9 N), Isp 219–229 s, 0,37 kg | [SatCatalog](https://satcatalog.com/component/mr-111g-4n/) |
| RCS | MR-107T | clase de 110 N (54–125 N), Isp 222–225 s, 1,01 kg | [SatCatalog](https://satcatalog.com/component/mr-107t-110n/) |
| Tanques | MMH/NTO 180 o 300 kg; hidracina 40 u 80 kg | valores de juego | — |

Cuando una fuente da un rango, se usa el empuje nominal de la clase y el extremo bajo del Isp. El MR-104H crea un dilema real: empuja algo más y pesa menos que el R-4D, pero bebe del tanque de hidracina del RCS con peor Isp. El Δv cae de unos 940 a unos 130 m/s y el tanque de MMH/NTO pasa a ser masa muerta. La bahía avisa de las dos cosas.

## Arquitectura

- `modules/ship/domain/refit.ts`: huecos (`PartSlot`), piezas (`Part`), `fits`, `withPart`, `installedId` y `feeds`.
- `modules/ship/domain/ship.ts`: `Ship.refit(design)`.
- `modules/ship/data/parts.ts`, `thrusters.ts` y `propellants.ts`: almacén de piezas y densidades con fuente.
- `modules/ship-bay/domain`: reglas de atención (`byIntegrity`, `byLevel`, `byMachine`, `worst`, `mostUrgentFirst`) y el tipo `ComponentStatus`.
- `modules/ship-bay/application/bay.ts`: `bayStatus` reúne el estado de la nave, las máquinas, los bancales, la autosuficiencia y la despensa. `needingAttention` filtra lo que pide revisión y `bayActions` empareja cada pieza con sus tareas pendientes y con las piezas que encajan en su hueco.
- Adaptadores: `src/adapters/three/ship-model.ts` (maqueta), `src/adapters/three/ship-bay-scene.ts` (escena, órbita, selección y resaltado) y `src/ship-bay.ts` (panel y arranque de retos).

## Preguntas abiertas para Berón

- ~~**Escala.**~~ Resuelto: el módulo habitable y la cubierta de cultivo están en la nave nodriza. La bahía tiene dos pestañas, **Sonda** y **Nodriza** ([nave-nodriza.md](nave-nodriza.md)).
- **Montaje fallido.** El diseño original decía que, si fallas, la pieza queda mal montada y rinde menos. Ahora la pieza vieja se queda. ¿Queremos el estado «mal montada» con su reto de reparar?
- **Coste de las piezas.** Hoy cambiar una pieza solo cuesta resolver los retos. ¿Deberían salir de la bodega, de lo que cede un asteroide persuadido, o de un puerto?
- **Energía.** Resuelto: hay balance de energía y autonomía de batería (ver `componentes.md`).
- **Reponer recursos.** La bodega avisa si falta pienso o medio de cultivo, pero aún no hay forma de reponerlos. ¿Se reponen con la carga de los asteroides?
- **Distribución del RCS.** Hoy solo se cambia el modelo. ¿Queremos poder elegir distribuciones, como 16 propulsores compartidos frente a 24 en pares dedicados?
