# Compartimentos reales: las puertas solo dan paso

Petición de Berón (2026-11-17): en la estación algunas cosas se hacen «por puertas que abren modales». El catálogo de la bahía (piezas y planos), adoptar animales y, sobre todo, una puerta «Camarotes» en lugar de camarotes de verdad. Preguntó si existen planos reales de los compartimentos.

## Respuesta: ¿hay planos reales?

- **ISS: sí, y muy detallados.** NASA publica, módulo a módulo, sus medidas, sus bastidores con su código de sitio y sus puertos (Reference Guide). Hay un artículo técnico solo sobre los camarotes de Harmony (Broyan, Borrego y Bahr, 2008): cuatro, uno en cada cara del mismo hueco de bastidor (cubierta, techo, babor y estribor), de 2,1 m³ cada uno. Cada camarote tiene su saco sujeto a la pared, luz regulable, portátil y ventilación propia, porque el CO₂ se acumula sin ella. De la Cupola se sabe su diámetro (2,95 m), su altura (1,5 m) y su puesto robótico (RWS): los dos mandos de Canadarm2, portátiles y las imágenes de las cámaras de fuera. De la Bishop se sabe su volumen (3,99 m³) y su placa de cargas. **Las puertas que abrían menús eran atajos del juego, no la ISS.**
- **Starship: no.** SpaceX no ha publicado ningún plano del interior. La cubierta 2 con cuatro camarotes es **distribución nuestra**: copiamos la medida de los camarotes de Harmony y lo decimos así en el juego y en el código (`basis`).
- **Módulo lunar (LM): sí.** La cabina está documentada al completo ([habitaculo.md](habitaculo.md)): no tiene compartimentos, solo sus dos escotillas.

## Regla

Un compartimento real es un cuarto en el que se entra flotando. Su abertura es un paso sin puerta que tocar (`wallCompartment`, volumen `escotilla`), y lo que se hace allí está en sus aparatos: el saco, el portátil, el puesto robótico. **Una puerta o una escotilla solo da paso**, o dice por qué está cerrada (`info`). Nunca abre un menú.

## Auditoría de puertas y escotillas

### Estación (ISS, segmento de EE. UU.)

| Puerta o escotilla | Antes | Ahora |
|---|---|---|
| `camarotes` (pared de Harmony) | Puerta con «Dormir» y la lista de tareas | Se quita. Cuatro camarotes de verdad (`camarote-1…4`), uno en cada cara de un hueco de bastidor de Harmony, de 1,05 × 2 × 1 m (2,1 m³). Cada uno tiene su saco (`saco-1…4`), portátil y luz. El suyo es el 1, el de estribor; los demás dicen «Camarote libre: el tuyo es el 1» |
| `consola-bahia` (CBM de nadir de Unity) | Una escotilla del suelo abría la bahía de las naves | Es el **portátil de la bahía**, en la pared de babor de Unity. El CBM de nadir (`cbm-nadir-nodo1`) es una escotilla con su aviso |
| `cupula` (escotilla del suelo de Tranquility) | Una escotilla abría el menú del brazo | La Cupola es un cuarto (el cuadrado inscrito en sus 2,95 m: 2,08 m de lado, 1,5 m de alto). Dentro, el **puesto robótico (RWS)**: atracar o soltar con Canadarm2, «Cámaras de fuera y ventanas», «Catálogo y montaje», soltar desde la Bishop |
| `bishop` (puerto de babor de Tranquility) | Una escotilla abría guardar o desplegar | La Bishop es un cuarto (1,4 × 1,4 × 1,6 m) con su **placa de cargas**: «Sujetar X a la placa», «Recoger X». Soltar se hace desde el RWS, como en la ISS |
| `esclusa-kibo` | Abría el Hangar con el catálogo de vehículos | Escotilla con su aviso: la esclusa de Kibo es solo de carga. El inventario está en la **consola del JEMRMS** (`consola-jemrms`), en la pared de proa de Kibo |
| Catálogo de especies, planos e importaciones | El Hangar (vehículos y componentes que se importan) se abría desde la esclusa de Kibo | Consolas: el catálogo de especies es el portátil `rack-catalogo`, junto al hábitat acuático de Kibo; Planos y Fabricación están en sus máquinas; importar está en la consola del JEMRMS (Hangar) y en el RWS |
| Escotillas entre módulos | Paso | Paso (sin cambios) |
| IDA de cenit y de proa de Harmony | Salir a lo acoplado | Igual |
| `pma1`, `escotilla-eva`, `cbm-nadir-nodo2`, puertos libres | Aviso | Aviso: el segmento ruso queda fuera, la EVA está pendiente, el puerto está libre |
| `trajes` (Quest) | Máquina | Máquina (son los trajes, no una puerta) |

