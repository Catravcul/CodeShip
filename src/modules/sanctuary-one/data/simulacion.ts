import type { Procedure } from "./retos";
import type { MotionId } from "./animaciones";

/**
 * THE SIMULATION MACHINE (Cold Sanctuary, Assets/Scripts/Meditation/VirtualizationMachine.cs and VirtualizationTank.cs;
 * Berón 2026-11-23: «para las misiones que abarcan el área completa les falta la máquina de simulación… es como una
 * pecera gigante con puertas horizontales y un equipo en la puerta»). A square glass tank of water on a low plinth; its
 * front is a door of two glass leaves sliding to the sides, and when open a magnetic field in the frame holds the water
 * as a wall (the «Moisés» effect of diamagnetic water: real, but holding 2,4 m of water would ask ~75–80 T, nearly twice
 * the strongest continuous magnet, ~45 T: that part is the sanctuary's magic). The breathing mask hangs on its tube by
 * the door; the console stands at its side.
 *
 * It takes her (and those with her) into the microcosms. The area's challenges, the ones the whole area takes (a band's
 * rehearsal, a restaurant's service), are offered at the floor's carpet station (Berón 2026-11-24): others come to take
 * their parts, and everyone who takes part earns the reward.
 */
export const SIM_TANK = {
  /**
   * Half its side, m: a great tank of 9 × 9 m, the only one in the sanctuary, on the plaza, that many go into at once
   * (Berón 2026-11-24; Cold Sanctuary's VirtualizationTank is 1,8 m for one person).
   */
  half: 4.5,
  /** The water's height, m. */
  water: 4,
  /** The plinth, m: the tank's floor is this high. */
  base: 0.3,
  /** Half the doorway's width, m (a door 2,8 m wide). */
  door: 1.4,
  /** The rack of masks on their hooks, beside the door (x, y, z from the tank's centre; the door is at −z): one each. */
  mask: { x: 2.6, y: 1.5, z: -4.95 },
  /** How many masks the rack holds: how many go in at once. */
  places: 9,
  /** The console, beside the tank. */
  console: { x: -5.3, z: -2.5 },
  /** Where she stands before going in, in front of the door. */
  front: { x: 0, z: -6.4 },
  source: "Cold Sanctuary, Assets/Scripts/Meditation/VirtualizationTank.cs (Build y Enter), a 5 veces su tamaño",
} as const;

/** Where each of the others floats, round her in the middle (x, z from the tank's centre, m). */
export const SIM_SPOTS: readonly { readonly x: number; readonly z: number }[] = Array.from({ length: SIM_TANK.places - 1 }, (_, i) => {
  const a = (i / (SIM_TANK.places - 1)) * Math.PI * 2;
  return { x: Math.sin(a) * 2.6, z: Math.cos(a) * 2.6 };
});

/** A part someone else takes in an area's challenge: where (a thing of the floor, or a place in front of hers) and doing what. */
export interface SimRole {
  readonly label: string;
  /** The model whose station they take (the first on the floor not taken), or none: `front` of her place. */
  readonly model?: string;
  /** In front of her (her frame: x to her right, z ahead, m), facing her. */
  readonly front?: { readonly x: number; readonly z: number };
  readonly motion: MotionId;
}

/** An area's challenge in the machine: hers is done at `player`'s thing; the others' parts are `roles`. */
export interface SimReto {
  readonly procedure: Procedure;
  readonly player: string;
  readonly playerRole: string;
  readonly roles: readonly SimRole[];
}

const ensayo: Procedure = {
  id: "sim-ensayo-banda",
  title: "Ensayo de la banda (en equipo)",
  kind: "trabajar",
  reward: "compania",
  scenario: "La banda entera ensaya en la simulación: tú cantas",
  steps: [
    "cada uno afina su instrumento con el afinador a {440|100|1000} Hz",
    "prueba de sonido canal por canal, de la batería a la voz",
    "el batería marca el tempo con cuatro golpes de baqueta",
    "tocad la estrofa juntos, escuchando al bajo y a la batería",
    "repetid el estribillo hasta que entre a tiempo",
    "grabad el ensayo y escuchadlo juntos",
  ],
  wrong: ["cada uno toca a su tempo", "subid todos el volumen para oíros"],
  source: "Ericsson et al., The role of deliberate practice, Psychological Review 100 (1993); Davis y Jones, The Sound Reinforcement Handbook (1989)",
  reality: "real",
};

const servicio: Procedure = {
  id: "sim-servicio-sala",
  title: "Servicio en el restaurante (en equipo)",
  kind: "cocinar",
  reward: "comida",
  scenario: "Hora de comer en la simulación: tú llevas el pase, otros cocinan y otros son clientes",
  steps: [
    "recibe la comanda del cliente y repítela para confirmarla",
    "cántala a cocina: mesa, platos y alergias",
    "cocina marca los tiempos: los entrantes primero",
    "revisa cada plato en el pase: temperatura y borde limpio",
    "sirve por la izquierda y retira por la derecha",
    "pregunta al cliente qué tal y despídelo",
  ],
  wrong: ["sirve sin repetir la comanda", "calla las alergias a cocina"],
  source: "Escuela de Hostelería, Servicios de restaurante (Paraninfo, 2019); FDA Food Code (2022) 3-603.11 (aviso de alérgenos)",
  reality: "real",
};

/** The area's challenges of each floor's machine (by the floor's furnish id). */
export const SIM_RETOS: Readonly<Record<string, readonly SimReto[]>> = {
  salas: [
    {
      procedure: ensayo,
      player: "mus-microfonos",
      playerRole: "voz",
      roles: [
        { label: "batería", model: "mus-bateria", motion: "tocar-bateria" },
        { label: "guitarra", model: "mus-ampli-guitarra", motion: "tocar-guitarra" },
        { label: "bajo", model: "mus-ampli-bajo", motion: "tocar-bajo" },
        { label: "teclado", model: "mus-teclado", motion: "tocar-teclado" },
      ],
    },
  ],
  restaurante: [
    {
      procedure: servicio,
      player: "cocina-barra-servicio",
      playerRole: "camarera en el pase",
      roles: [
        { label: "cocinera", model: "cocina-puesto", motion: "cocinar" },
        { label: "cocinero", model: "cocina-puesto", motion: "cocinar" },
        { label: "emplatado", model: "cocina-mesa-emplatado", motion: "emplatar-plato" },
        { label: "cliente", front: { x: -0.8, z: 1.6 }, motion: "pedir" },
        { label: "cliente", front: { x: 0.8, z: 1.6 }, motion: "pedir" },
      ],
    },
  ],
};

/** A microcosm the machine takes her into (Berón 2026-11-23: «¿Podrías crear el de Platón?»; modules/microcosmos). */
export interface SimMicrocosmos {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

/** The microcosms: any simulation machine takes her into any of them (Berón 2026-11-24: «debe ser posible entrar a
 * todos los microcosmos desde cualquier máquina de simulación»). Each is loaded only when she goes in. */
export const MICROCOSMOS: readonly SimMicrocosmos[] = [
  { id: "academia-platon", title: "Microcosmos: la Academia de Platón", detail: "Atenas, verano de 360 a. C. · un día con Platón y sus discípulos, 8 pasos y 6 retos" },
];
