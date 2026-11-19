# Santuario 3 · fase 6: el lanzamiento (`s3-lanzamiento`)

La última fase de la iniciación ([santuario3-iniciacion.md](santuario3-iniciacion.md) §4 y §5.3): los puestos 10 y 13, su
propio lanzamiento en una Crew Dragon sobre un Falcon 9 desde la plataforma de tripulación, la cita con la Starship en
órbita baja y el paso al santuario 6. Recorrido: PX-48 `iniciacion-completa`. Casos: AER-27 a AER-30.

Código: `application/launch.ts` (los retos), `domain/launch-sequence.ts` (el orden del día), `data/facts.ts`
(`ELECTRON_COUNTDOWN`, `ELECTRON_FLIGHT`, `CREW_DAY`, `RENDEZVOUS`, `BENNU_TRIP`), `data/stages.ts` (puestos 10 y 13 y
`launchStage`), `adapters/three/s3-launch.ts` (el Electron, el Falcon 9, el brazo, la pantalla de la Dragon),
`saves/domain/launch-handover.ts` (del 3 al 6), `src/bennu-cruise.ts` (el crucero).

## Puesto 10: un Electron desde el control de misión

- **Dónde**: en el control de misión de la isla de entrenamiento, sentada en el puesto del director de vuelo (FLIGHT). El
  árbol de la lanzadera tiene su piso de control, pero está a menos de 300 m del Electron: la regla de distancia lo vacía
  al lanzar (como Rocket Lab, que lanza desde lejos de la plataforma, y Sea Launch, con la gente a 5 km). **Decisión
  nuestra**, por la regla.
- **Quién**: Luciana (en Cold Sanctuary, piloto y control de misión de la lanzadera: `Professions.cs`), todo el día.
- **Reto**: la cuenta atrás de Rocket Lab en orden (T−6 h carretera cerrada … T−2 s encendido de los 9 Rutherford), con la
  trampa de cargar el oxígeno con gente en la plataforma, y la distancia de seguridad del Electron con la regla de Cold
  Sanctuary (20 % del propulsante en TNT, 15,87·∛TNT, +50 %): **unos 300 m**.
- **Se ve**: en la pantalla grande del frente, el Electron en la corona de la lanzadera desde una cámara a la distancia de
  seguridad: carga, despega y sube. La aceleración que se ve es nuestra (solo el aspecto).
