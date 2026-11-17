# Estación real: el segmento estadounidense de la ISS

Decisión de Berón (2026-11-16): «empezamos de cero con naves y procesos reales». La estación Nueva Polana se
rehace como el **segmento estadounidense de la Estación Espacial Internacional**, con sus módulos, sus
medidas, sus volúmenes y sus fuentes. Con la corrección de las 19:54 la regla vale para los interiores y los
vehículos; el juego de los asteroides, las importaciones y la nano_net siguen igual
([pendientes.md](../pendientes.md)).

Datos: [`src/modules/station/data/iss.ts`](../../src/modules/station/data/iss.ts). Disposición:
[`data/structure.ts`](../../src/modules/station/data/structure.ts). Interior:
[`data/interior.ts`](../../src/modules/station/data/interior.ts). Cada dato lleva su etiqueta de realidad
(`real`, `en-desarrollo`, `licencia`, `ficcion`; [`src/core/reality.ts`](../../src/core/reality.ts)).

## Módulos

Ejes de la estación: x a estribor (a lo largo de la celosía), y al cenit, z a popa (proa es −z). Unity está
en el origen. Los volúmenes **copiados** son los de la fuente; los **derivados** son el cilindro del casco
(π r² L), un tope por arriba, porque la fuente no da el presurizado.

