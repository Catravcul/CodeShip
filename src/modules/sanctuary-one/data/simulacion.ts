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
 * It holds the area's challenges, the ones the whole area takes (a band's rehearsal, a restaurant's service): she goes
 * in, and inside the simulation others come to take their parts. Everyone who takes part earns the reward.
 */
export const SIM_TANK = {
  /** Half its side, m (VirtualizationTank.radius). */
  half: 0.9,
  /** The water's height, m. */
  water: 2.4,
  /** The plinth, m: the tank's floor is this high. */
  base: 0.25,
  /** Half the doorway's width, m. */
  door: 0.55,
  /** The mask on its hook, beside the door (x, y, z from the tank's centre; the door is at −z). */
  mask: { x: 1.15, y: 1.5, z: -0.9 },
  /** The console, beside the tank. */
  console: { x: -1.5, z: -0.3 },
  /** Where she stands before going in, in front of the door. */
  front: { x: 0, z: -2.0 },
  source: "Cold Sanctuary, Assets/Scripts/Meditation/VirtualizationTank.cs (Build y Enter)",
} as const;

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