La prueba PX-35 recorre todas las puertas del plano y comprueba que solo son `puerta`, `salir` o `info`.

### Starship (nodriza)

| Puerta | Antes | Ahora |
|---|---|---|
| `camarotes` (pared de la cubierta 2) | Puerta con «Dormir» | Se quita. Cuatro camarotes como cuartos (`saco-1…4`, dos a babor y dos a proa), **distribución nuestra** |
| `subir-cubierta-vuelo` | Paso | Paso |
| `esclusa`, `almacen` | Aviso | Aviso |
| `catalogo`, `habitat-acuatico` | Consolas | Consolas (no son puertas: adoptar sigue en la consola del hábitat) |

### Módulo lunar

| Escotilla | Antes | Ahora |
|---|---|---|
| Escotilla de acople | Entrar, **desacoplar** y el asistente de acople | Solo entrar en lo acoplado, o «Abrir la escotilla» desactivado. Desacoplar y el asistente pasan al **puesto del comandante**, donde están los mandos en el LM real |
| Escotilla delantera | Salida a la EVA | Igual (paso) |

## Dormir

Dormir es una tarea de retos en su camarote (`sleepChore`, `modules/wellness/data/sleep.ts`). «Ir» en Tareas la lleva salto a salto por Harmony hasta dentro del camarote, y el reto empieza allí. Son seis pasos, cada uno con su animación en el camarote (`step-show.ts`):

1. comprueba que el ventilador del camarote sopla
2. pon el despertador a las 06:00 GMT (la hora real de despertar en la ISS)
3. métete en el saco de dormir sujeto a la pared
4. sube la cremallera del saco hasta el pecho
5. apaga la luz del camarote
6. cierra los ojos y duerme

Los pasos falsos son errores reales: apagar el ventilador, dejar el saco suelto, encender la luz al máximo. Al terminar, `crew.rest()` la calma. En la Starship es el mismo reto, en su camarote de la cubierta 2. La auditoría de animaciones (PX-20, [animaciones.md](../qa/animaciones.md)) comprueba cada paso en vivo.

## Fuentes

- NASA, *ISS Crew Quarters* (Broyan, Borrego y Bahr, 2008): https://ntrs.nasa.gov/citations/20080013462
- NASA, *Reference Guide to the International Space Station* (NP-2015-05-022-JSC): https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf
- Cupola y su RWS: https://en.wikipedia.org/wiki/Cupola_(ISS_module)
- NASA, dormir en el espacio: https://www.nasa.gov/image-article/sleeping-space/
- Bishop: [estacion-real.md](estacion-real.md)

En el código: `COMPARTMENT_SOURCES` (`src/modules/station/data/compartments.ts`) y `SLEEP_SOURCES`.

## Preguntas abiertas

- **Las pestañas de la pantalla de la estación**: desde cualquier máquina se llega a cualquier pestaña. Por ejemplo, Hangar o Planos se abren desde la refinería, y PX-33 lo sigue haciendo así. ¿Se deja cada pestaña solo en su consola (Planos en el portátil de fabricación, Hangar en el JEMRMS y en el RWS)?
- **Las «puertas» de los camarotes**: en la ISS, cada camarote tiene una puerta plegable. Aquí está abierta, sin puerta que tocar. ¿Se dibuja cerrada al dormir?
