# Viajes: retos de código y cámara rápida con tope

Regla del diseñador (ampliada después: el aterrizaje también puede ser por reto, [aterrizaje.md](aterrizaje.md)): «Los aterrizajes son manuales, pero para viajes de la nave y sonda siendo que son muy largos se pueden sustituir por los retos de código, entonces se mueven solos y el tiempo real se reduce de modo que se puede ver a la sonda o nave volar desde su preview pero el tiempo no supera un tope de segundos, en ese tiempo el jugador puede resolver otras tareas».

## Cómo se juega

1. **Programar.** El viaje largo se programa con la cadena de cinco retos de siempre (ordenar, completar, predecir, reparar, especificar), con los números reales de ese viaje ([navegacion.md](navegacion.md)):
   - nodriza o módulo: desde el mapa del puente (NAV) → **Programar viaje**;
   - sonda: desde su consola en el puente → **Programar viaje a …** (asteroide lejano) o **Programar vuelta a la nodriza**.
2. **Vuela solo.** Al resolver la cadena, el vehículo vuela solo con su física real (la nodriza con su empuje Hall continuo; el módulo y la sonda con quemado, crucero, vuelta y frenado). El tiempo del juego se pasa en **cámara rápida** y el viaje entero nunca dura más de **75 s reales**.
3. **Mientras tanto.** Se puede hacer cualquier otra cosa: caminar por el anillo, tareas, huerto, estación, radio. La **ficha de viaje** (abajo, en cualquier pantalla) dice quién viaja y adónde, **cuándo llega en segundos reales**, la fase, la velocidad, lo que falta, la duración real del vuelo y la cámara rápida (×N). Tiene dos botones:
   - **Ver**: abre la **vista en directo** (una segunda cámara sobre la escena del espacio, en una esquina; arriba en el móvil). Sigue a la nodriza, al módulo o a la sonda con su destino al fondo. «×» o **Ocultar** la cierran.
   - **Mando**: toma el mando (el piloto automático se desconecta; tocar los mandos del vehículo hace lo mismo).
4. **Llegada.** El vehículo llega cerca y devuelve los mandos parado:
   - módulo: a unos 300 m de la superficie; se aterriza **a mano con los indicadores X/Y/Z** o **por programa** (otra cadena de retos), ver [aterrizaje.md](aterrizaje.md);
   - sonda: a unos 300 m del asteroide; posarla (fase 1 de la subyugación, [subyugacion.md](subyugacion.md)) también es a mano o por programa ([aterrizaje.md](aterrizaje.md));
   - sonda de vuelta: a unos 60 m de la bahía; acercarla a 10 m para que la agarre el brazo es manual;
   - nodriza a una estación: atraca sola, como antes (es un atraque, no un aterrizaje).

Solo hay un viaje comprimido a la vez: con la sonda de viaje no se programa la nave, y al revés. La nodriza no se va con la sonda fuera («recógela antes de mover la nodriza»).

## Cuánto dura: tiempo real del vuelo y tiempo en pantalla

El tiempo de juego de cada tramo es el de su física, con los motores y masas reales de cada vehículo (código existente: `planContinuousBurn` y `planTransfer` en `navigation/domain/transfer.ts`):

