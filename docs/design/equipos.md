# Equipos de la tripulación

Cómo se ven y cómo se usan las máquinas de las áreas de tripulación de la Starship y de la estación ([reglas.md](reglas.md) §4.5: «cada equipo se ve como el real […] y cada uno tiene su propia animación»; §6.0: las instalaciones funcionan en todos los vehículos que las tienen). Recorrido: PX-38 (`equipos`). Capturas: `docs/screenshots/equipos-*-movil.png` y las hojas `equipos-hoja-maquinas.png`, `equipos-hoja-esterillas.png` y `equipos-hoja-aqh-refugio-aseo.png`.

## Etiquetas

- **Real**: la máquina vuela (o voló) en la ISS y se ve en la estación tal cual.
- **Licencia: equivalente de la ISS**: la Starship no tiene interior publicado, así que en sus cubiertas van las mismas máquinas de la ISS. Lo dice la ficha de cada una.
- **En desarrollo**: un concepto propuesto para vuelos largos (el refugio de agua).
- **Medida nuestra**: las medidas que no están publicadas se han sacado de las fotos de la NASA y de JAXA; la nota de cada medida lo dice (`src/modules/wellness/data/gear.ts`).

## Las máquinas

Los datos (qué es, medidas, etiqueta y fuente) están en `src/modules/wellness/data/gear.ts`. Los modelos 3D, en `src/adapters/three/interior/crew-gear.ts` y `aqh-model.ts`. La figura se dibuja a tamaño real, así que lo que toca su cuerpo (banda, pedales, barra, esterilla) también va a 1×. El resto de la máquina sigue la escala de presentación de la estación (1,5×).

