# Naves reales: catálogo, opciones de nodriza y plan de reconstrucción

Preguntas de Berón (2026-11-16): «¿La nodriza es real? La base es que las naves sean reales o estén en desarrollo». «Tenemos que tener un catálogo de naves, módulos de aterrizaje, sondas y estaciones que recreamos con los componentes de los planos». «El catálogo tiene que describir cómo son por fuera y por dentro. Vamos a reconstruir la nave y la estación desde cero, con el soporte vital real de la tripulación, y después iremos añadiendo las personalizaciones de ficción hacia el santuario espacial».

La investigación, con todas las fuentes, está en [../research/naves-reales.md](../research/naves-reales.md). **Este documento no cambia las naves del jugador**: propone y espera a que Berón elija.

## Respuestas cortas

- **Inventado hoy**:
  - la nodriza y sus anillos de 1 g;
  - la Explorer, que es inventada aunque sus piezas hayan volado;
  - la sonda (una combinación de piezas);
  - el plano de la «sonda de prospección» de 30 kg;
  - la estación como conjunto, aunque sus módulos copien los de la ISS;
  - el hangar de 20 × 14 × 20 m y el dique seco.

  Entre los componentes, son conceptos o pruebas en tierra el **X3**, el **VASIMR**, el **reactor de 2 MWe**, el **Kilopower**, el **B330** y la **cabina de CFRP**. Casi todo lo demás ha volado.
- **Hangares**: no existen en ninguna estación, ni pasada ni prevista. Hay esclusas de carga (Bishop, Kibo, Mengtian, Skylab), plataformas expuestas y atraque con brazo. La bodega del transbordador, sin presión, fue una bahía de vehículo. Sirven para soltar cubesats, exponer experimentos, tirar basura, salir de paseo espacial y mover cargas.
- **Gravedad artificial**: ningún vehículo real ni en desarrollo la tiene. Solo hay conceptos: Vast (2035, en su hoja de ruta) y Nautilus-X (cancelado).

## 1. El catálogo de vehículos (hecho)

Código:

- `src/modules/station/domain/vehicle-catalogue.ts`: estado, receta, `canBuild`, `missingParts`, `componentMass`, `assemblySite` y `assemble`.
- `data/vehicle-catalogue.ts`: **23 vehículos**.
- `data/catalogue-components.ts`: 29 componentes nuevos con fuente.
- `application/vehicle-yard.ts`: el caso de uso.

Tests: EST-28 a EST-30.

- **Cada vehículo** tiene:
  - **estado**: ha volado, en desarrollo, en pausa, concepto o inventado, con su nota y su fecha;
  - **programa**, **fuentes** y **datos reales**: masa, tamaño, tripulación, gravedad y propulsión;
  - **lo que el juego gana y pierde** si lo usa.

  Las opciones de nodriza y las estaciones llevan además **cómo son por fuera y por dentro, su soporte vital e imágenes de referencia** (`look`).
- **Cada receta** es una lista de piezas con el mismo id que usan los planos y el hangar. Se reutiliza lo que ya había:
  - el NEXT-C y las ROSA para DART;
  - el AEPS para el Gateway y SR-1;
  - la batería de plata-zinc para el módulo lunar;
  - todas las piezas de la Explorer.

  Lo que faltaba es un **componente nuevo con fuente**: Raptor, casco de Starship, HALO, cuerpo del PPE, Bishop, Haven-1, etc. Cuando la fuente no da desglose, el «cuerpo» es la masa real menos las piezas del catálogo, y su nota enseña la cuenta. Un test comprueba que la receta pesa lo mismo que el vehículo real (±3 %). La de la Explorer pesa 1166 kg, la de la sonda 16 kg y la de la nodriza 726 t, igual que en el juego.
- **Cada componente nuevo tiene plano** en Planos → Componentes. La máquina depende del tipo: los motores en la impresora (la grande si pasan de 40 kg), las estructuras en la fundición, los hábitats en la soldadora y la energía y la electrónica en la impresora con kits importados. Recetas, kits y horas son valores de juego, y las horas crecen con la raíz de la masa: el casco de Starship tarda 337 h.
- **Los que no tienen desglose publicado** (Vast, Nautilus-X, MMSEV, Blue Moon MK1, ISS, Tiangong, Haven-2) se listan, pero no se pueden montar.

### En el juego (mínimo)

