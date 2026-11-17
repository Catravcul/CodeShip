# Animaciones del brazo y del paseo (PX-39)

Escrito por `tools/experiencia/brazo-eva.mjs` (no a mano). Cada bloque bien colocado es un paso: tras él se mide en la escena (`ArmShow.audit` en `src/adapters/three/arm-show.ts`, `StationEva.audit` en `src/station-eva.ts`) si lo que se mueve se ve sobre la hoja, si algo atraviesa la estación y si se ha movido.

| Reto | Paso | Escena | Captura | Resultado |
| --- | --- | --- | --- | --- |
| Capturar el Cygnus y atracarlo en su CBM | esperar al Cygnus a 10 m (punto de captura) | punto-captura · camara | [brazo-captura-01.png](../screenshots/brazo-captura-01.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | deriva libre: el Cygnus apaga propulsores | deriva-libre · camara | [brazo-captura-02.png](../screenshots/brazo-captura-02.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | acercar el LEE al accesorio de agarre | acercar · cupola | [brazo-captura-03.png](../screenshots/brazo-captura-03.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | disparar: los cables atrapan el vástago | capturar · cupola | [brazo-captura-04.png](../screenshots/brazo-captura-04.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | 12:22 | comprobar · cupola | [brazo-captura-05.png](../screenshots/brazo-captura-05.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | llevar el Cygnus al CBM de nadir | llevar-cbm · camara | [brazo-captura-06.png](../screenshots/brazo-captura-06.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | 1.ª etapa: 4 pestillos lo arriman | primera-etapa · camara | [brazo-captura-07.png](../screenshots/brazo-captura-07.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | 2.ª etapa: se aprietan 16 pernos | segunda-etapa · camara | [brazo-captura-08.png](../screenshots/brazo-captura-08.png) | Bien |
| Capturar el Cygnus y atracarlo en su CBM | soltar el Cygnus y apartar el brazo | soltar · cupola | [brazo-captura-09.png](../screenshots/brazo-captura-09.png) | Bien |
| Desatracar y soltar el Cygnus | cerrar escotillas y vaciar el vestíbulo | comprobar · camara | [brazo-suelta-01.png](../screenshots/brazo-suelta-01.png) | Bien |
| Desatracar y soltar el Cygnus | agarrar el Cygnus por su accesorio | agarrar-cygnus · camara | [brazo-suelta-02.png](../screenshots/brazo-suelta-02.png) | Bien |
| Desatracar y soltar el Cygnus | soltar los 16 pernos del CBM | segunda-etapa · camara | [brazo-suelta-03.png](../screenshots/brazo-suelta-03.png) | Bien |
| Desatracar y soltar el Cygnus | 140 días | comprobar · camara | [brazo-suelta-04.png](../screenshots/brazo-suelta-04.png) | Bien |
| Desatracar y soltar el Cygnus | abrir los 4 pestillos | primera-etapa · camara | [brazo-suelta-05.png](../screenshots/brazo-suelta-05.png) | Bien |
| Desatracar y soltar el Cygnus | llevarlo al punto de suelta | llevar-suelta · camara | [brazo-suelta-06.png](../screenshots/brazo-suelta-06.png) | Bien |
| Desatracar y soltar el Cygnus | abrir el LEE: se aleja solo | soltar-cygnus · camara | [brazo-suelta-07.png](../screenshots/brazo-suelta-07.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | ponerse la prenda de refrigeración (LCVG) | revisar · objetivo ·  | [brazo-traje-01.png](../screenshots/brazo-traje-01.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | meterse en el pantalón del traje | gesto · objetivo ·  | [brazo-traje-02.png](../screenshots/brazo-traje-02.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | entrar por debajo en el torso rígido y cerrar la cintura | gesto · objetivo ·  | [brazo-traje-03.png](../screenshots/brazo-traje-03.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | ponerse los guantes y el casco | revisar · objetivo ·  | [brazo-traje-04.png](../screenshots/brazo-traje-04.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | comprobar fugas en el módulo de control del pecho | programar · objetivo ·  | [brazo-traje-05.png](../screenshots/brazo-traje-05.png) | Bien |
| Ponerse el EMU y prerrespirar (ISLE) | 160 min | entrenar · objetivo ·  | [brazo-traje-06.png](../screenshots/brazo-traje-06.png) | Bien |
| Paseo: cambiar las alas | 6 h | comprobar · alas | [brazo-eva-01.png](../screenshots/brazo-eva-01.png) | Bien |
| Paseo: cambiar las alas | Canadarm2 trae el rollo nuevo desde la JEM-EF | brazo · alas | [brazo-eva-02.png](../screenshots/brazo-eva-02.png) | Bien |
| Paseo: cambiar las alas | atar el rollo con un cable de equipo | atar · alas | [brazo-eva-03.png](../screenshots/brazo-eva-03.png) | Bien |
| Paseo: cambiar las alas | soltarlo del brazo y llevarlo a su soporte | llevar · alas | [brazo-eva-04.png](../screenshots/brazo-eva-04.png) | Bien |
| Paseo: cambiar las alas | apretar los pernos con la llave PGT | llave · alas | [brazo-eva-05.png](../screenshots/brazo-eva-05.png) | Bien |
| Paseo: cambiar las alas | conectar los cables de potencia | llevar · alas | [brazo-eva-06.png](../screenshots/brazo-eva-06.png) | Bien |
| Paseo: cambiar las alas | desenrollar el ala y comprobar la corriente | comprobar · alas | [brazo-eva-07.png](../screenshots/brazo-eva-07.png) | Bien |
| Paseo: cambiar el motor del módulo | 6,2 h | comprobar · modulo | [eva-modulo-01.png](../screenshots/eva-modulo-01.png) | Bien |
| Paseo: cambiar el motor del módulo | Canadarm2 trae la pieza nueva desde la JEM-EF | brazo · modulo | [eva-modulo-02.png](../screenshots/eva-modulo-02.png) | Bien |
| Paseo: cambiar el motor del módulo | atar la pieza con un cable de equipo | atar · modulo | [eva-modulo-03.png](../screenshots/eva-modulo-03.png) | Bien |
| Paseo: cambiar el motor del módulo | soltar los pernos de la vieja con la llave PGT | llave · modulo | [eva-modulo-04.png](../screenshots/eva-modulo-04.png) | Bien |
| Paseo: cambiar el motor del módulo | dar la pieza vieja al brazo | llevar · modulo | [eva-modulo-05.png](../screenshots/eva-modulo-05.png) | Bien |
| Paseo: cambiar el motor del módulo | montar la nueva y apretar los pernos | llave · modulo | [eva-modulo-06.png](../screenshots/eva-modulo-06.png) | Bien |
| Paseo: cambiar el motor del módulo | conectar y comprobar | comprobar · modulo | [eva-modulo-07.png](../screenshots/eva-modulo-07.png) | Bien |
| Paseo: cambiar la energía de la Starship | 7 h | comprobar · nodriza-energia | [eva-starship-01.png](../screenshots/eva-starship-01.png) | Bien |
| Paseo: cambiar la energía de la Starship | sacar el panel por la esclusa con su cable de equipo | atar · nodriza-energia | [eva-starship-02.png](../screenshots/eva-starship-02.png) | Bien |
| Paseo: cambiar la energía de la Starship | llevarlo a su soporte en el casco | llevar · nodriza-energia | [eva-starship-03.png](../screenshots/eva-starship-03.png) | Bien |
| Paseo: cambiar la energía de la Starship | apretar los pernos con la llave PGT | llave · nodriza-energia | [eva-starship-04.png](../screenshots/eva-starship-04.png) | Bien |
| Paseo: cambiar la energía de la Starship | conectar los cables de potencia | llevar · nodriza-energia | [eva-starship-05.png](../screenshots/eva-starship-05.png) | Bien |
| Paseo: cambiar la energía de la Starship | desenrollar y comprobar la corriente | comprobar · nodriza-energia | [eva-starship-06.png](../screenshots/eva-starship-06.png) | Bien |
| Dextre cambia la cámara de S1 | andar el brazo hasta un PDGF de la MBS | andar-mbs · camara | [brazo-dextre-01.png](../screenshots/brazo-dextre-01.png) | Bien |
| Dextre cambia la cámara de S1 | agarrar a Dextre por el accesorio de su cabeza | agarrar-dextre · camara | [brazo-dextre-02.png](../screenshots/brazo-dextre-02.png) | Bien |
| Dextre cambia la cámara de S1 | llevar a Dextre al estante de repuestos de la JEM-EF | llevar-dextre-ef · camara | [brazo-dextre-03.png](../screenshots/brazo-dextre-03.png) | Mal: atraviesa: brazo · Destiny (laboratorio) |
| Dextre cambia la cámara de S1 | Dextre toma la cámara nueva con su OTCM | tomar-oru · camara | [brazo-dextre-04.png](../screenshots/brazo-dextre-04.png) | Bien |
| Dextre cambia la cámara de S1 | 6 min | comprobar · camara | [brazo-dextre-05.png](../screenshots/brazo-dextre-05.png) | Bien |
| Dextre cambia la cámara de S1 | llevar a Dextre hasta la cámara de S1 | llevar-dextre-camara · camara | [brazo-dextre-06.png](../screenshots/brazo-dextre-06.png) | Bien |
| Dextre cambia la cámara de S1 | Dextre desenrosca la cámara vieja y la sujeta con su otra mano | sacar-oru · camara | [brazo-dextre-07.png](../screenshots/brazo-dextre-07.png) | Bien |
| Dextre cambia la cámara de S1 | Dextre monta la cámara nueva y aprieta el perno | montar-oru · camara | [brazo-dextre-08.png](../screenshots/brazo-dextre-08.png) | Bien |
| Dextre cambia la cámara de S1 | devolver a Dextre a la MBS con la cámara vieja | devolver-dextre · camara | [brazo-dextre-09.png](../screenshots/brazo-dextre-09.png) | Bien |
