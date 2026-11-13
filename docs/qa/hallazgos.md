# Hallazgos

## Experiencia del jugador (PX)

Hallazgos de las partidas de la suite de experiencia ([px.md](px.md)) y de jugar a mano en el iPhone 13 de Playwright. Detalle y capturas en [../design/ux-acciones.md](../design/ux-acciones.md).

| ID | Recorrido | Hallazgo | Estado |
| --- | --- | --- | --- |
| H1 | PX-01 | En una cadena de pasos (crema de cacahuete), tocar otra vez la misma opción errónea contaba un fallo nuevo cada vez; al tercero el reto se perdía sin decirlo («inténtalo otra vez») y el «Cerrar» quedaba donde estaban las opciones. | Arreglado: `ChoreRun` ignora una respuesta errónea repetida (`Attempts`), la opción queda marcada ✗, resultado explícito y 0,9 s sin toques. |
| H2 | PX-01 | Barras de aciertos e «Intentos» casi transparentes en la vista HUD; «Intentos» contaba hacia abajo, así que un fallo apagaba una celda (parecía «desmarcarse»). | Arreglado: «Aciertos n/N» y «Fallos n/N» escritos, estilo velocímetro, sobre placa oscura. |
| H3 | PX-03 | Tras ganar un duelo con un asteroide había dos botones para volver («Volver a la cabina» y «Cerrar»). | Arreglado. |
| H4 | PX-03 | El aviso «Misión de Nevaeh cumplida» tapaba el resultado del duelo. | Arreglado: durante un reto baja al pie. |
| H5 | PX-02 | Elegir una tarea flotando en el eje no daba señal y tardaba más de un minuto. | Arreglado: aviso y tirón por los asideros a 1,5 m/s. |
| H6 | PX-04 | Cabina en el móvil: los conmutadores de vuelo tapaban el HUD y la acción principal se perdía entre ellos; región, aviso y ficha de confianza se pisaban. | Arreglado: ☰ Mandos y columna de contexto. |
| H7 | PX-05 | Escritorio: la etiqueta de región tapaba la ficha de confianza; posado, el aviso tapaba ficha y HUD. | Arreglado. |
| H8 | PX-04 | Avisos del interior encima de la lista de tareas. | Arreglado: el tablero cuelga de arriba y los avisos van al pie. |
| H9 | PX-01 | Estado del interior ilegible sobre carteles claros y, con el retrato, demasiado alto en el móvil. | Arreglado: placa oscura; despensa y autosuficiencia plegadas tras un toque. |
| H10 | PX-01, PX-03 | En 390×664 visibles, la tercera opción de una hoja de retos o la bandeja de «ordenar» quedan por debajo del borde: hay que desplazar. | Mejorado (hoja más alta en pantallas bajas); abierto en retos de ordenar largos. |
| H11 | PX-04 | Varios botones medían menos de 44 px en el móvil (Tareas, Radio, ✕ de los tableros, chips, Vista HUD, botones del viaje). | Arreglado: mínimo 44×44 en puntero táctil; la suite lo comprueba antes de cada toque. |
| H12 | PX-02 | En el eje, el cartel 3D «Puente de mando» queda cortado arriba, detrás del estado. | Abierto (cosmético). |
| H13 | todos | En un contenedor sin GPU (SwiftShader) la escena va a 4–14 fps con CPU ×4: los presupuestos de fotograma no se pueden juzgar ahí; memoria (≈55 MB), llamadas de dibujo (≈50) y triángulos (≈105 k) quedan muy por debajo del presupuesto. | Medido; pendiente de una pasada en un móvil o máquina con GPU (`EXPERIENCIA_ESTRICTO=1`). |
