import { csx } from "../sources";
import { C, pz, type ModelDef } from "./kit";

/**
 * Construction pieces that only Cold Sanctuary's scene has (exported 2026-11-19): the workbench with its tools and
 * helmet, and the sample wall of building techniques (guadua bamboo frame with wattle and clay plaster, rammed earth in
 * its formwork with the rammer, timber joinery with a pegged mortise and a kanna plane, a Nubian-style adobe arch and
 * ashlar stones). Parts as exported, front towards −z.
 */
const X = (what: string) =>
  csx(`Torre_Producción/Construction_Area/Construccion/${what}`);

export const CONSTRUCCION_EXTRA_MODELS: readonly ModelDef[] = [
  pz(
    "cons-banco",
    "mueble",
    "construccion-herramientas",
    "Banco de trabajo con taladro, sierra circular, tornillo, nivel y casco",
    0x8a6a4e,
    [
      C(0.0, 0.05, 0.03, 3, 0.1, 0.74, 0x5e636b), // Zocalo
      C(0.0, 0.47, -0.0, 3, 0.74, 0.8, 0x8a6a4e), // Armarios
      C(-1.2, 0.47, -0.41, 0.57, 0.68, 0.02, 0xb58e6a), // Puerta
      C(-0.99, 0.72, -0.43, 0.02, 0.12, 0.02, 0xb9bec6), // Tirador
      C(-0.6, 0.47, -0.41, 0.57, 0.68, 0.02, 0xb58e6a), // Puerta
      C(-0.39, 0.72, -0.43, 0.02, 0.12, 0.02, 0xb9bec6), // Tirador
      C(-0.0, 0.47, -0.41, 0.57, 0.68, 0.02, 0xb58e6a), // Puerta
      C(0.21, 0.72, -0.43, 0.02, 0.12, 0.02, 0xb9bec6), // Tirador
      C(0.6, 0.47, -0.41, 0.57, 0.68, 0.02, 0xb58e6a), // Puerta
      C(0.81, 0.72, -0.43, 0.02, 0.12, 0.02, 0xb9bec6), // Tirador
      C(1.2, 0.47, -0.41, 0.57, 0.68, 0.02, 0xb58e6a), // Puerta
      C(1.41, 0.72, -0.43, 0.02, 0.12, 0.02, 0xb9bec6), // Tirador
      C(0.0, 0.88, -0.0, 3.02, 0.04, 0.84, 0xdcd6cb), // Tablero
      C(-1.1, 0.98, 0.0, 0.3, 0.16, 0.2, 0x3366d9), // Taladro
      C(-0.6, 0.95, 0.0, 0.35, 0.1, 0.2, 0xf27326), // Sierra_circular
      C(0.3, 1.0, 0.1, 0.2, 0.2, 0.15, 0x333338), // Tornillo_banco
      C(0.9, 0.92, -0.0, 1, 0.02, 0.06, 0xf2bf26), // Nivel
      C(-0.2, 0.97, 0.15, 0.28, 0.14, 0.3, 0xf2bf26), // Casco
    ],
    "real",
    X("Banco_trabajo y Casco"),
  ),
  pz(
    "cons-muestrario",
    "maquina",
    "construccion-material",
    "Muestrario de técnicas: guadua, tapial, ensamble de madera, arco de adobe y sillares",
    0xa8754c,
    [
      C(-8.0, 0.15, 0.0, 1.8, 0.3, 1.2, 0x8f8a80), // Zocalo
      C(-8.7, 1.1, -0.4, 0.12, 1.6, 0.12, 0xc2ad61), // Cana_de_guadua
      C(-8.7, 1.1, 0.4, 0.12, 1.6, 0.12, 0xc2ad61), // Cana_de_guadua
      C(-7.3, 1.1, -0.4, 0.12, 1.6, 0.12, 0xc2ad61), // Cana_de_guadua
      C(-7.3, 1.1, 0.4, 0.12, 1.6, 0.12, 0xc2ad61), // Cana_de_guadua
      C(-8.0, 1.85, -0.4, 1.6, 0.1, 0.1, 0xc2ad61), // Viga_boca_de_pez
      C(-7.3, 1.8, -0.4, 0.16, 0.1, 0.16, 0x998052), // Atadura_de_canamo
      C(-8.0, 1.85, 0.4, 1.6, 0.1, 0.1, 0xc2ad61), // Viga_boca_de_pez
      C(-7.3, 1.8, 0.4, 0.16, 0.1, 0.16, 0x998052), // Atadura_de_canamo
      C(-8.0, 0.9, 0.4, 1.28, 1.2, 0.06, 0x99855c), // Esterilla
      C(-8.3, 0.9, 0.34, 0.66, 1.2, 0.06, 0xa8754c), // Revoque_de_barro_y_paja
      C(-4.7, 0.11, 0.0, 1.6, 0.22, 0.5, 0xa8754c), // Tongada_de_tierra
      C(-4.7, 0.33, 0.0, 1.6, 0.22, 0.5, 0xaf855a), // Tongada_de_tierra
      C(-4.7, 0.55, 0.0, 1.6, 0.22, 0.5, 0xa8754c), // Tongada_de_tierra
      C(-4.7, 0.77, 0.0, 1.6, 0.22, 0.5, 0xaf855a), // Tongada_de_tierra
      C(-4.7, 1.15, -0.29, 1.7, 0.5, 0.05, 0xb88c5c), // Tabla_del_tapial
      C(-4.7, 1.15, 0.29, 1.7, 0.5, 0.05, 0xb88c5c), // Tabla_del_tapial
      C(-4.2, 1.7, 0.0, 0.07, 1.2, 0.07, 0xb88c5c), // Mango_del_pison
      C(-4.2, 1.05, 0.0, 0.2, 0.12, 0.2, 0x333338), // Pison
      C(-1.4, 0.8, 0.0, 0.24, 1.6, 0.24, 0xcca370), // Pilar
      C(-1.85, 1.45, 0.0, 0.7, 0.2, 0.16, 0xcca370), // Viga_izquierda
      C(-0.95, 1.45, 0.0, 0.7, 0.2, 0.16, 0xc29866), // Viga_derecha
      C(-1.26, 1.45, 0.0, 0.3, 0.1, 0.08, 0x997047), // Espiga_a_la_vista
      C(-1.4, 1.45, 0.13, 0.06, 0.06, 0.1, 0x734c33), // Clavija_de_madera
      C(-2.0, 0.4, 0.0, 0.6, 0.8, 0.5, 0xb88c5c), // Caballete
      C(-2.0, 0.86, 0.0, 0.28, 0.1, 0.08, 0x333338), // Kanna_cepillo
      C(1.9, 0.6, -0.5, 1.7, 1.2, 0.16, 0xa8754c), // Testero
      C(2.58, 0.08, -0.34, 0.3, 0.236, 0.147, 0xa8754c), // Adobe
      C(2.528, 0.424, -0.34, 0.361, 0.331, 0.174, 0xab7c53), // Adobe
      C(2.381, 0.716, -0.34, 0.368, 0.378, 0.188, 0xae8459), // Adobe
      C(2.16, 0.912, -0.34, 0.318, 0.372, 0.186, 0xa8754c), // Adobe
      C(1.9, 0.98, -0.34, 0.22, 0.313, 0.169, 0xab7c53), // Adobe
      C(1.64, 0.912, -0.34, 0.318, 0.372, 0.186, 0xae8459), // Adobe
      C(1.419, 0.716, -0.34, 0.368, 0.378, 0.188, 0xa8754c), // Adobe
      C(1.272, 0.424, -0.34, 0.361, 0.331, 0.174, 0xab7c53), // Adobe
      C(1.22, 0.08, -0.34, 0.3, 0.236, 0.147, 0xae8459), // Adobe
      C(2.58, 0.02, -0.14, 0.3, 0.236, 0.147, 0xab7c53), // Adobe
      C(2.528, 0.364, -0.14, 0.361, 0.331, 0.174, 0xae8459), // Adobe
      C(2.381, 0.656, -0.14, 0.368, 0.378, 0.188, 0xa8754c), // Adobe
      C(2.16, 0.852, -0.14, 0.318, 0.372, 0.186, 0xab7c53), // Adobe
      C(1.9, 0.92, -0.14, 0.22, 0.313, 0.169, 0xae8459), // Adobe
      C(1.64, 0.852, -0.14, 0.318, 0.372, 0.186, 0xa8754c), // Adobe
      C(1.419, 0.656, -0.14, 0.368, 0.378, 0.188, 0xab7c53), // Adobe
      C(1.272, 0.364, -0.14, 0.361, 0.331, 0.174, 0xae8459), // Adobe
      C(1.22, 0.02, -0.14, 0.3, 0.236, 0.147, 0xa8754c), // Adobe
      C(2.58, -0.04, 0.06, 0.3, 0.236, 0.147, 0xae8459), // Adobe
      C(2.528, 0.304, 0.06, 0.361, 0.331, 0.174, 0xa8754c), // Adobe
      C(2.381, 0.596, 0.06, 0.368, 0.378, 0.188, 0xab7c53), // Adobe
      C(2.16, 0.791, 0.06, 0.318, 0.372, 0.186, 0xae8459), // Adobe
      C(1.9, 0.86, 0.06, 0.22, 0.313, 0.169, 0xa8754c), // Adobe
      C(1.64, 0.791, 0.06, 0.318, 0.372, 0.186, 0xab7c53), // Adobe
      C(1.419, 0.596, 0.06, 0.368, 0.378, 0.188, 0xae8459), // Adobe
      C(1.272, 0.304, 0.06, 0.361, 0.331, 0.174, 0xa8754c), // Adobe
      C(1.22, -0.04, 0.06, 0.3, 0.236, 0.147, 0xab7c53), // Adobe
      C(2.58, -0.1, 0.26, 0.3, 0.236, 0.147, 0xa8754c), // Adobe
      C(2.528, 0.244, 0.26, 0.361, 0.331, 0.174, 0xab7c53), // Adobe
      C(2.381, 0.536, 0.26, 0.368, 0.378, 0.188, 0xae8459), // Adobe
      C(2.16, 0.732, 0.26, 0.318, 0.372, 0.186, 0xa8754c), // Adobe
      C(1.9, 0.8, 0.26, 0.22, 0.313, 0.169, 0xab7c53), // Adobe
      C(1.64, 0.732, 0.26, 0.318, 0.372, 0.186, 0xae8459), // Adobe
      C(1.419, 0.536, 0.26, 0.368, 0.378, 0.188, 0xa8754c), // Adobe
      C(1.272, 0.244, 0.26, 0.361, 0.331, 0.174, 0xab7c53), // Adobe
      C(1.22, -0.1, 0.26, 0.3, 0.236, 0.147, 0xae8459), // Adobe
      C(4.65, 0.21, -0.011, 0.685, 0.436, 0.62, 0x8f8a80), // Sillar
      C(5.25, 0.21, -0.011, 0.485, 0.436, 0.62, 0x9a958c), // Sillar
      C(5.8, 0.21, -0.011, 0.585, 0.436, 0.62, 0xa5a199), // Sillar
      C(4.525, 0.604, -0.032, 0.435, 0.386, 0.618, 0x9a958c), // Sillar
      C(5.15, 0.604, -0.032, 0.785, 0.386, 0.618, 0xa5a199), // Sillar
      C(5.825, 0.604, -0.032, 0.535, 0.386, 0.618, 0x8f8a80), // Sillar
      C(4.6, 0.949, -0.05, 0.585, 0.336, 0.615, 0xa5a199), // Sillar
      C(5.1, 0.949, -0.05, 0.385, 0.336, 0.615, 0x8f8a80), // Sillar
      C(5.7, 0.949, -0.05, 0.785, 0.336, 0.615, 0x9a958c), // Sillar
    ],
    "real",
    X("Muestrario_tecnicas"),
  ),
];