En la estación, pestaña **Hangar** → **Ver el catálogo**. Cada vehículo sale con su estado en color y una línea por pieza: cuántas hay en el hangar, cuántas pide y, si falta, por qué (sin plano, bloqueada hasta tener una máquina, o «fabrícalo en Planos»). **Construir** solo se activa con todas las piezas. Las gasta y deja la nave en el hangar, o en el dique si no cabe en el hangar en ninguna orientación. Recorrido PX-24 con capturas `docs/screenshots/catalogo-naves-*-movil.png`.

Las naves montadas se quedan en la lista del hangar. Todavía no vuelan: eso llega cuando Berón elija las bases (§3).

## 2. Opciones para la nodriza

| | **A. Starship de crucero** | **B. Pila eléctrica del Gateway (PPE + HALO, con SR-1)** | **C. Nodriza conceptual declarada** |
| --- | --- | --- | --- |
| Estado | En desarrollo (14 vuelos de prueba; HLS en 2028) | HALO construido, programa en pausa; SR-1 en desarrollo para 2028 | Concepto (Vast 2035, Nautilus-X) más lo inventado |
| ¿Cumple «real o en desarrollo»? | **Sí** | Casi: el hardware existe, el programa está en pausa | **No** |
| Tamaño | 52 × 9 m, 614 m³ | Unos 10,5 t y un hábitat de unos 8 t para 4 | 152 m, anillos de 112 m |
| Viaje | Químico: unos 8,2 km/s con 100 t de carga (cuenta nuestra). Saltos de días, pero hay que repostar 1500 t de metano y oxígeno | Eléctrico, como ahora (AEPS): meses entre asteroides | Igual que ahora |
| Gravedad | Ninguna | Ninguna | 1 g en los anillos |
| Anillos | **Se quitan.** El código de gravedad queda para una fase de licencia | Se quitan | Se quedan, marcados como concepto |
| Huerto | En microgravedad, como Veggie y APH de la ISS (0,13–0,2 m² cada uno; [estacion.md](estacion.md)): mucho menos que la cubierta de 18 × 18 m | No cabe: va a la estación | Igual que ahora |
| Santuario | Acuario en microgravedad: la medaka ya ha vivido en la ISS ([agua-y-fauna-en-ingravidez.md](../research/agua-y-fauna-en-ingravidez.md)). Los perros y las gallinas no pueden ir a bordo sin gravedad | Va a la estación | Igual que ahora |
| Salud | Ingravidez siempre: el ejercicio (T2, ARED, CEVIS) pasa a ser una tarea diaria | Igual que A | Igual que ahora |
| Coste de rehacerla | Alto: maqueta, interior y vida a bordo | Alto, con menos volumen | Bajo: renombrar y marcar |

**Recomendación: A como base y C como capa de ficción posterior.** Starship es el único vehículo tripulado en desarrollo con volumen para una vida a bordo larga (614 m³: más que el volumen habitable de la ISS, 388 m³). Además, el juego ya hace oxígeno, y metano por Sabatier, en la estación, así que repostarla tiene sentido. Las ideas de C (anillos, huerto grande) vuelven después como **licencia declarada** sobre esa base (§3, fases 4 y 5).

**B** es la alternativa si Berón quiere conservar los viajes lentos con motores eléctricos y el AEPS que ya se puede montar. A cambio, el hábitat es pequeño y el programa está en pausa.

El catálogo guarda las tres opciones como entradas: `starship` (A); `gateway-ppe-halo`, `sr1-freedom` y `deep-space-transport` (B); `vast-gravedad`, `nautilus-x` y `codeship-nodriza` (C).

## 3. Plan de reconstrucción desde cero

Cada fase es **una rama** con sus tests, su recorrido PX y sus capturas. La fase 1 es solo lo real. Desde la fase 3, cada cosa nueva lleva una etiqueta en los datos y en la ficha del juego: **real**, **licencia** (una tecnología estudiada pero no desarrollada, o una escala que nadie ha construido) o **ficción**.

### Fase 1 · Base real (cuatro ramas)

1. **`base-nodriza-real`**: la nave elegida (A o B) con sus medidas reales.
   - **Por fuera**: casco, motores, alas o radiadores, puertos de acople (IDSS) y esclusa, sacados de la ficha del catálogo (`look.exterior`).
   - **Por dentro**: los módulos con su volumen real. En Starship la distribución no está publicada, así que la diseñamos dentro de los 614 m³ con bastidores ISPR, el estándar de la ISS, y la marcamos «distribución nuestra».
   - Lo que hay dentro: camarotes de unos 2 m³ como los de Harmony, cocina, baño (WHC), gimnasio (T2, ARED, CEVIS), puestos de trabajo, almacén y escotillas.
   - Los anillos y la cubierta de cultivo quedan apagados tras un interruptor de desarrollo, sin borrar código.
