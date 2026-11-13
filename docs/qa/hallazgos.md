# Hallazgos

Lo que se vio en una ejecución (de la suite o jugando) y no es simplemente «OK». Los `Hn` no se
renumeran ni se borran: cambia su estado. Un hallazgo que es un fallo pasa a `B-nn` en la tabla de
bugs de [casos.md](casos.md); uno que pide una decisión, a `HC-nn`. Si enseña algo general del motor,
del navegador o de la simulación, se apunta también en [docs/conocimiento/](../conocimiento/README.md).

| Hn | Caso | Run | Qué se vio | Estado |
|---|---|---|---|---|
| H1 | CV-03, CV-04 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) (notas: antes del arreglo) | En 30 s reales de un viaje de la nodriza a ×600 un asteroide de nivel 3 mandó 449 paquetes a la estación (debía mandar 0), uno de nivel 2 llenaba la bodega igual, la confianza subía al tope y la extracción de nivel 4 iba 600 veces más deprisa. Los servicios contaban días con el reloj de misión | **B-01**, arreglado en `qa-casos` (`99b1cef`) |
| H2 | CV-07 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | A menos de 10 fps y con un salto de la nodriza por encima de ×600 la ira se apaga ≈ 9 % más despacio que el reloj de misión: `AsteroidWrath.update` tira lo que pasa de 60 s por llamada | **B-02**, abierto |
| H3 | CV-02 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Con ×50 manual la estación avanza 50 veces más que la vida a bordo, y más que durante un viaje a ×600 | **HC-01**, decisión de diseño |
| H4 | CV-05 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | En diez días de juego la extracción de Bennu mete más de 100 t en el almacén, sin tope | **HC-02**, decisión de diseño |
| H5 | CV-08 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | La cámara rápida de un viaje no mira las amenazas de la ira; la manual sí | **HC-03**, decisión de diseño |
| H6 | CV-10 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Con 1,72 kg de amoníaco, un día de abono deja la hidracina en media tanda; al revés, la hidracina deja los cultivos sin abono | **HC-04**, decisión de diseño |
| H7 | CV-15 | [2026-11-13 10:18](runs/2026-11-13-1018-cv-convivencia-vitest.md) | Resolver el segundo de dos pedidos abiertos sin créditos no hace nada ni dice nada | **HC-05**, abierto |
| H8 | PX-01 | RUNPX | En una cadena de pasos (crema de cacahuete), tocar otra vez la misma opción errónea contaba un fallo nuevo cada vez; al tercero el reto se perdía sin decirlo («inténtalo otra vez») y el «Cerrar» quedaba donde estaban las opciones. | Arreglado: `ChoreRun` ignora una respuesta errónea repetida (`Attempts`), la opción queda marcada ✗, resultado explícito y 0,9 s sin toques. |
| H9 | PX-01 | RUNPX | Barras de aciertos e «Intentos» casi transparentes en la vista HUD; «Intentos» contaba hacia abajo, así que un fallo apagaba una celda (parecía «desmarcarse»). | Arreglado: «Aciertos n/N» y «Fallos n/N» escritos, estilo velocímetro, sobre placa oscura. |
| H10 | PX-03 | RUNPX | Tras ganar un duelo con un asteroide había dos botones para volver («Volver a la cabina» y «Cerrar»). | Arreglado. |
| H11 | PX-03 | RUNPX | El aviso «Misión de Nevaeh cumplida» tapaba el resultado del duelo. | Arreglado: durante un reto baja al pie. |
| H12 | PX-02 | RUNPX | Elegir una tarea flotando en el eje no daba señal y tardaba más de un minuto. | Arreglado: aviso y tirón por los asideros a 1,5 m/s. |
| H13 | PX-04 | RUNPX | Cabina en el móvil: los conmutadores de vuelo tapaban el HUD y la acción principal se perdía entre ellos; región, aviso y ficha de confianza se pisaban. | Arreglado: ☰ Mandos y columna de contexto. |
| H14 | PX-05 | RUNPX | Escritorio: la etiqueta de región tapaba la ficha de confianza; posado, el aviso tapaba ficha y HUD. | Arreglado. |
| H15 | PX-04 | RUNPX | Avisos del interior encima de la lista de tareas. | Arreglado: el tablero cuelga de arriba y los avisos van al pie. |
| H16 | PX-01 | RUNPX | Estado del interior ilegible sobre carteles claros y, con el retrato, demasiado alto en el móvil. | Arreglado: placa oscura; despensa y autosuficiencia plegadas tras un toque. |
| H17 | PX-01, PX-03 | RUNPX | En 390×664 visibles, la tercera opción de una hoja de retos o la bandeja de «ordenar» quedan por debajo del borde: hay que desplazar. | Mejorado (hoja más alta en pantallas bajas); abierto en retos de ordenar largos. |
| H18 | PX-04 | RUNPX | Varios botones medían menos de 44 px en el móvil (Tareas, Radio, ✕ de los tableros, chips, Vista HUD, botones del viaje). | Arreglado: mínimo 44×44 en puntero táctil; la suite lo comprueba antes de cada toque. |
| H19 | PX-02 | RUNPX | En el eje, el cartel 3D «Puente de mando» queda cortado arriba, detrás del estado. | Abierto (cosmético). |
| H20 | todos | RUNPX | En un contenedor sin GPU (SwiftShader) la escena va a 4–14 fps con CPU ×4: los presupuestos de fotograma no se pueden juzgar ahí; memoria (≈55 MB), llamadas de dibujo (≈50) y triángulos (≈105 k) quedan muy por debajo del presupuesto. | Medido; pendiente de una pasada en un móvil o máquina con GPU (`EXPERIENCIA_ESTRICTO=1`). |
