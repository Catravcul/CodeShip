# Navegación: mapa, destinos y viaje programado

Petición de Berón: «Hay que poder elegir asteroides. Recuerda los retos de código para mandar la nave automáticamente al asteroide elegido. ¿Un mapa u otra interfaz cómoda?».

El diseño original ([bucle-de-juego.md](bucle-de-juego.md)) ya decía que los viajes largos se programan, resolviendo la maniobra como un puzle, y que después vuela el piloto automático. Cerca del asteroide se pilota a mano y hay que aterrizar para empezar el duelo. Con la nave nodriza ([nave-nodriza.md](nave-nodriza.md)), el tramo largo lo hace la nodriza con el módulo de aterrizaje acoplado.

## Cómo se juega

1. El mapa está en el **puente de la nodriza** (página NAV, o M en el puente; también desde la consola de navegación del anillo). En la cabina del módulo de aterrizaje ya no hay botón **Mapa** ([accesos.md](accesos.md)).
2. El mapa es un esquema en 3D de la zona de vuelo, como los planos de órbitas. Cada cuerpo aparece sobre un palito que baja hasta el plano de referencia, así se ve a qué altura está. Se gira arrastrando, **Cenital** lo pone visto desde arriba y **+ / −** acercan o alejan. Están dibujados los anillos de 5 km, el borde de la zona (20 km), las rocas procedurales (en tenue), el módulo (triángulo amarillo con la proa), la nodriza (cuadrado ámbar) y la ruta planeada.
3. Debajo (en el móvil) o a la derecha (en el escritorio) hay una fila con los destinos: Bennu y los seis asteroides reales de la familia de Nueva Polana. Tocar un asteroide del mapa o de la fila abre su ficha.
4. La ficha muestra datos reales y lo que costará llegar:
   - tipo espectral; en los miembros de la familia está inferido del albedo NEOWISE, porque no hay espectro;
   - medidas y diámetro equivalente;
   - rotación, medida o como valor de juego si no hay curva de luz;
   - masa, que en los miembros se calcula con su diámetro y la densidad de Bennu, una suposición que se indica;
   - gravedad en la superficie y velocidad de escape;
   - distancia a la superficie;
   - recursos según su composición, con la riqueza;
   - el duelo que espera: dificultad, ideas para persuadirlo, paciencia y el concepto más alto del índice de estudio, todo con `duelProfileFor` igual que en el duelo;
   - el viaje, con la distancia, el Δv y la duración;
   - un enlace a la fuente.
5. **Fijar destino** lo convierte en el objetivo para volar a mano. **Programar viaje** lo fija y abre la cadena de retos.
6. Si se resuelve la cadena (se permiten dos fallos), el piloto automático hace el viaje. Si se falla, no hay piloto automático, pero se puede volar a mano o volver a programar.
7. El piloto automático devuelve los mandos a unos **300 m de la superficie**, con la nave parada y apuntando al asteroide. A partir de ahí se aterriza a mano, igual que en Bennu, y con la nave anclada aparece **Entrar en su mente**.

### Quién viaja

- **Módulo acoplado y destino lejano.** Viaja la **nodriza**: gira hacia el destino, empuja con sus 18 propulsores Hall X3 la mitad del camino, da la vuelta y frena la otra mitad. Aparca a 1350 m de la superficie (`Mothership.parkingPoint`) y gasta el xenón real del viaje (`burn`). Al llegar, el módulo se desacopla y su piloto automático vuela los últimos ~1,05 km hasta 300 m.
- **Módulo libre, o la nodriza ya aparcada cerca** (por ejemplo, al empezar junto a Bennu). Si hace falta, el módulo se desacopla y vuela solo todo el viaje con su motor R-4D.

La franja de **Piloto automático** o **Nodriza en viaje**, bajo la etiqueta de la zona, muestra la fase, la velocidad, lo que falta, el tiempo restante y una barra de progreso. Tiene el botón **Tomar el mando**, y tocar cualquier mando también devuelve el control.

### Tiempo

Los viajes programados vuelan solos en cámara rápida y nunca duran más de 75 s reales; mientras tanto se puede hacer cualquier otra cosa, con la ficha de viaje y la vista en directo («Ver»). Todo en [viajes.md](viajes.md). Con la nodriza, un salto de 9 km (unas 5 horas de empuje Hall) se ve en unos 30 s.

## Los retos del viaje

Son cinco, uno de cada tipo, con los números reales de ese viaje.

