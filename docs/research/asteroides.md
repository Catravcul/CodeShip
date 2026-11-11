# Asteroides reales

**Para el juego:** siete asteroides reales con datos medidos, ordenados de menor a mayor, más las clases espectrales que deciden qué recursos ceden. Valores copiados de Wikipedia el 11 de noviembre de 2026; cuando se pasen al código hay que contrastarlos con la API SBDB de JPL ([fuentes-de-datos.md](fuentes-de-datos.md)), que devuelve la referencia de cada valor.

## Asteroides

| Asteroide | Dimensiones | Masa (kg) | Densidad (g/cm³) | Rotación (h) | Tipo | Albedo | Fuente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 25143 Itokawa | 535 × 294 × 209 m | (3,51±0,105)×10¹⁰ | 1,9±0,13 | 12,132 | S (SMASS S, Sq o Q según fuente) | 0,23–0,53 según medida | [Wikipedia](https://en.wikipedia.org/wiki/25143_Itokawa) |
| 101955 Bennu | 565 × 535 × 508 m | (7,329±0,009)×10¹⁰ | 1,190±0,013 | 4,296057 | B | — | [Wikipedia](https://en.wikipedia.org/wiki/101955_Bennu) |
| 162173 Ryugu | 1004 × 876 m; radio medio 448±2 m | (4,50±0,06)×10¹¹ | 1,19±0,03 | 7,63262 | Cb | 0,037–0,078 según medida | [Wikipedia](https://en.wikipedia.org/wiki/162173_Ryugu) |
| 65803 Didymos | 851 × 849 × 620 m | ≈5,2×10¹¹ (primario) | 2,40±0,30 | 2,26 | S (SMASS Xk) | 0,15±0,04 | [Wikipedia](https://en.wikipedia.org/wiki/65803_Didymos) |
| Dimorphos (luna de Didymos) | ≈160 m de diámetro | — | — | órbita de 11,9 h | — | — | [Wikipedia](https://en.wikipedia.org/wiki/65803_Didymos) |
| 433 Eros | 34,4 × 11,2 × 11,2 km | (6,687±0,003)×10¹⁵ | 2,67±0,03 | 5,270 | S | 0,25±0,06 | [Wikipedia](https://en.wikipedia.org/wiki/433_Eros) |
| 16 Psyche | 278 × 232 × 164 km | (2,29±0,14)×10¹⁹ | 3,977±0,253 | 4,195948 | M (SMASS X) | 0,15±0,03 | [Wikipedia](https://en.wikipedia.org/wiki/16_Psyche) |
| 4 Vesta | 572,6 × 557,2 × 446,4 km | (2,590271±0,000058)×10²⁰ | 3,456±0,035 | 5,342 | V | 0,423 | [Wikipedia](https://en.wikipedia.org/wiki/4_Vesta) |

## Composición conocida

- **Bennu**: agua en minerales hidratados, en torno al 1 % en peso según una estimación conservadora y 6,2 % según otra; vetas de carbonato de 3 a 15 cm; carbono del 4,5 al 4,7 % en la muestra devuelta (este último dato viene de un resumen y está por verificar).
- **Ryugu**: 6,84±0,34 % de agua en peso en la muestra (otro estudio da 4–7 %); orgánicos ricos en carbono; se detectaron uracilo y vitamina B3; parecido a las condritas CI.
- **Itokawa**: composición de condrita ordinaria con poco hierro y poco metal; agua en granos de piroxeno y olivino; es un montón de escombros.
- **Eros**: tipo S; según datos de NEAR podría contener unos 20.000 millones de toneladas de aluminio y cantidades parecidas de otros metales como oro y platino (estimación).
- **Psyche**: indicios de mucho metal por su albedo de radar; densidad de 3,9 g/cm³ frente a 7,9 del hierro-níquel; posibles silicatos hidratados; análogos propuestos: condritas de enstatita, bencubbinitas y mesosideritas.
- **Vesta**: superficie como los meteoritos HED (howarditas, eucritas, diogenitas); núcleo de hierro-níquel de 90 a 220 km; material oscuro rico en carbono.

## Clases espectrales y recursos

| Clase | Qué indica | Meteorito análogo | Recursos para el juego |
| --- | --- | --- | --- |
| C, B (carbonáceos) | Oscuros, espectro plano; "h" significa hidratado | Condritas carbonáceas | Agua, carbono orgánico, fósforo (sirven para combustible y alimentos) |
| S (pétreos) | Albedo medio, el tipo más común | Meteoritos pétreos | Silicatos, níquel, cobalto, oro, platino y rodio en pequeñas cantidades |
| M, X (metálicos) | Albedo intermedio 0,10–0,30 | Meteoritos de hierro | Hierro-níquel en masa, metales del grupo del platino |
| V (vestoides) | Absorción muy profunda | HED | Basalto, olivino |
| D, P | Muy oscuros, rojizos, cinturón exterior y troyanos | — | Hielo de agua (según el artículo de minería, algunos troyanos son mayormente hielo) |

Fuentes: [Asteroid spectral types](https://en.wikipedia.org/wiki/Asteroid_spectral_types) (algunas correlaciones con meteoritos están marcadas allí como "citation needed") y [Asteroid mining](https://en.wikipedia.org/wiki/Asteroid_mining). Ejemplo de cifra del artículo de minería: un asteroide tipo S de 10 m contiene unos 650.000 kg de metal, de los que 50 kg son metales raros.

## Pendiente

- Comprobar en fuentes primarias (NASA, JAXA, PDS) qué modelos de forma 3D medidos son públicos y con qué licencia, antes de usarlos en lugar de las formas procedurales.
- Sustituir los porcentajes de composición del juego por los de artículos de las muestras de Bennu y Ryugu.
