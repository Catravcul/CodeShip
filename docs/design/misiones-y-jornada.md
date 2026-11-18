# Misiones y jornada: lo que hay y cómo se reutiliza en el santuario 1

Resumen para retomar sin releer el código (2026-11-18). Dos sistemas: las **misiones a bordo** de Codeship (retiradas del
juego en el reinicio del 2026-11-16, código conservado) y la **jornada laboral** de Cold Sanctuary. Al final, el diseño
propuesto para la modal de misiones de jornada del santuario 1 (no construida aún).

## 1. Misiones a bordo de Codeship (2026-11-11 → 2026-11-16)

**Idea.** Todo lo que se hace a bordo es un **reto de código**: cada paso de una tarea es un ejercicio (elegir la
instrucción correcta u ordenar los pasos). La tarea existe por un **escenario** (un gato mordió la lechuga, una sacudida
del asteroide volcó una maceta) y su recompensa mueve las necesidades de Doménica.

**Piezas (siguen en el repo, sin cablear tras el reinicio):**

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| `Chore` y `ChoreRun` | `src/modules/chores/domain/chore.ts` | Una tarea = lista ordenada de ejercicios. Fallos máximos 2; una respuesta errónea repetida no cuenta dos veces («Esa ya falló») |
| `ChoreKind` y `CHORE_CATEGORY` | idem | ~50 tipos agrupados en comida, plantas, animales, nave, salud y misiones |
| Generadores | `src/modules/chores/application/catalog.ts` | Convierten datos reales en retos: `plantChores`, `catChores`, `dogChores`, `henChores`, `cookingChore` (un paso de receta = un reto), `processChore` (molino, soja), `bioreactorChores` (carne cultivada), `yogaChore` (una postura = un reto), `workoutChore`, `sleepChore`, `procedureChore` (asearse, refugio, médico), `patientChore` (protocolos ABCDE), `repairChore` y `swapChore` (piezas de la nave), `machineRepairChore`, `lessonChore` (programar la mente de un animal) |
| Animación de cada paso | `src/modules/chores/domain/step-visual.ts`, `application/step-visuals.ts` | Qué se ve en la escena en cada paso (portado de `StepVisual` de Cold Sanctuary) |
| Necesidades | `src/modules/crew/domain/crew-member.ts` | `satiety` (hambre), `fitness` (fuerza), `stress` (calma), `loneliness` (compañía) y `health` (heridas y enfermedades). `wellbeing` resume las cuatro |
| Recompensas | `CREW_TUNING` en el mismo archivo | Comida: +0,45 de saciedad (2 comidas al día). Yoga: +0,25 forma y −0,3 estrés. Ejercicio: +0,35 forma y −0,1 estrés. Dormir: −0,25 estrés. Animales: la compañía baja la soledad (`companyCalmPerDay`). Curar: baja `health.burden` |
| Misiones de historia | `src/modules/missions/` | Las cartas de Nevaeh por radio, con misiones de nano_net |
| Lista de tareas | `src/ui/task-board.ts`, `src/modules/tasks/` | Todas las tareas con «Ir», filtros de grupo y ajustes (viajar o teletransportarse) |

**Objetivo de juego** (el mismo que se quiere en el santuario 1): que el jugador no pase hambre, se sienta acompañado y
esté fuerte y sano. Cada misión mueve una de esas necesidades.

**Por qué se retiraron:** el reinicio pidió naves y procesos reales; las granjas, los gatos y el santuario a bordo eran
ficción (ver [naves-reales.md](naves-reales.md) y [pendientes.md](../pendientes.md)). En el santuario 1 (Tierra, con su
magia de Cold Sanctuary) vuelven a encajar.

## 2. La jornada de Cold Sanctuary

Código en Cold Sanctuary: `Assets/Scripts/Progression/WorkRoster.cs` (lógica pura), `WorkdayDirector.cs` (en el juego),
`AreaWork.cs` (catálogo), `LeisureRoster.cs` (horario libre). Diseño: `docs/jornada-y-rotacion.md` y `docs/horario-libre.md`.

