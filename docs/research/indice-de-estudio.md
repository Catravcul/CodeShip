# Índice de estudio

**Propuesta:** 10 bloques de conceptos en el orden de los marcos educativos K-12 y CSTA, empezando por variables como planteaste. Cada bloque es un grupo de asteroides. Depurar y especificar son transversales y aparecen en todos los bloques, no al final.

## Base

- El K-12 Computer Science Framework divide "Algoritmos y programación" en algoritmos, variables, control, modularidad y desarrollo de programas ([k12cs.org](https://k12cs.org/framework-statements-by-concept/), licencia CC BY-NC-SA 4.0).
- Los estándares CSTA 2026 introducen la iteración y la selección antes que las variables con tipos, y los procedimientos y funciones más tarde. También piden verificar un algoritmo con entradas dadas y evaluar su corrección ([CSTA 2026](https://csteachers.org/2026-csta-pk-12-computer-science-standards/)). Esta progresión se tomó de un resumen del PDF y hay que contrastarla con el texto antes de citarla literalmente.
- El índice del borrador anterior ([legado/indice-estudio-javascript.txt](legado/indice-estudio-javascript.txt)) organiza los temas por características de JavaScript (var/let/const, métodos de cadenas, hoisting). Sirve como lista de subtemas del modo "ver como JavaScript", pero no como orden de niveles.

## Progresión

| Bloque | Conceptos | Retos típicos | Asteroides del bloque |
| --- | --- | --- | --- |
| 1. Secuencia | Instrucciones en orden, efecto visible | Ordenar 3–4 bloques | Cercanos, pequeños, tipo S (Itokawa) |
| 2. Variables | Declarar, asignar, leer, nombres con sentido | Completar valor, predecir valor | Tipo S |
| 3. Tipos de datos | Número, texto, booleano | Elegir el tipo correcto, reparar mezcla de tipos | Tipo S (Eros) |
| 4. Operaciones | Aritmética, comparación, lógica, precedencia | Completar operador, predecir resultado | Tipo S y Q |
| 5. Condicionales | si / si no, condiciones compuestas | Ordenar ramas, predecir camino | Tipo C y B (Bennu, Ryugu) |
| 6. Bucles | Repetir n veces, mientras, recorrer | Predecir número de vueltas, reparar bucle infinito | Tipo C |
| 7. Funciones | Definir, parámetros, devolver, reutilizar | Descomponer un reto en funciones | Sistemas binarios (Didymos y Dimorphos) |
| 8. Listas y objetos | Colecciones, propiedades, recorrerlas | Ordenar, filtrar recursos | Tipo X y M |
| 9. Eventos | Reaccionar a señales (el asteroide gira, se acerca la nave) | Conectar evento y acción | Tipo M (Psyche) |
| 10. Composición | Programa completo combinando todo | Especificar para una IA y verificar el resultado | Protoplanetas (Vesta) |

Transversal en todos los bloques: **reparar** (encontrar el bloque que falla) y **especificar** (elegir la instrucción precisa), por el peso que les dan CSTA 2026 y el artículo de CACM citado en [duelo-de-codigo.md](duelo-de-codigo.md).

## Datos de App Inventor como guía

En 88.606 proyectos de App Inventor solo el 6 % usa bucles y el 20 % procedimientos ([arXiv:2006.11327](https://arxiv.org/pdf/2006.11327)). Los novatos no llegan solos a esos conceptos, así que el juego debe introducirlos de forma explícita con retos que los necesiten (bloques 6 y 7).