- Fuentes: [NZ Herald, la cuenta atrás de Rocket Lab](https://www.nzherald.co.nz/hawkes-bay-today/news/rocket-lab-countdown-what-you-need-to-know/FJQCE7IZFILXJALXBTI5TYMUMQ) (real), Cold Sanctuary `LaunchHeightRule` (real: FAA 14 CFR 420).

## Puesto 13: el traje

- **Dónde**: la sala de trajes de la isla de entrenamiento (148, −106), como la del edificio de la tripulación (Neil
  Armstrong O&C) el día del lanzamiento: el traje hecho a medida, los sillones reclinables donde se conecta y se
  comprueban las fugas, las taquillas y el puesto de pruebas. La distribución es **nuestra**.
- **Quién**: Irosene (letras y textil en Cold Sanctuary: el traje a medida), todo el día.
- **Reto**: ponerse el traje, guantes y casco, conectar el umbilical, comprobar fugas y salir; la trampa es salir sin
  comprobar las fugas (la misma regla que el EMU, [paseo-espacial.md](paseo-espacial.md)). La pregunta: sale a T−3 h 22 min
  (Crew-5), ¿cuánto falta para el despegue?
- **Antes**: el traje espera a los puestos 1–12; la tarjeta dice cuáles faltan.
- Fuentes: [Spaceflight Now, Crew-5](https://spaceflightnow.com/2022/10/05/crew-5-mission-timeline/), [Everyday Astronaut, Demo-2](https://everydayastronaut.com/crew-dragon-timeline/) (unos 38 min de traje).

## Su día de lanzamiento, en la plataforma

A la plataforma se va **en helicóptero** desde la navegación (por reto o a mano, como todo vuelo). En la torre,
«Empezar el lanzamiento» (solo con el traje). La tripulación es ella: nadie da estos retos. Cada paso es un reto y se
encadena con el siguiente; un reto sin terminar **suspende** el lanzamiento (vuelve a la cubierta y se empieza desde la torre).

| Paso | Reto (pasos reales) | Pregunta | Se ve | Fuente |
| --- | --- | --- | --- | --- |
| Torre | T−2 h 55 min sube; T−2 h 40 min por el brazo a la sala blanca; entra con el asiento recto; comunicaciones; reclinar; fugas; escotilla a T−1 h 55 min. Trampa: cerrar sin comprobar fugas | Espera atada: 1 h 55 min | El brazo de acceso y la sala blanca a la altura de la escotilla; ella en su asiento | Crew-5, Demo-2, [NASA, la sala blanca](https://www.nasa.gov/blogs/commercialcrew/2023/02/26/boarding-process-for-dragon-endeavour-underway/), [Space.com, el brazo](https://www.space.com/41631-spacex-new-astronaut-walkway-launch-pad.html) |
| Cuenta atrás | T−45 min «go»; T−42 min se retira el brazo; T−38 min escape armado; T−35 min RP-1 y LOX; T−19 min LOX de la 2.ª; despegue. Trampa: cargar con el escape sin armar | La distancia del Falcon 9 tripulado con la regla: unos 1,1 km | El brazo que gira hacia la torre; el despegue | Crew-5 |
| Ascenso | Max-Q T+1:02, MECO 2:36, separación 2:39, SECO 8:49, la Dragon sola a los 12 min. Trampa: separar con los motores encendidos | En órbita a los 8 min 49 s | La 1.ª etapa que cae, después la 2.ª: la Dragon sola | Crew-5 |
| Cita | Encendidos de 16,11, 44,2 y 57,89 m/s; «go» para la esfera de 400 m; Waypoint 0 (400 m), 1 (220 m), 2 (20 m); contacto a 0,05–0,10 m/s. Trampa: entrar en la esfera sin «go» | Δv total: 118,2 m/s | La pantalla de la Dragon ante su asiento con la cámara de acople en cada waypoint | Demo-2 (Everyday Astronaut) |

**«Manual»** (el ajuste de los vuelos): la cita se hace a mano desde el Waypoint 2 (20 m) con la misma pantalla táctil y
los límites del IDSS que el simulador del puesto 8 (`dockPractice(20)`). Fuera de límites o sin terminar: se suspende.

## Del 3 al 6 y el crucero a Bennu

- Acoplada, la ranura de la partida pasa a **nivel 6** con un traspaso (`launchHandover`): los días, los puestos y el
  crucero por hacer. `checkSpaceState` lo acepta. La página se recarga y sigue sola en el 6 (`sessionStorage`
  `codeship.seguir`), sin la pantalla de inicio; desde el primer guardado del 6 la ranura tiene su estado completo
  ([partidas.md](partidas.md), «Del 3 al 6»).
- En el 6 empieza una partida nueva con ella en la cubierta de vuelo de la Starship y el **crucero a Bennu**: 816 días
  reales (lo que tardó OSIRIS-REx, [NASASpaceflight](https://www.nasaspaceflight.com/2018/12/osiris-rex-arrives-asteroid-bennu/)),
  a ×60 con el tope de 10 min de los viajes ([viajes.md](viajes.md)). Mientras, las tareas de a bordo; los asteroides no se
  ven hasta llegar. El 6 se sigue empezando también desde la pantalla de inicio.

## Lo nuestro y lo que falta (huecos)

- **Nuestro**: el control del puesto 10 en la isla de entrenamiento; la sala de trajes y su distribución (los sillones salen
  de las fotos de la Demo-2; su sitio no); el helicóptero a la plataforma (la tripulación real va en coche a la 39A); la
  plataforma en el mar en lugar de la 39A (licencia); la forma de la torre, del brazo y de la sala blanca; la altura de la
  escotilla sobre el maletero; las aceleraciones que se ven al despegar; la Starship como blanco de la cita (la Dragon real
  se acopla a la ISS); el crucero de la Starship con la duración de OSIRIS-REx (licencia); el crucero apretado en 10 min.
- **Sin fuente**: los límites de viento y nubes del Electron (Rocket Lab no los publica: el reto no los usa); el empuje al
  despegar del Electron y del Falcon 9 (no se usan: la aceleración que se ve es nuestra).
- **Hecho (2026-11-19)**: el crucero se guarda con la partida y, si se recarga a medio crucero, «Continuar» sigue
  donde estaba ([partidas.md](partidas.md), «Viajes en marcha»); durante el crucero el LM no se desacopla (el interruptor
  dice por qué) ni se programa otro viaje. La ficha del crucero sale solo en el puesto de pilotaje; en cualquier sitio,
  «Trayecto» en el menú.
- Quién da cada puesto (Luciana el 10, Irosene el 13, Andrea pasa al 3) es **licencia**: Cold Sanctuary da los oficios.