| Tipo | Módulo de aterrizaje (motor químico) | Nodriza (propulsión eléctrica) |
| --- | --- | --- |
| Ordenar | orientar, encender *n* s hasta *v*, navegar sin empuje, dar la vuelta, frenar hasta 300 m (trampa: «frenar con la proa hacia el asteroide») | orientar, empujar media ruta, dar la vuelta, frenar hasta aparcar, desacoplar, volar el módulo a 300 m (trampa: «apagar a mitad de camino y esperar») |
| Completar | Δv = 2 × crucero (acelerar y frenar) | Δv = **2** × √(d · a) |
| Predecir | t = d / v + v / a, con a = 490 N / masa actual | t = 2 · √(d / a) |
| Reparar | `distFrenado = v / (2 × a)` → `v² / (2 × a)` | `voltear()` a d / 4 → a d / 2 |
| Especificar | la orden precisa para la IA: 300 m, sin chocar, parar, apuntar y devolver los mandos | la orden precisa: aparcar, parar, desacoplar, acercar el módulo y devolver los mandos |

Se usan las cifras reales del motor de la nave y de su masa en ese momento, con el combustible que lleve. Si se cambia el motor en la bahía, cambian los números de los retos.

## Física y guía

- **Plan del módulo** (`planTransfer`): crucero = min(25 m/s, mitad del Δv disponible / 2, √(a·d)), redondeado a m/s enteros. Encendido v/a, crucero sin empuje, vuelta, frenado v/a. El tiempo es d/v + v/a.
- **Plan de la nodriza** (`planContinuousBurn`): sin tramo de crucero. La velocidad máxima es √(d·a), el tiempo 2√(d/a) y el Δv 2√(d·a).
- **Ruta** (`planRoute`): si la línea recta choca con una roca o con otro asteroide (su casco × 1,4 más el margen, como la regla anticolisión de la zona), se pone un punto de desvío al lado y se vuelve a comprobar cada mitad. Para la nodriza se ensancha cada obstáculo con su tamaño (anillos de 56 m y espina de 152 m).
- **Guía del módulo** (`TripAutopilot`): sigue la velocidad deseada a lo largo de la ruta, que es min(crucero, √(2·0,8·a·distancia restante)). Descuenta lo que se recorre mientras da la vuelta, que se calcula con el par real de los RCS y la inercia de la nave. Los errores grandes se corrigen con el motor principal, después de girar la proa hacia ellos; los pequeños, con los RCS. Al llegar quita la velocidad que queda, apunta al asteroide y devuelve los mandos. Por seguridad, nunca baja de 150 m.
- En el `FlightComputer`, la guía del viaje (`engage`/`guidance`) va antes que el asistente de acople (`autopilot`, de la nodriza). Las dos se encadenan sin pisarse.

## Cualquier asteroide es un destino real

- `Expedition.retarget(asteroid)` cambia el objetivo de la visita: la telemetría, el contacto con las patas, el asistente de aterrizaje, la gravedad local, el giro de la superficie y el duelo pasan al nuevo asteroide. No se puede cambiar estando anclado, en un duelo o huyendo de un asteroide furioso. Un asteroide ya persuadido no vuelve a dar sus recursos.
- Los seis miembros de la familia usan la misma forma procedural para la malla y para la superficie donde se posa la nave (`memberShapeParams`). Se aterriza sobre su forma, no sobre una esfera.
- La regla anticolisión de la zona deja tocar el objetivo actual y trata como obstáculos a todos los demás, Bennu incluido.
- La dificultad del duelo sale de la masa y la riqueza, como antes. Los miembros de la familia son unas 15–125 veces más masivos que Bennu y dan duelos algo más largos.

Por ahora el paseo espacial (EVA) y el núcleo de la nano_net siguen siendo solo de Bennu: el traje y sus retos están hechos con la gravedad y la superficie de Bennu.

## Ampliaciones previstas

`NavTarget` es una unión con un único caso por ahora: `{ kind: "asteroid" }`. Para volver a la nodriza se puede añadir `{ kind: "dock" }` con su propio `FlightTarget` y su regla de llegada: entregar los mandos en el punto de aproximación del puerto y que el asistente de acople haga el resto.

## Archivos

- `src/modules/navigation/domain/`: `transfer.ts` (planes), `route.ts` (desvíos), `attitude.ts` (orientación hacia un rumbo) y `nav-target.ts`.
- `src/modules/navigation/application/`: `autopilot.ts` (guía del módulo), `carrier-trip.ts` (viaje de la nodriza), `trip-chore.ts` (retos), `navigator.ts` (caso de uso) y `mothership-carrier.ts`.
- `src/ui/nav-map.ts` y `nav-map.css` (mapa y ficha), y `src/navigation.ts` (botón Mapa, tecla M, retos y franja del piloto automático).

Capturas: `docs/screenshots/mapa-*.png`.
