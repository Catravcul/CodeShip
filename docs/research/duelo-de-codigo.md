# Duelo de código en móvil

**Propuesta:** el duelo se juega tocando bloques, no escribiendo. Cada bloque se muestra en pseudocódigo en español y se puede ver como JavaScript. El duelo alterna cinco tipos de reto, centrados en leer, ordenar, predecir, depurar y especificar, que son las habilidades que más pesan ahora que la IA escribe código.

## Qué dice la investigación

| Hallazgo | Fuente |
| --- | --- |
| Los problemas de Parsons (ordenar bloques de código ya escrito) suelen resolverse más rápido que escribir el código desde cero, con aprendizaje equivalente. | Ericson et al., ITiCSE 2023, doi:10.1145/3587103.3594211 ([PDF](https://strathprints.strath.ac.uk/86100/1/Ericson_etal_ITiCSE_2023_Conducting_multi_institutional_studies_of_Parsons_problems.pdf)) |
| Mejoran la eficiencia frente a corregir o escribir código y reducen la carga cognitiva; el rendimiento en Parsons correlaciona fuerte con preguntas de escribir código. La mayoría de estudiantes los encuentra amenos. | Ericson et al., ITiCSE Working Group Report 2023, doi:10.1145/3571785.3574127 ([PDF](https://falmouth-test.eprints-hosting.org/5216/1/ITiCSE_2023_WorkingGroup_Parsons_Report.pdf)) |
| Los distractores (bloques incorrectos) aumentan tiempo y carga cognitiva y bajan el éxito; emparejados visualmente con el bloque correcto son más fáciles. | Mismo informe (cita a Harms et al. y Denny et al.) |
| Variantes estudiadas: adaptativos (la dificultad se ajusta), con huecos que el jugador completa, "micro Parsons" de una línea y bloques progresivos que pasan de comentario a código. | Mismo informe |
| Con bloques visuales, los novatos sacaron 34,58 frente a 20,00 en texto (n=12 por grupo); los experimentados, al revés (46,36 frente a 67,00). | Mihci y Ozdener Donmez, IJRES 3(2), 2017, doi:10.21890/ijres.327912 ([PDF](https://ijres.net/index.php/ijres/article/view/244/pdf)) |
| En 88.606 proyectos de App Inventor (bloques, apps móviles), el 91 % usa eventos, el 53 % variables, el 41 % condicionales, el 20 % procedimientos y solo el 6 % bucles. | Alves et al., [arXiv:2006.11327](https://arxiv.org/pdf/2006.11327) |
| Lightbot enseña bucles y procedimientos colocando símbolos, "sin escribir código", en web, Android e iOS. | [Wikipedia: Lightbot](https://en.wikipedia.org/wiki/Lightbot) |
| Con IA generativa ganan peso la descomposición de problemas, especificar con precisión las tareas a la IA, y evaluar, reescribir y ampliar código. | [CACM, "Computing Education in the Era of Generative AI"](https://cacm.acm.org/research/computing-education-in-the-era-of-generative-ai/) |
| Los estándares CSTA 2026 pasan de centrarse en escribir código a equilibrarlo con leer, evaluar, modificar y depurar programas. | [CSTA 2026](https://csteachers.org/2026-csta-pk-12-computer-science-standards/) |
| El pseudocódigo está pensado para que lo lea una persona, no una máquina, y no tiene una sintaxis estándar. | [Wikipedia: Pseudocode](https://en.wikipedia.org/wiki/Pseudocode) |

Hueco: ninguno de los estudios de Parsons de 2023 trató el uso en móvil. Las decisiones de interacción táctil de abajo son de diseño y hay que validarlas con pruebas de jugadores.

## Interacción táctil

- **Tocar para colocar** como gesto principal: tocar un bloque de la bandeja lo pone en el siguiente hueco; tocar un bloque colocado lo devuelve. Es predecible y se hace con el pulgar.
- **Mantener y arrastrar** solo para reordenar bloques ya colocados. Así se conserva la idea original de arrastrar sin depender de ella en pantallas pequeñas.
- Bloques grandes, en una columna, con la bandeja en la mitad inferior de la pantalla.
- **Pseudocódigo por defecto, JavaScript opcional**: cada bloque tiene dos caras (`guardar 20 en pulsosPorHora` / `let pulsosPorHora = 20`). Es la variante de bloques progresivos del informe de 2023.
- **Ejecutar y ver el efecto**: al ejecutar, el resultado se ve en la escena (el asteroide cambia el ritmo de pulsos, gira, abre una veta). El borrador anterior ya lo hacía con su "trace".

## Cinco tipos de reto

| Reto | Qué hace el jugador | Habilidad |
| --- | --- | --- |
| Ordenar | Coloca bloques en el orden correcto (Parsons) | Leer y entender la estructura |
| Completar | Elige el valor u operador que falta en un bloque | Variables, expresiones |
| Predecir | Dice qué valor tendrá una variable o qué hará el asteroide | Trazar el programa |
| Reparar | Encuentra y cambia el bloque que falla | Depurar |
| Especificar | Elige o compone la instrucción precisa que daría a una IA para conseguir un efecto | Descomponer y especificar |

Reglas de dificultad:

1. Sin distractores en los primeros asteroides; después, distractores emparejados con su bloque correcto.
2. Dificultad adaptativa: si el jugador falla dos veces, se fija un bloque o se elimina un distractor.
3. Pocos bloques al principio (3–5) y más con cada nivel.

## Enganche con el juego

- La "mente" del asteroide plantea el reto. Su consciencia y tipo fijan qué conceptos usa y cuántos bloques.
- Ganar hace que el asteroide obedezca una petición y ceda recursos según su composición real (ver [asteroides.md](asteroides.md)).
- Fallar no castiga: el asteroide se resiste y el jugador puede reintentar o alejarse.