- **Nodriza** (18 × X3, 97 N, ≈876 t → a ≈ 1,1·10⁻⁴ m/s²): sin crucero, t = 2·√(d/a). Empuje del X3 de [Hall et al. 2019](https://ntrs.nasa.gov/citations/20190004993) y [PEPL](https://pepl.engin.umich.edu/project/x3-nested-channel-hall-thruster) ([nave-nodriza.md](nave-nodriza.md)).
- **Módulo** (Explorer, motor de 490 N, ≈1,65 t → ≈0,30 m/s²) y **sonda** (4 × MPS-120 a 0,26 N, 16,8 kg → ≈0,062 m/s², Δv ≈ 91 m/s; [ficha MPS-120XW](https://www.environmental-expert.com/products/model-mps-120xw-cubesat-high-impulse-adaptable-528975), Juventas de [Hera](https://www.heramission.space/hera-mission-juventas-cubesat)): t = d/v + v/a.

| Viaje | Tiempo de juego | Cámara rápida base | En pantalla |
| --- | --- | --- | --- |
| Nodriza, 3 km | 2,9 h | ×600 | 17 s |
| Nodriza, 9 km | 5,0 h | ×600 | 30 s |
| Nodriza, 30 km | 9,1 h | ×600 | 55 s |
| Módulo, último tramo 1,05 km | 2 min | ×5 | 24 s (repartido con la nodriza: ver abajo) |
| Módulo solo, 9 km | 7,4 min | ×5 | 75 s (tope) |
| Sonda, 1,5 km | 5,2 min | ×10 | 31 s |
| Sonda, 5 km | 9,6 min | ×10 | 58 s |
| Sonda, 9 km | 14 min | ×10 | 75 s (tope) |

**Regla** (`navigation/domain/travel-time.ts`, con tests):

- En pantalla = min(**tope**, tiempo de juego ÷ cámara rápida base). Los viajes cortos escalan en proporción; los largos se aprietan en el tope.
- Un viaje con dos tramos (nodriza y luego el módulo) reparte el tope entre ellos en la misma proporción (`legBudgets`). Nodriza 9 km + módulo 1,05 km = 30 s + 24 s = 54 s.
- El tramo de la nodriza es cinemático: va a cámara rápida constante y acaba justo a su hora. Los tramos del módulo y la sonda son física de 120 Hz con su piloto automático: su `TravelClock` ajusta la cámara rápida con la estimación del piloto automático de lo que falta (los giros tardan más de lo previsto) para seguir dentro del tope, con un máximo de ×60 para no pedir demasiados pasos por fotograma.
- Valores de juego: tope **75 s**; bases nodriza ×600, módulo ×5, sonda ×10; máximo físico ×60.
- Sonda: un viaje gasta como mucho el **35 %** de su Δv (valor de juego; el módulo usa el 50 %), para que pueda volver y posarse. La guía de la sonda corrige errores de velocidad más pequeños (0,3 m/s en vez de 1 m/s), porque con su motor de 0,06 m/s² un error de 1 m/s le cuesta decenas de metros de frenado.
- Vuelta a la nodriza: la sonda sale de la bahía subiendo 120 m, y vuelve parándose 400 m encima de la bahía y bajando en línea recta (su RCS es demasiado débil para doblar una esquina deprisa). La nodriza entera es un obstáculo de la ruta.

### ¿Y la escala real?

Las distancias de la zona están comprimidas unas 100.000 veces ([sistema-solar.md](../research/sistema-solar.md)). Un salto real entre asteroides vecinos del cinturón dura meses o años: Dawn tardó unos 2,5 años con propulsión iónica entre Vesta (septiembre de 2012) y Ceres (marzo de 2015) ([NASA, Dawn](https://science.nasa.gov/mission/dawn/)). Con la nodriza, 10⁶ km a 1,1·10⁻⁴ m/s² serían 2·√(d/a) ≈ 220 días. El juego usa la física real sobre la distancia comprimida (horas), y la regla de la cámara rápida con tope sirve igual para viajes más largos: cualquier viaje dura como mucho 75 s en pantalla.

## Un reloj para todo el mundo

Durante un viaje comprimido, el bucle principal usa la cámara rápida del viaje como paso del mundo (`worldStep`):

- **Reloj de la misión** (física de vuelo, giro de los asteroides, ira de los asteroides y su calma, batería de la sonda, propulsión de la nano_net): avanza tiempo × cámara rápida. Acoplada, la física da todos los pasos de golpe (`FlightComputer.update`), así que ×600 no cuesta nada.
- **Vida a bordo** (tripulación, huerto, animales, biorreactor, nano_net) y **estación** (máquinas, buzón de importaciones del Santuario y biosistemas): ya van a su propio ritmo, un día cada 40 s reales (×2160). Durante el viaje avanzan max(su ritmo, el tiempo del viaje). Con ×600 nada cambia; un viaje que comprimiera más que ×2160 los arrastraría con él, así que a bordo nunca pasa menos tiempo que en el viaje.
- **Servicios de los asteroides** (paquetes de nivel 2 y 3, confianza que devuelve el servicio, extracción de nivel 4): van con la estación; solo su movimiento va con el reloj de la misión. Los tres relojes salen de `frameClocks` (mismo fichero) y los prueban los casos CV de [docs/qa](../qa/README.md).
- **Tiempo ×10/×50 a mano** (fuera de un viaje): acelera igual el reloj de misión, la vida a bordo y la estación (decisión HC-01): con ×10 un día de a bordo dura 4 s reales.
- **Amenaza durante un viaje** (decisión HC-03): si la ira va a por la nave que viaja (un proyectil hacia ella, una embestida, un asteroide que la persigue o la tiene a su alcance; `AsteroidWrath.threatened`), el viaje baja a **×1** con el aviso «⚠ Amenaza: viaje a ×1 hasta que pase», el reloj de la cámara rápida no cuenta esos segundos y, al pasar la amenaza, el viaje sigue con su cámara rápida. Así una embestida en el tramo del módulo avisa sus 5 s reales y se puede esquivar.

## Archivos

- Dominio: `src/modules/navigation/domain/travel-time.ts` (tope, reparto entre tramos, `TravelClock` con sus estados en-ruta → llegada / cancelado, `worldStep`).
- Casos de uso: `navigator.ts` (cámara rápida de nodriza y módulo, `lapse`, ETA real en `progress()`, puerto `busy`), `probe-trip.ts` (viajes de la sonda: retos, lanzamiento, piloto automático, vuelta a la bahía), `hop.ts` (planificación común del salto) y `autopilot.ts` (ganancias por vehículo).
- Interfaz: `src/ui/trip-chip.ts` y `trip-chip.css` (ficha de viaje), `src/adapters/three/trip-preview.ts` (vista en directo), `src/probe-travel.ts` (botones de la consola de la sonda), `src/navigation.ts` (hoja de retos compartida) y `src/main.ts` (reloj del mundo).

Capturas (`docs/screenshots/viajes-*-mobile.png` en iPhone 13 y `viajes-*-desktop.png` a 1280×800):

1. `viajes-1`: retos del viaje de la nodriza.
2. `viajes-2`: ficha de viaje en la cabina.
3. `viajes-3`: «Ver»: la nodriza en directo.
4. `viajes-4`: en el interior durante el viaje, con la ficha y la vista.
5. `viajes-5`: llegada a 300 m, mandos manuales.
6. `viajes-6`: consola de la sonda con «Programar viaje a…».
7. `viajes-7`: la sonda volando sola.
8. `viajes-8`: en el puente, «Ver» la sonda.
9. `viajes-9`: la sonda espera a 300 m: posarla a mano o por programa ([aterrizaje.md](aterrizaje.md)).

Cada paso bien respondido al programar el viaje dibuja su parte del plan (ruta, empuje, llegada, punto de frenado): [aterrizaje.md](aterrizaje.md#cada-paso-se-ve).
