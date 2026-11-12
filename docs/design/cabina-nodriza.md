# El puente de la nodriza

Petición de diseño (2026-11-12): «En la cabina de la nodriza podemos reconstruir los mandos y paneles reales, y el mapa podría ser uno de los paneles, o proponer una opción mejor».

**Propuesta:** un puente de «cabina de cristal» como el de Orion y Crew Dragon, con seis páginas de pantalla y una barra de estado fija. El mapa de navegación es una de esas páginas: es el mismo componente que el mapa de la cabina de la sonda, montado dentro del panel. La nodriza no se pilota a mano. Sus propulsores eléctricos empujan durante horas o días, así que el puente no tiene palancas de mando: tiene pantallas para planificar el viaje y para vigilar la propulsión, la energía y el hábitat.

Código: `src/modules/flight-deck/application/panels.ts` (modelos de vista con tests), `src/flight-deck.ts` (la pantalla), `src/ui/flight-deck.css`. El mapa de `src/ui/nav-map.ts` ahora se puede montar en un panel (`NavMap.mount`).

## Qué hacen las naves de verdad

| Nave | Cómo es | Qué tomamos |
| --- | --- | --- |
| **Crew Dragon** (SpaceX) | Tres pantallas táctiles grandes delante de los asientos. Cada una muestra varias páginas: guiado, entorno, sistema eléctrico… Hay una página general de sistemas y desde ella se entra en 25–30 páginas de detalle. Los botones son «teclas» de la pantalla, sin tacto físico ([TIME, 2021](https://time.com/6083975/inside-spacex-crew-dragon-spacecraft/)) | Una página resumen por sistema que se abre a una página de detalle. Es justo lo que hace el móvil: mosaico → pantalla completa |
| **Orion** (NASA/Lockheed Martin) | Pantallas Honeywell DU-1310. De los ~2000 interruptores del transbordador solo quedan 56 físicos; el resto son iconos. Cada asiento tiene un mando de cursor junto a la rodilla ([Design News](https://www.designnews.com/aerospace/exclusive-closer-look-nasas-orion-glass-cockpit)). Un astronauta habla de «unos 30 interruptores» ([Space.com](https://www.space.com/artemis-orion-spacecraft-digital-age-cockpit)) | Pocos mandos, todo en páginas. En escritorio el ratón hace de mando de cursor |
| **Orion / Artemis / Gateway**: norma de pantallas | Rasgos comunes: una pantalla de **resumen del sistema**, el enfoque **«quiet/dark»** (el color se reserva para fallos y alertas) y una **barra de estado** con los parámetros clave siempre a la vista. Gateway quiere ser coherente con Orion y también usa portátiles ([NASA, taller CLD HSI 2024](https://ntrs.nasa.gov/api/citations/20240003566/downloads/CLD%20HSI%20Workshop%20Crew%20Interfaces.pdf)) | La barra de estado de arriba; gris sobre negro, y color solo para lo que no está bien (cian nota, ámbar precaución, rojo aviso) |
| **ISS** | Se manda sobre todo desde tierra y la interfaz principal de la tripulación es un portátil comercial. Sus pantallas siguen la norma SSP 50313 (Display and Graphics Commonality Standard) ([NASA, taller CLD HSI 2024](https://ntrs.nasa.gov/api/citations/20240003566/downloads/CLD%20HSI%20Workshop%20Crew%20Interfaces.pdf); [proceso de pantallas de la ISS, 2022](https://ntrs.nasa.gov/api/citations/20220004586/downloads/ISS_Displays_StandardsProcessOverview_April2022.pdf)) | Una nave grande y lenta se vigila más de lo que se pilota: páginas por sistema, no palancas |
| **Soyuz TMA** (consola Neptun-ME) | Una sola pantalla con 58 formatos en menús. El primero es el básico, con un campo fijo de actitud, hora y parámetros de seguridad. Los datos se introducen en formatos de pantalla, y las órdenes tienen protección mecánica contra activaciones por error ([Tiapchenko, «Computing in the Soviet Space Program»](https://web.mit.edu/slava/space/essays/essay-tiapchenko4.htm)) | El campo fijo (nuestra barra de estado) y la idea de que una orden importante no se da sin querer: programar el viaje sigue pasando por los retos de código |
| **Gateway PPE** (la nave eléctrica real más parecida) | 60 kW para propulsores Hall: tres AEPS de 12 kW y cuatro BHT-6000 de 6 kW, con 2770 kg de xenón ([Herman et al., IEPC-2022-465](https://ntrs.nasa.gov/api/citations/20220009251/downloads/Herman%20IEPC-2022-465%20Presentation%20Rev02.pdf)) | La página de propulsión cuenta propulsores encendidos, empuje, xenón y Δv, igual que la telemetría de una matriz de propulsores eléctricos |

La nodriza es unas 30 veces más potente que el PPE: 18 X3 a 99 kW (1,78 MW) con un reactor de 2 MWe ([nave-nodriza.md](nave-nodriza.md)).

## Las seis páginas

Cada página lleva el código de su sistema, como en las naves reales: NAV, PROP, EPS/TCS (energía y control térmico), ECLSS (soporte vital), DOCK, COMM. Todos los números salen de los objetos del dominio en cada refresco (cada 0,25 s). Ningún número está escrito a mano en la pantalla.

| Página | Qué muestra | De dónde sale |
| --- | --- | --- |
| **Navegación** | El mapa de la región con todas sus funciones: girar, acercar, elegir un destino, fijarlo, programar el viaje y abrir «Misiones». Encima, una franja con el viaje en curso | `NavMap` (el mismo de la cabina de la sonda) y `Navigator.progress()` |
| **Propulsión** | Las 18 toberas en dos módulos de 9, encendidas mientras la nodriza acelera o frena (apagadas al dar la vuelta). Empuje, Δv restante (Tsiolkovsky), xenón, caudal por propulsor (ṁ = F / (Isp·g₀) ≈ 245 mg/s), masa, aceleración y días de empuje que quedan | `Mothership` y su ficha `NODRIZA` |
| **Energía y calor** | Reactor de 2 MWe (5,9 MWt con la conversión Brayton del 33,7 %), reparto entre propulsores (1782 kW si están encendidos) y el resto de la nave, calor a radiar (3,93 MW) y carga de los radiadores (1,43 kW/m² en 2760 m²) | `Mothership.wasteHeatKw` y la ficha de energía (Harnack et al. 2022) |
| **Vida y hábitat** | Giro del anillo, gravedad en el suelo, velocidad de la llanta, bienestar, saciedad y forma de Doménica, días en ingravidez, plantas vivas y listas para cosechar, superficie de cultivo y cuánta comida cubre, animales y máquinas en marcha | `SpinRing`, `Habitat` |
| **Acople** | Acoplada o no. Si está fuera: distancia al puerto, asistente y la comprobación de cada condición de contacto (cierre, desvío, inclinación y alabeo) frente a los límites IDSS. También el casco y los tanques de la sonda | `Docking`, `IDSS_CONTACT_LIMITS`, `Ship` |
| **Radio y misiones** | La misión principal activa de Nevaeh, con botones a «Registro de misiones» y «Ver en el mapa». Debajo, los mensajes recibidos (sin leer, con misión), que se leen dentro del panel | `MissionLog` (modules/missions), `Mailbox`. El registro es el mismo de la cabina (`src/ui/mission-log.ts`) |

**Alertas:** la barra de estado enumera las alertas de la más grave a la menos grave, y el marco de cada página toma el color de su peor alerta. Si todo va bien, se lee «Sin avisos» (quiet/dark). Los umbrales son valores de juego: xenón por debajo del 20 % (precaución) y del 5 % (aviso), máquinas averiadas, bienestar por debajo del 35 %, huerto por debajo del 80 % de la comida, anillos sin la velocidad de crucero, sonda fuera, casco de la sonda por debajo del 50 % y mensajes sin leer. Tocar una alerta abre su página.

## Cómo se usa

- **Entrar:** desde el eje del anillo, flotando por la espina hasta la escotilla verde lateral «Puente de mando», que da al botón «Ir al puente de mando». Desde la cabina de la sonda acoplada también vale el botón **Puente de la nodriza**. Sin acoplar no hay puente: Doménica está en la sonda.
- **Escritorio:** la ventana de proa (la escena 3D real, vista desde el nodo delantero) y debajo la consola con las seis páginas a la vez. La de navegación, en el centro y más grande, se usa allí mismo. ⤢ abre cualquier página a pantalla completa y ‹ o Esc vuelve.
- **Móvil:** la barra de estado, una franja de ventana y un mosaico de 2 × 3 resúmenes (3 × 2 en horizontal). Un toque abre la página a pantalla completa y entonces se puede usar entera. En la de navegación aparece el mapa, con todas sus funciones.
- **M y «Mapa»:** en la cabina de la sonda abren el mapa superpuesto, como antes. En el puente, M abre y cierra la página de navegación.
- **Programar un viaje** desde el puente usa los mismos retos de código. Mientras la nodriza viaja se ven las toberas encendidas, el empuje y el reparto de energía. Al aparcar, la sonda se desacopla y sigue sola: el puente se cierra y Doménica baja a la sonda, con el aviso «La nodriza ha aparcado: bajas a la sonda…».
- **Volver** (o Esc) lleva de vuelta a donde estaba: el eje o la cabina de la sonda.

## Licencias

- **Gravedad en el puente:** el puente está en la parte que no gira, junto al nodo delantero, así que allí se está en ingravidez, igual que en la espina.
- **«Resto de la nave»** es lo que sobra de los 2 MWe cuando los propulsores están encendidos. No modelamos el consumo de cada sistema.
- La **ventana de proa** es una licencia: los puentes reales de Orion y Dragon tienen ventanas pequeñas, pero en el juego la ventana sirve para ver adónde va la nave.

## Preguntas abiertas

1. ¿Debe poder **desacoplarse la sonda** desde la página de Acople? Ahora solo informa: se desacopla desde la cabina de la sonda (K), porque Doménica tiene que estar dentro.
2. Al llegar la nodriza, el **relevo automático a la sonda** saca a Doménica del puente. ¿Preferimos que se quede y que la sonda siga sola sin ella, como un dron?
3. Cuando el equipo de la estación termine la estación física y el atraque, la página de Acople podría mostrar también el puerto de la estación.
4. ¿Merece la pena una maqueta 3D de la consola, con las pantallas como texturas, o basta la ventana 3D con la consola HTML, que se puede usar con el dedo?
