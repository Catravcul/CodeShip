# Simulación y relojes

### Un proceso que produce «por día» recibe las horas de la estación, nunca `dt × warp`

- **Síntoma:** en un viaje de la nodriza llegaban cientos de paquetes de un asteroide de nivel 3 y la
  confianza subía al tope (H1).
- **Medido:** 2026-11-13, CV-03 en rojo sobre `995c2bc`: 449 paquetes en 30 s reales a ×600.
- **Cómo se evita:** el bucle tiene tres relojes (misión, vida a bordo, estación) y los calcula
  `frameClocks`. Lo que se mueve en el espacio usa el de misión; lo que produce, se gasta o envejece usa
  el de la estación o el de la vida a bordo. Un `update` que necesita los dos los recibe por separado
  (`AsteroidServices.update(dtS, stationHours)`).
- **Dónde:** `src/modules/navigation/domain/travel-time.ts`, [entrelazamiento.md](../qa/entrelazamiento.md), B-01.

### Los `update` con tope por llamada pierden tiempo con cámara rápida y pocos fps

- **Síntoma:** la ira se apaga más despacio de lo que dice su vida media durante un salto largo en un
  equipo lento (H2).
- **Medido:** 2026-11-13, CV-07: `AsteroidWrath.update` suma como mucho 60 s por llamada,
  `AsteroidServices.update` 120 s, y `main` limita el fotograma a 0,1 s. Un salto de 30 km va a ×629:
  62,9 s por fotograma a 10 fps o menos.
- **Cómo se evita:** al subir una cámara rápida, revisar los topes de la tabla de entrelazamiento.md;
  un tope por llamada debería ser en pasos, no en segundos, o repartir la llamada.
- **Dónde:** `wrath.ts`, `asteroid-services.ts`, `main.ts`; B-02.

### Acoplada, la física da todos los pasos de golpe; los tramos con física no pasan de ×60

- **Síntoma:** ninguno: es por qué ×600 de la nodriza no cuesta nada y el módulo y la sonda no pasan de ×60.
- **Medido (código):** `flight-computer.test.ts` («docked, a long time-lapse passes in one go»);
  `TRAVEL_TIME.maxPhysicsLapse = 60`.
- **Cómo se evita:** un vehículo nuevo que vuele con física en un viaje comprimido respeta ese tope.
- **Dónde:** `flight-computer.ts`, `travel-time.ts`.

### La simulación es determinista: semillas fijas

- **Síntoma:** ninguno; sirve para que los CV sean reproducibles.
- **Medido (código):** `AsteroidWrath` usa un LCG con semilla 7; `main` crea el huerto con
  `seededRandom(2026)` y la nano_net con `seededRandom(4242)`; `duel.test.ts` comprueba «same seed, same
  sequence of ideas».
- **Cómo se evita:** un proceso nuevo con azar recibe su generador inyectado; nunca `Math.random` en el dominio.
- **Dónde:** `wrath.ts`, `src/content/random.ts`.

### El almacén borra lo que baja de 1e-9 y lanza si se toma de más

- **Síntoma:** un `amount()` de 0 tras un `take` exacto; un `take` mal calculado revienta el fotograma.
- **Medido (código):** `MaterialStock.take` borra la entrada si queda ≤ 1e-9 y lanza si `!has(a)`;
  `BioLab.tick` toma escalado a lo que hay para no lanzar nunca (CV-10).
- **Cómo se evita:** un proceso que toma por tick escala a lo disponible; uno que toma al poner en cola
  comprueba antes (`canRefine`, `has`).
- **Dónde:** `materials.ts`, `bioreactor.ts`; CV-10.