**El día (8 h, todos los días):**

| Hora | Qué |
| --- | --- |
| 8–9 | Entrenamiento para todos |
| 9–11 | Tareas (2 h) |
| 11–12 | Comida en el restaurante |
| 12–14 | Tareas (2 h) |
| 14–15 | Entrenamiento (yoga, gimnasio…) |
| 15–16 | Tareas (1 h) |
| 16 → | **Libre**: cada uno hace lo que quiere, el jugador también |

**Misión** (`WorkRoster.Mission`): área, id, título, horas, `mandatory` (debe cubrirse cada día), `optional` (si nadie
tiene tiempo, no se hace), `group` (se hacen juntas: la clase de yoga), `also` (otras áreas a las que hace ir: llevar la
cosecha a la cocina), `roams` (recorre todas), `lead` (dirige: no para recién llegados), `owner` (puesto fijo),
`divisible` (a trozos de 0,5–1 h).

**El reparto** (`WorkRoster.Plan`), cada día, 5 h de tareas por persona:
1. Pendientes de ayer, luego obligatorias, luego el resto.
2. Iniciaciones primero (`aprender_<id>`): lo que cada uno no sabe y pide saberse (tareas con riesgo). Primer día, hasta 5 h; luego 2 h. Clases de ≤ 6. Enseña un trabajador que sepa y sepa iniciar; si no hay, un clon de la Magnate.
3. Misiones de grupo a la vez (yoga, obras).
4. **Vueltas por áreas** (round-robin): de cada área una misión para la primera persona a la que le quepa; se elige la que nunca hizo, luego la que menos hizo, luego la que hace más días que no hace. El orden de áreas rota un puesto cada día.
5. Huecos: obligatorias sin cubrir → clones de la Magnate; el resto pasa a mañana.
6. Requisitos (`MissionRequirements`): conocimiento, área no en obras, seguridad, herramientas y materiales.

**Regla de oro (J30):** todos acaban sabiéndolo todo; ninguna tarea es exclusiva de nadie.
**Puesto:** durante la jornada cada uno se queda en el espacio de su tarea; si se va, la Magnate lo devuelve.
**Libre (16 h →):** el horario libre semanal reparte ocio y cuidado por igual, con la misma rotación.

## 3. Diseño para el santuario 1 (pendiente de construir)

Lo que pidió Berón el 2026-11-18, juntando lo anterior:

- **Modal de misiones de jornada** que reutiliza la ventana de mapa de Navegación/Áreas (`MapWindow`, reglas.md §5.7):
  arriba el mapa 3D del santuario con la misión elegida; debajo la lista con descripción, hora, recompensa e «Ir».
- **Bloqueo por hora y día:** en horas de jornada solo se puede hacer la misión que el reparto le dio a Doménica a esa
  hora; las demás se ven con su candado y la hora en que tocan. En las **horas libres** se muestran **todas** las
  misiones y se puede hacer cualquiera.
- **Cada humano tiene sus tareas del día** con el reparto de `WorkRoster` portado tal cual (lógica pura con sus pruebas,
  como se hizo con `PopulationPlan` en `src/modules/sanctuary-one/domain/population.ts`).
- **Misiones** de Berón: cocinar, yoga, ejercicio, alimentar animales, programar la mente de los animales, trabajar en
  el campo, curar personas, curar animales, cuidar las plantas de los edificios, limpieza… Cada una se hace con los
  generadores de retos de §1 (`cookingChore`, `yogaChore`, `workoutChore`, `lessonChore`, `patientChore`…), en la
  máquina de su piso.
- **Recompensas:** hambre (comer en el restaurante), compañía (animales y personas), fuerza (gimnasio, campo, obras) y
  salud (yoga, sueño, hospital), con las cifras de `CREW_TUNING` como punto de partida.

Orden propuesto: (1) portar `WorkRoster` + `AreaWork` como dominio puro con pruebas; (2) reloj de jornada en la escena;
(3) la modal; (4) cada misión en su piso a medida que ese piso se porta con detalle.
