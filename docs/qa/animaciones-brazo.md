# Animaciones del brazo y del paseo (PX-39)

Escrito por `tools/experiencia/brazo-eva.mjs` (no a mano). Cada bloque bien colocado es un paso: tras él se mide en la escena (`ArmShow.audit` en `src/adapters/three/arm-show.ts`, `StationEva.audit` en `src/station-eva.ts`) si lo que se mueve se ve sobre la hoja, si algo atraviesa la estación y si se ha movido.

| Reto | Paso | Escena | Captura | Resultado |
| --- | --- | --- | --- | --- |
| Capturar el Cygnus y atracarlo en su CBM | esperar a que el Cygnus se pare en el punto de captura (10 m) | punto-captura · camara | [brazo-captura-01.png](../screenshots/brazo-captura-01.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | ordenar la deriva libre: el Cygnus apaga sus propulsores | deriva-libre · camara | [brazo-captura-02.png](../screenshots/brazo-captura-02.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | acercar el LEE al accesorio de agarre del Cygnus | acercar · cupola | [brazo-captura-03.png](../screenshots/brazo-captura-03.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | disparar: los tres cables del LEE atrapan el vástago | capturar · cupola | [brazo-captura-04.png](../screenshots/brazo-captura-04.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | 12:22 | comprobar · cupola | [brazo-captura-05.png](../screenshots/brazo-captura-05.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | llevar el Cygnus hasta el CBM de nadir | llevar-cbm · camara | [brazo-captura-06.png](../screenshots/brazo-captura-06.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | primera etapa: los 4 pestillos del CBM lo arriman | primera-etapa · camara | [brazo-captura-07.png](../screenshots/brazo-captura-07.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | segunda etapa: los 16 pernos se aprietan | segunda-etapa · camara | [brazo-captura-08.png](../screenshots/brazo-captura-08.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | soltar el Cygnus y apartar el brazo | soltar · cupola | [brazo-captura-09.png](../screenshots/brazo-captura-09.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | ponerse la prenda de refrigeración (LCVG) | revisar · objetivo ·  | [brazo-traje-01.png](../screenshots/brazo-traje-01.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | meterse en el pantalón del traje | gesto · objetivo ·  | [brazo-traje-02.png](../screenshots/brazo-traje-02.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | entrar por debajo en el torso rígido y cerrar la cintura | gesto · objetivo ·  | [brazo-traje-03.png](../screenshots/brazo-traje-03.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | ponerse los guantes y el casco | revisar · objetivo ·  | [brazo-traje-04.png](../screenshots/brazo-traje-04.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | comprobar fugas en el módulo de control del pecho | programar · objetivo ·  | [brazo-traje-05.png](../screenshots/brazo-traje-05.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | 160 min | entrenar · objetivo ·  | [brazo-traje-06.png](../screenshots/brazo-traje-06.png) | Bien |
| Paseo: cambiar las alas | 6,1 h | comprobar · alas | [brazo-eva-01.png](../screenshots/brazo-eva-01.png) | Mal: atraviesa: pieza · Unity (Nodo 1), pieza · Quest (esclusa de EVA) |
| Paseo: cambiar las alas | Canadarm2 trae el rollo nuevo desde la JEM-EF | brazo · alas | [brazo-eva-02.png](../screenshots/brazo-eva-02.png) | Bien |
| Paseo: cambiar las alas | atar el rollo con un cable de equipo | atar · alas | [brazo-eva-03.png](../screenshots/brazo-eva-03.png) | Bien |
| Paseo: cambiar las alas | soltarlo del brazo y llevarlo a su soporte | llevar · alas | [brazo-eva-04.png](../screenshots/brazo-eva-04.png) | Bien |
| Paseo: cambiar las alas | apretar los pernos con la llave PGT | llave · alas | [brazo-eva-05.png](../screenshots/brazo-eva-05.png) | Bien |
| Paseo: cambiar las alas | conectar los cables de potencia | llevar · alas | [brazo-eva-06.png](../screenshots/brazo-eva-06.png) | Bien |
| Paseo: cambiar las alas | desenrollar el ala y comprobar la corriente | comprobar · alas | [brazo-eva-07.png](../screenshots/brazo-eva-07.png) | Bien |
| Dextre cambia la cámara de S1 | andar el brazo hasta un PDGF de la MBS | andar-mbs · cupola | [brazo-dextre-01.png](../screenshots/brazo-dextre-01.png) | Bien |
| Dextre cambia la cámara de S1 | agarrar a Dextre por el accesorio de su cabeza | agarrar-dextre · camara | [brazo-dextre-02.png](../screenshots/brazo-dextre-02.png) | Bien |
| Dextre cambia la cámara de S1 | llevar a Dextre al estante de repuestos de la JEM-EF | llevar-dextre-ef · camara | [brazo-dextre-03.png](../screenshots/brazo-dextre-03.png) | Bien |
| Dextre cambia la cámara de S1 | Dextre toma la cámara nueva con su OTCM | tomar-oru · camara | [brazo-dextre-04.png](../screenshots/brazo-dextre-04.png) | Bien |
| Dextre cambia la cámara de S1 | 6 min | comprobar · camara | [brazo-dextre-05.png](../screenshots/brazo-dextre-05.png) | Bien |
| Dextre cambia la cámara de S1 | llevar a Dextre hasta la cámara de S1 | llevar-dextre-camara · camara | [brazo-dextre-06.png](../screenshots/brazo-dextre-06.png) | Mal: atraviesa: brazo · Celosía integrada, LEE · Celosía integrada |
| Dextre cambia la cámara de S1 | Dextre desenrosca la cámara vieja y la sujeta con su otra mano | sacar-oru · camara | [brazo-dextre-07.png](../screenshots/brazo-dextre-07.png) | Bien |
| Dextre cambia la cámara de S1 | Dextre monta la cámara nueva y aprieta el perno | montar-oru · camara | [brazo-dextre-08.png](../screenshots/brazo-dextre-08.png) | Bien |
| Dextre cambia la cámara de S1 | devolver a Dextre a la MBS con la cámara vieja | devolver-dextre · camara | [brazo-dextre-09.png](../screenshots/brazo-dextre-09.png) | Bien |