2. **`eclss-real`**: un dominio de soporte vital con el balance diario por persona (`CREW_DAILY`: 0,89 kg de O₂, 1,08 kg de CO₂, 2,39 kg de comida y ~3,8 L de agua).
   - Máquinas reales como interactuables: **OGA** (electrólisis), **CDRA** (CO₂), **Sabatier**, **WRS** (UPA, WPA y BPA, al 98 %), **TCCS** y extintores.
   - Cada máquina tiene sus averías como tareas y su consumo de energía. Hay calor hacia los radiadores y un refugio contra la radiación (las bolsas de agua que ya existen como blindaje).
   - El reabastecimiento sale de la cuenta: comida (3,5 t por cuatro personas y año), las pérdidas de agua (~2 %) y los repuestos.
3. **`estacion-real`**: la estación rehecha como el segmento estadounidense de la ISS.
   - Módulos: Nodo 1, laboratorio (Destiny), Nodo 2 (camarotes) y Nodo 3 (baño, gimnasio, WRS y OGA), con módulos tipo Columbus o Kibo para la fabricación. Volúmenes reales y celosía con alas de la ISS.
   - **El hangar se sustituye por lo que existe**: una esclusa de carga tipo **Bishop** para las sondas, una **plataforma expuesta** tipo JEM-EF para los estantes de piezas y el **atraque con brazo en un CBM** para el módulo de aterrizaje.
   - El dique seco se queda como celosía abierta, con la etiqueta de licencia: estructura de montaje que nadie ha construido a esa escala.
   - Para que la estación crezca, los módulos de Haven-2 son la opción en desarrollo.
4. **`catalogo-montaje`**: montar los vehículos del catálogo en el dique o con el brazo, con su maqueta 3D a partir de `look` y su ficha. La sonda pasa a ser una **Juventas** real (12 kg) y el plano de 30 kg desaparece. El módulo de aterrizaje se elige entre el **módulo lunar Apolo** (real) y la Explorer marcada como inventada.

### Fase 2 · Vida real a bordo

5. **`vida-real`**: huerto en microgravedad con las cámaras reales (Veggie, APH), peces que han volado (medaka en el Aquatic Habitat), ejercicio diario obligatorio y salud en ingravidez. Todo **real**.

### Fase 3 · Gravedad parcial (licencia)

6. **`centrifuga`**: una centrífuga corta de entrenamiento, del tipo del demostrador que Nautilus-X proponía para la ISS (83–143 M$), y después un giro con cable entre la nave y su contrapeso. **Licencia**: está estudiado, pero no se ha construido.

### Fase 4 · Anillos (licencia, después ficción)

7. **`anillos`**: vuelven los anillos de 1 g, justificados con la hoja de ruta de Vast (3,5 rpm, 2035). Primero un anillo pequeño (**licencia**); el de 56 m de radio y 877 t es **ficción de escala**. La cubierta de cultivo vuelve a 1 g.

### Fase 5 · Santuario espacial (ficción, paso a paso)

8. **`santuario-acuario`**, **`santuario-rio`**, **`santuario-biomas`**: las áreas de [santuario-espacial.md](santuario-espacial.md), en su orden de requisitos: acuario, río giratorio, insectario, cueva y luego los biomas. Cada área lleva su etiqueta: **real** si su fauna ya ha volado, **ficción** si no.

**Lo que hay que decidir antes de empezar**: la base de la nodriza (A, B o C); la base del módulo de aterrizaje (módulo lunar o Explorer marcada); y si la estación se rehace como la ISS o como Haven-2.

## 4. Preguntas para Berón

1. **Base de la nodriza.** ¿A (Starship), B (pila eléctrica del Gateway) o C (la de ahora, marcada como concepto)? Recomendamos A como base y C como capa de ficción en las fases 4 y 5.
2. **Hangar.** ¿Lo cambiamos por una esclusa tipo Bishop, una plataforma expuesta y el atraque con brazo, o lo dejamos como licencia? Antes hay que decidir si tiene presión: hoy los documentos se contradicen.
3. **Módulo de aterrizaje.** ¿Módulo lunar Apolo (real, 4,3 t en seco) o la Explorer marcada como inventada (1166 kg)? `hangar-craft.ts` y gravedad.md todavía dicen 680 kg.
4. **Sonda.** ¿La cambiamos por Juventas (12 kg, real) y quitamos el plano de 30 kg?
5. **Estación.** ¿Base ISS (todo documentado: interior y soporte vital) o Haven-2 (en desarrollo, con pocas cifras publicadas)?
