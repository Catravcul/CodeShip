# Vida a bordo: plantas, gatos y la mente de la nave

Este documento continúa [bucle-de-juego.md](bucle-de-juego.md). En los tramos largos la nave vuela sola y el jugador vive dentro: cuida al personaje (las actividades de Cold Sanctuary), las plantas, los gatos y la propia nave.

## Principio común: hablar con una mente es leer o escribir su programa

El asteroide, las plantas, los gatos y la nave usan el mismo motor de duelo (`modules/mind-duel`). Lo que cambia es qué ocurre al ganar o perder:

| Mente | Al persuadirla | Si se agota la paciencia | Conceptos que entrena |
| --- | --- | --- | --- |
| Asteroide | Obedece y sus recursos llenan la bodega | Se vuelve agresivo y hay que huir | Según masa y riqueza (1–10) |
| Planta | Ánimo al máximo: crece más rápido | Se desanima un poco (ánimo −0,3) | Secuencia y variables (1–2) |
| Gato | Aprende una regla nueva en su mente | Se molesta (estrés +0,3) y no aprende nada | Condicionales y eventos (5, 9) |
| Nave | Se monta la pieza nueva | La pieza queda mal montada y rinde menos | Variables, operaciones, reparar (2, 4) |

Así el jugador practica conceptos distintos según lo que necesita en cada momento, y no solo en los duelos con asteroides.

## Lo que había en el borrador

En la rama `recuperar-onedrive` aparecieron estas piezas:

- **Árboles de mejoras** (`src/UserInterface/menu/upgrades.js`). El crecimiento personal tenía cuatro cualidades: Caregiver (cuidador), Intellectual, Athlete e Introspective. La nave tenía dos: Ecological y Powerful. La IA de la nave mejoraba con materiales obtenidos de los objetos estelares.
- **LeveledObject** (`src/domain/leveled-object`). Tenía puntos físicos y mentales (10/10), defensas física y mental, nivel cada 1000 de experiencia y auras con aliados y enemigos. `mind-corruption` estaba vacío.
- **HolisticCast**. Las acciones de código («declarar var número», «asignar»…) funcionaban como hechizos contra un objetivo, con efectos en el tiempo. Es el antecedente directo del duelo.
- **Materials**. Contaba hielo de agua, carbono, aminoácidos, azúcares, hidrocarburos, silicatos, hierro, níquel y cobalto.
- **Catálogos de componentes** sin fuentes (ya copiados a `docs/research/legado`).

Encajan así:

- **Cuidador** es la cualidad natural para plantas y gatos. Puede subir la eficacia de los cuidados y de las charlas con sus mentes.
- **Atleta** e **Introspectivo** encajan con el entrenamiento y el yoga de Cold Sanctuary.
- **Intelectual** encaja con el estudio, es decir, con los bloques de conceptos.
- **Ecológica** encaja con el reciclaje: los restos de cosecha vuelven como nutrientes.
- **Potente** encaja con las piezas de la nave.

## Plantas

Los datos de cultivo son reales. Por ahora hay dos especies (`modules/garden/data/species.ts`):