| Equipo | Etiqueta | Medidas (an × al × fondo) | Qué se ve | Animación | Fuente |
|---|---|---|---|---|---|
| Cinta T2 (COLBERT) | real (estación) · licencia (Starship) | 0,8 × 0,35 × 1,9 m (medida nuestra) | Banda, barandillas y pantalla; arnés de hombros y cintura con dos gomas a cada lado | Carrera en el esqueleto (`carrera-t2`); la banda corre y las gomas siguen la pelvis | [T2](https://en.wikipedia.org/wiki/Treadmill_with_Vibration_Isolation_Stabilization), [Sprint](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884) |
| Bicicleta CEVIS | real · licencia | 0,5 × 1,3 × 0,8 m (medida nuestra); 26,8 kg | Base con aisladores, volante, bielas y manillar; sin sillín | Pedaleo (`pedaleo-cevis`): pies en los pedales y manos en el manillar por IK; las bielas giran con su fase | [Danish Aerospace](https://danishaerospace.com/en/products-sep/cevis) |
| ARED | real · licencia | 1,6 × 1,9 × 1,0 m (medida nuestra) | Plataforma, dos cilindros de vacío, volantes de inercia y la barra en su brazo | Sentadilla (`sentadilla-ared`): la barra sobre los hombros sigue sus manos | [ARED](https://en.wikipedia.org/wiki/Advanced_Resistive_Exercise_Device) |
| Esterilla | licencia | 0,6 × 1,8 m | Esterilla sujeta a la pared con cintas y lazos para los pies | Loto (ajustes) y yoga sobre ella, orientada a su pared; la cámara toma la pared por suelo | [Ejercicio en la ISS](https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884) |
| Hábitat acuático (AQH) | real | 2 cámaras de unos 15 × 7 × 7 cm (unos 0,7 L) | Bastidor con bandeja, dos cámaras con agua y algas, LED de día y noche, cámaras de vídeo, filtro, comedero y tuberías; medakas (3,5 cm) y caracoles a tamaño real | Pienso, escobilla en el cristal y brillo de un programa, paso a paso; los peces nadan en cada cámara | [AQH](https://www.universetoday.com/96475/fish-in-space-space-station-gets-an-aquarium/) |
| Refugio de tormenta solar | en desarrollo | 1,05 × 2,0 × 0,86 m (tamaño de bastidor) | Cubículo que sale de la pared, forrado de bolsas de agua azules, con la puerta enrollada, marco amarillo, dosímetro y cinta | «Resguardarse»: flota dentro unos segundos | [RadWorks, NTRS 20150001237](https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf), [Orion](https://www.space.com/space-exploration/artemis/how-the-artemis-2-astronauts-could-weather-a-solar-storm-during-their-moon-mission) |
| Aseo (WHC) | real | 1,0 × 1,9 × 0,75 m (tamaño de bastidor, medida nuestra) | Embudo y manguera con aire, asiento con barras para los muslos y cortina | «Asearse»: ante el WHC, toalla a la cara, los brazos y el pelo | [Tranquility](https://en.wikipedia.org/wiki/Tranquility_(ISS_module)) |
| Estiba (bolsas CTB) | real | 0,5 × 0,25 × 0,43 m por bolsa | Bolsas blancas sujetas con cintas | Ninguna (es estiba; su ficha informa) | [NTRS 20160002631](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20160002631.pdf) |

Las animaciones de ejercicio están en `src/modules/body/data/exercise-motions.ts`: son claves por articulación sobre el esqueleto de Cold Sanctuary, con el mismo convenio que las asanas, y las reproduce `MotionPlayer`. Los ángulos de cada clave son nuestros, sacados de cómo se ve el movimiento: licencia de animación. Cada acierto del reto sube el ritmo un momento, como un intervalo.

## Dónde están

| Equipo | Starship | Estación |
|---|---|---|
| T2 | Cubierta 3, en el suelo | Tranquility, en el suelo, cruzada en el módulo (lejos del hueco de la Cupola) |
| ARED | Cubierta 3, babor | Tranquility, pared de popa |
| CEVIS | Cubierta 3, estribor | Destiny, estribor (el único sitio con 2 m de separación) |
| Esterilla | Cubierta 1 | Destiny |
| AQH | Cubierta 3 | Kibo |
| WHC | Cubierta 2 | Tranquility |
| Refugio | Cubierta 2 | No hay: la ISS no tiene refugio dedicado; la tripulación se resguarda en los módulos más blindados |

## Paridad entre la Starship y la estación

Prueba: `src/modules/station/data/parity.test.ts`. Recorrido: PX-38, apartado de paridad.

| Instalación | Starship | Estación | Notas |
|---|---|---|---|
| Cocina | Sí | Sí | Comida de la ISS con su envase (VID-40) |
| Esterilla: ajustes y yoga | Sí | Sí | Ella sobre la esterilla en las dos vistas |
| Ejercicio: T2, CEVIS y ARED | Sí | Sí | Mismos ids (`t2`, `cevis`, `ared`); cada entrenamiento en su máquina |
| Camarotes y dormir | Sí | Sí | Cuatro por vehículo; el suyo es el 1 |
| Aseo (WHC) | Sí | Sí | «Asearse» con animación en los dos |
| Bastidores de soporte vital | Sí | Sí | Los mismos seis; la Starship añade el refugio |
| AQH | Sí | Sí | Una sola colonia, la que se adopta, cuidada en cualquiera de los dos: licencia de juego |
| Catálogo de especies | Sí | Sí | Su terminal en la cubierta 2 o en Kibo |
| Enfermería | No | No | Ninguna de las dos la tiene; queda en [pendientes.md](../pendientes.md) |

## Auditoría de lo que se toca

Se han revisado los elementos con los que se interactúa en la Starship, la estación y la cabina del LM, buscando los que fueran solo un asidero:

- El antiguo «Ejercicio» de las dos era un bastidor con asideros. Ahora son tres máquinas.
- La esterilla, el hábitat acuático, el aseo y el refugio eran paneles. Ahora tienen su modelo.
- El almacén de la Starship era un panel. Ahora son bolsas CTB.
- La esclusa de la Starship era un frente de bastidor. Ahora es una escotilla con su marco y su asa.
- Las escotillas y puertos de la estación (CBM, PMA, esclusa de Kibo, EVA) ya eran escotillas.
- Las máquinas de la estación (guantera, impresora, AMF, refinería…) son frentes de bastidor con su ventana encendida, como en la ISS.
- Los bastidores de soporte vital, la cocina y el puesto de trabajo usan el kit de bastidores ECLSS.
- La cabina del LM tiene sus paneles reales ([cabina-lm.md](cabina-lm.md)) y su esterilla.

## Versión

Los ajustes generales dicen la versión al pie: hash corto del commit y su fecha. La pone `vite.config.ts` con `define` (`__BUILD_LABEL__`) en el momento de compilar. En el servidor de desarrollo es la del arranque.

## Preguntas para el diseñador

- **AQH compartido**: la colonia es una sola y se cuida desde el AQH de Kibo o desde el de la Starship. ¿Preferirías dos colonias, una por vehículo, cada una adoptada por separado?
- **Refugio solo en la Starship**: la ISS no tiene refugio dedicado. ¿Añadimos en la estación la maniobra real de resguardarse en el módulo más blindado?
- **Asearse** no es todavía un reto de código; solo se anima. ¿Lo convertimos en un reto con sus pasos (toallitas, champú sin aclarado, el UWMS)?