| Módulo | Código | Medidas | Masa | Volumen | Dónde | Qué hay dentro | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unity (Nodo 1) | NOD1 | 5,47 × 4,57 m | 11 612 kg | ≈ 89,7 m³ (derivado) | Origen | Cocina y mesa (bastidor «galería» de eclss-real), esterilla, CBM de nadir donde el brazo atraca el módulo, PMA-1 a popa (al segmento ruso, fuera del juego) | [Wikipedia](https://en.wikipedia.org/wiki/Unity_(ISS_module)) |
| Destiny | LAB1 | 8,5 × 4,3 m | 14 515 kg | 106 m³ (copiado) | Proa de Unity | Guantera, AMF de Redwire, bombas de los lazos térmicos (ITCS), portátil de soporte vital, ventana de 51 cm | [Wikipedia](https://en.wikipedia.org/wiki/Destiny_(ISS_module)) |
| Harmony (Nodo 2) | NOD2 | 6,7 × 4,4 m | 14 300 kg | 70 m³ (copiado) | Proa de Destiny | Los cuatro camarotes; IDA de cenit (módulo de aterrizaje) y de proa (nodriza); CBM de nadir de los cargueros | [Wikipedia](https://en.wikipedia.org/wiki/Harmony_(ISS_module)) |
| Tranquility (Nodo 3) | NOD3 | 6,706 × 4,48 m | 19 000 kg | ≈ 105,7 m³ (derivado) | Babor de Unity | Aseo (WHC), T2 y ARED, bastidores WRS, OGS y AR, puesto de incendios; la Cupola al nadir y la Bishop a babor | [Wikipedia](https://en.wikipedia.org/wiki/Tranquility_(ISS_module)), [ESA](https://www.esa.int/Our_Activities/Human_Spaceflight/Node-3_Cupola/Node-3_systems_and_internal_racks) |
| Cupola | CUP1 | 1,5 × 2,95 m | 1880 kg | ≈ 10,3 m³ (derivado) | Nadir de Tranquility | Siete ventanas y el puesto robótico de Canadarm2 | [Wikipedia](https://en.wikipedia.org/wiki/Cupola_(ISS_module)) |
| Columbus | COL1 | 6,871 × 4,477 m | 10 300 kg | ≈ 108,2 m³ (derivado) | Estribor de Harmony | El taller: la impresora de metal de la ESA y, como licencia, refinería, fundición y planta de propelente | [Wikipedia](https://en.wikipedia.org/wiki/Columbus_(ISS_module)) |
| Kibo (JPM) | JPM1 | 11,19 × 4,39 m | 15 900 kg | ≈ 169,4 m³ (derivado) | Babor de Harmony | Ciencia, el Refabricator y su esclusa de experimentos a la plataforma expuesta (JEM-EF) | [Wikipedia](https://en.wikipedia.org/wiki/Kibo_(ISS_module)) |
| Quest | AL1 | 5,5 × 4 m | 6064 kg | 34 m³ (copiado) | Estribor de Unity | Trajes EMU y la escotilla EVA: el paseo desde Quest ([paseo-espacial.md](paseo-espacial.md), «Desde Quest») | [Wikipedia](https://en.wikipedia.org/wiki/Quest_Joint_Airlock) |
| Bishop | BSH1 | 1,8 × 2,014 m | 1059 kg | 3,99 m³ (copiado) | Babor de Tranquility | Esclusa de carga: Juventas y los cubesats | [Wikipedia](https://en.wikipedia.org/wiki/Nanoracks_Bishop_Airlock) |

En total ≈ 697 m³ (con los derivados como tope); la ISS entera tiene 1005 m³ presurizados con el segmento
ruso ([NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/)).

Por fuera: celosía integrada de 94 m sobre Destiny, ocho alas de 35 × 12 m (dos módulos por lado), tres
radiadores por lado en S1 y P1 (tamaño: valor de juego), Canadarm2 de 17,6 m sobre su base móvil con Dextre ([brazo-robotico.md](brazo-robotico.md)), la
plataforma expuesta de Kibo (4 × 5,6 × 5 m, 12 puertos) y dos IDA en Harmony. Sin el PMA de debajo de cada
IDA, para no alargar (distribución nuestra).

## Lo que sustituye al hangar

El hangar de 20 × 14 × 20 m no existe en la ISS. Lo que hacía lo hacen tres cosas reales:

- **Esclusa Bishop** (Nanoracks, 2020), en el puerto de babor de Tranquility. Se guardan dentro Juventas
  (cubesat de 6U de la misión Hera, 12 kg) y cubesats de 1U y 3U, hasta sus 3,99 m³. Es un cuarto en el que se entra flotando: su placa de cargas ofrece «Sujetar» y «Recoger». «Soltar», desde el puesto robótico de la Cupola, sigue la
  secuencia real: cerrar la escotilla CBM, bombear el aire del vestíbulo, soltar los pernos, Canadarm2 la
  lleva a la posición de suelta, la carga se aleja sola, el brazo la vuelve a atracar. En 3D se ve desde la
  Cupola. **Recoger** algo suelto con el brazo es **licencia**: en la ISS nunca se ha hecho (el brazo solo
  agarra vehículos con su accesorio de agarre); la tarjeta lo dice.
- **Plataforma expuesta de Kibo (JEM-EF)**: las piezas de repuesto viven fuera, en cajas sobre sus 12
  puertos (se ven por fuera). La lista está en la consola del JEMRMS, junto a la esclusa de Kibo («Abrir Hangar»); la esclusa solo es una escotilla de carga ([compartimentos.md](compartimentos.md)).
- **Canadarm2 y el CBM de nadir de Unity**: desde el puesto robótico de la Cupola, «Atracar el módulo en el
  CBM» lo saca de su IDA de cenit y lo atraca donde atracan los Cygnus. En 3D: sube del IDA, pasa por encima
  de la celosía y baja por detrás de Unity. La bahía de la nave (cambiar piezas) se abre desde el portátil de la bahía, en la pared de babor de Unity; el CBM es solo una escotilla.
  Atracado, la escotilla del módulo se cierra y dice que hay que devolverlo desde la Cupola.

## El dique seco

La nodriza (ahora una Starship, rama base-nodriza-real) **atraca en el IDA de proa de Harmony**, donde
atracaba el transbordador (IDA-2 sobre el PMA-2): el precedente real de un vehículo grande acoplado a la ISS.
El dique seco ([dique-seco.md](dique-seco.md)) no se dibuja salvo con `?ficcion`; queda en
[pendientes.md](../pendientes.md).

## Crecimiento

Los dos puertos CBM libres de Tranquility (popa, el de BEAM; proa, el de Leonardo; ninguno de los dos está
modelado) reciben módulos **en desarrollo**:

- **Tipo Haven-2** (Vast, 2028): 15,1 m (Haven-1 + 5 m, copiado), 4,4 m de diámetro (el de Haven-1:
  estimación), laboratorio. [Vast](https://www.vastspace.com/updates/vast-announces-haven-2-its-proposed-space-station-designed-to-succeed-the-international-space-station-iss)
- **Tipo Axiom Hab-1** (Axiom Station, 2029): 11 × 4,2 m, camarotes. [Wikipedia](https://en.wikipedia.org/wiki/Axiom_Station)

Hacia proa un módulo de más de unos 10 m llegaría a Kibo: solo cabe a popa (lo comprueba la exclusión de la
estructura). Los módulos de la nave de anillos (segundo de fabricación, planta, agrícola) y la ampliación del
hangar son **ficción**: no se ofrecen sin `?ficcion`.

## Fabricación

Real en la ISS ([NASA](https://www.nasa.gov/missions/station/3d-printing-saving-weight-and-space-at-launch/)):
3D Printing in Zero-G (2014), Additive Manufacturing Facility de Redwire (2015, en Destiny), Refabricator
(2019, aquí en Kibo: distribución nuestra) y la impresora de metal de la ESA (2024, en Columbus;
[ESA](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ESA_launches_first_metal_3D_printer_to_ISS)).
Regolith Print de Redwire está en pruebas.

**Licencias**: la impresora de la ESA hace piezas de menos de 250 g; aquí hace piezas pequeñas de hasta
40 kg. La refinería, la fundición, la planta de propelente, el reactor de carbonilo, la soldadora de haz de
electrones, la celda de compuestos, la impresora grande y la planta grande no existen en órbita: son
licencias, dichas en su ficha. Los campos de cultivo son ficción (backlog).

## Tripulación y soporte vital

Donde están en la ISS: la cocina en Unity, los cuatro camarotes en Harmony (cuartos de 2,1 m³, uno en cada cara de un hueco de bastidor: [compartimentos.md](compartimentos.md)), el aseo y el ejercicio en
Tranquility, los trajes en Quest. Los bastidores de soporte vital son los de eclss-real, que se juegan
(fixtures `sv-*` con `eclssFixtures`, docs/design/soporte-vital.md): WRS y OGS en las paredes de Tranquility,
el AR y el puesto de incendios en su techo, y en Destiny las bombas del ITCS y el portátil de soporte vital.
La galería de Unity usa el bastidor «galería» del kit. Destiny tiene en la ISS un segundo AR; aquí no se
pone, para que solo haya un bastidor de aire que reparar.

## Ranuras de rack del catálogo de especies

Las dos ranuras de rack del catálogo (`rack-slots.ts`, rama catalogo-especies) tienen sitio en Kibo: el
**hábitat acuático (AQH)** de JAXA, que voló en Kibo con medakas
([JAXA](https://iss.jaxa.jp/en/kiboexp/pm/aqh)), y a su lado el **portátil del catálogo**, que abre la misma
hoja que la lista de tareas. Por ahora el tanque animado y los animales adoptados siguen dibujándose en el
anillo (con `?ficcion`); en la ISS la ranura acuática es la ficha del AQH.

## Escala y separación

La ISS está a su tamaño real en los datos. La capa de presentación (rama base-nodriza-real,
`src/core/presentation.ts`) la dibuja: «Cómoda» a 1,5× (por defecto) y «Real» a 1×. Con «Separación:
Amplia», si a esa escala dos interactuables quedan a menos de 2 m, la estación entera se dibuja más grande
(`stationPlayScale`, `data/presentation.ts`): a 1,5× no hace falta; a 1× se agranda lo justo. No se tocan
los datos sala por sala. Qué bastidor lleva cada máquina del juego sí es elección nuestra: se eligieron
bastidores lejos de las escotillas.

## Decisiones abiertas

- **Escala real con separación amplia**: a 1× la estación se agranda entera (los pasillos también). Otra
  opción sería estirar solo a lo largo de cada módulo; pide rehacer la disposición.
- **Dónde iba el Refabricator** en la ISS: aquí en Kibo. Si Berón lo quiere en Destiny, cabe moviendo el
  bastidor de lazos térmicos.
- **El PMA bajo cada IDA** no se dibuja (los IDA quedan más cerca de Harmony que en la ISS).
- **Recoger con el brazo** algo soltado por la Bishop es licencia. ¿Se quita, o se deja con su aviso?
- **Paseo espacial desde Quest**: hecho ([paseo-espacial.md](paseo-espacial.md)). Las alas, los radiadores y los escudos se cambian fuera en un paseo; la cámara de S1 la cambia Dextre ([brazo-robotico.md](brazo-robotico.md)).
- **Brazo**: Canadarm2, la MBS y Dextre con sus datos reales, la captura del Cygnus a 10 m, su atraque en el CBM de nadir de Unity y, tras sus 140 días, el desatraque y la suelta ([brazo-robotico.md](brazo-robotico.md)). Las piezas de fuera de la estación, del módulo y de la Starship se cambian en paseos espaciales ([paseo-espacial.md](paseo-espacial.md)).
- **`HANGAR_SIZE`** (20 × 14 × 20 m) sigue en el código para el montaje del catálogo de naves («cabe en el
  hangar»); con la ISS ese criterio debería ser el CBM o el brazo.