| Especie | Cosechas | Polinización | Fuente |
| --- | --- | --- | --- |
| Lechuga romana roja 'Outredgeous' (Veggie, ISS) | Día 33. Cosechando hojas sin arrancarla («cut-and-come-again») llegó a 64 días | No hace falta | [NTRS 20190028955](https://ntrs.nasa.gov/citations/20190028955), [Scientific American](https://www.scientificamerican.com/article/astronauts-take-first-bites-of-lettuce-grown-in-space/) |
| Chile 'Española Improved' (Plant Habitat-04, ISS, 2021) | Días 100 y 120 | Autopoliniza, pero hay que **agitar** la planta | [NASA PH-04](https://www.nasa.gov/sites/default/files/atoms/files/plant_habitat-04.pdf), [NMSU](https://engr.nmsu.edu/news-events/2021/11/chile-in-space.html) |

El Veggie usaba LED rojos, azules y verdes. En el juego, «luces encendidas» es la condición para crecer.

**Cuidados.** Hay que regar (el sustrato se seca), mantener las luces encendidas, agitar el chile antes de que fructifique y proteger la planta de los gatos.

**Ánimo.** Con ánimo neutro la planta crece al ritmo real del experimento. Al animarla sube al máximo y crece hasta un 15 % más rápido. Si se desanima, crece hasta un 15 % más lento. El ánimo vuelve poco a poco a neutro.

**Aviso honesto:** que hablar a las plantas acelere su crecimiento es **ficción del juego**. No hay evidencia sólida, y el documento lo deja claro para no enseñar algo falso.

**Planta nueva.** Durante sus 3 primeros días la planta es «nueva» y atrae a los gatos.

## Gatos

**Energía real.** La energía en reposo (RER) es 70 · kg^0,75 kcal/día. La de mantenimiento es 1,2 × RER para un adulto castrado, 1,4 × RER para uno entero y 2–3 × RER para un gatito. Son estimaciones, y cada gato puede variar hasta un 50 % ([Pet Nutrition Alliance](https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf)). Un gato castrado de 4 kg necesita unas 238 kcal/día.

**Necesidades.** Tiene comida, juego y cariño, y el estrés sube cuando alguna está baja. Un gato muy estresado (≥ 0,8) **se salta sus reglas** y actúa por instinto. Por eso cuidarlo es parte de programarlo.

**Recursos.** La regla de la AAFP es un arenero, un comedero, un bebedero, una cama y un rascador por gato, más uno extra. Si faltan, todos los gatos se estresan.

**Presentaciones.** Siguen la guía de la AAFP y Feline VMA ([PDF](https://catvets.com/wp-content/uploads/2024/07/Step-by-Step-Guide-How-to-Introduce-a-New-Cat-to-Other-Cats-in-Your-Home.pdf)), resumida en seis etapas:

1. **separados:** el gato nuevo está en su habitación de transición.
2. **olores:** se intercambian mantas y juguetes.
3. **juego-tras-puerta:** juegan con la puerta cerrada en medio.
4. **contacto-visual:** se ven a través de una mampara o cristal.
5. **juntos-supervisados:** comparten espacio con el jugador delante.
6. **amigos.**

Solo se avanza cuando los dos gatos están tranquilos, como pide la guía. Desde el contacto visual los gatos se encuentran: si alguno bufa, la etapa vuelve a empezar, y si se saludan, avanza al doble de ritmo. Señales de estrés según la guía: hacer sus necesidades fuera del arenero, gruñir, bufar o caminar de un lado a otro.

**Plantas tóxicas** (ASPCA):

- **Lirio:** tóxico, causa fallo renal en gatos. No se puede llevar a bordo.
- **Planta de tomate:** tóxica por la solanina. El fruto maduro no lo es.
- **Hierba gatera:** tóxica leve. Causa vómitos y diarrea, y a algunos gatos los seda y a otros los excita.
- **Albahaca:** no tóxica.
- **Lechuga y chile:** sin entrada en la ASPCA. Quedan como «desconocido».

Esto prepara una mecánica futura: elegir qué se cultiva teniendo en cuenta a los gatos.

**Programar su mente.** Un gato sin programar tiene instintos: ante una planta nueva la olfatea o la muerde, y ante un gato desconocido bufa u olfatea. Al hablar con su mente el jugador escribe una regla que sustituye al instinto. Cada regla aparece como una línea de su programa:

```
cuando aparezca una planta nueva → olfatearla y seguir mi camino
on('planta-nueva', planta => { olfatear(planta); alejarme(); });
```

Las lecciones de ahora (`modules/pets/data/rules.ts`) son:

- **respetar-plantas:** sirve para cada planta nueva y para cada gato que llega a bordo.
- **hacer-amigos:** el gato saluda en lugar de bufar, así que la presentación va más rápido. Aun así hay que pasar por todas las etapas: no hay atajo.

**Progresión.** Se empieza con un gato. Cada gato nuevo trae trabajo:

- presentarlo a cada residente;
- programarlo para que no dañe las plantas que ya hay;
- conseguir un juego de recursos más.

El máximo previsto es 4 gatos.

## La mente de la nave

En el borrador se mostraba el código de la clase de la nave y se actualizaba al elegir componentes. La propuesta mantiene esa vista y le añade retos:

- **Vista de su código.** Al hablar con la nave se abre su clase, en pseudocódigo o JS. Cada pieza montada es una línea con sus valores reales, por ejemplo `motor = R4D(empuje 490 N, Isp 312 s)`. Los valores que cambian (combustible, casco) se actualizan en vivo.
- **Cambiar una pieza.** El reto se genera a partir del cambio real, no sale de un banco fijo:
  - **completar** el valor nuevo (`motor.empuje = ___`);
  - **predecir** el Δv con el tanque nuevo usando la fórmula de Tsiolkovsky;
  - **ordenar** el montaje (cerrar válvulas, desconectar, montar, conectar, probar);
  - **especificar** la orden correcta.

  La línea cambiada se resalta como un diff.
- **Si fallas.** La nave no se enfada: la pieza queda mal montada y rinde menos (menos empuje, fugas). Para arreglarla hay un reto de **reparar** sobre esa línea.

## Qué hay implementado

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Planta (agua, luz, salud, ánimo, agitar, cosechar) | `modules/garden/domain/plant.ts` | ✓ con tests |
| Especies con datos reales | `modules/garden/data/species.ts` | ✓ lechuga y chile |
| Gato (energía real, necesidades, estrés, reglas) | `modules/pets/domain/cat.ts` | ✓ con tests |
| Instintos y decisión | `modules/pets/domain/behavior.ts` | ✓ con tests |
| Presentaciones entre gatos | `modules/pets/domain/introduction.ts` | ✓ con tests |
| Hábitat: une plantas, gatos, encuentros y charlas | `modules/habitat/application/habitat.ts` | ✓ con tests |
| Lecciones para gatos y charla con plantas | `pets/data/rules.ts`, `garden/data/minds.ts` | ✓ 9 ejercicios |
| Mente de la nave (vista de su clase y retos generados) | — | diseñado |
| Interior 3D de la nave, personaje caminando, gatos y macetas visibles | — | siguiente paso |
| Viaje automático programado entre asteroides | — | pendiente |

Los números de cuidado sin fuente (velocidad de secado, ritmo de juego y de cariño, probabilidad de mordisco, días por etapa) están marcados en el código como **ajuste de juego**. Así se distinguen de los datos reales.
