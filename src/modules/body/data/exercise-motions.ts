import type { ExerciseMotionData, MotionKey } from "../domain/exercise-motion";

/**
 * The exercise motions of the ISS machines (docs/design/equipos.md), on Cold Sanctuary's skeleton (Unity
 * convention, as the asanas: degrees per joint, metres from the floor between her feet, x to her right, z ahead).
 * The machines are real (T2, CEVIS, ARED: ISS); the angles of each key are ours, read from how the movement looks
 * («licencia» of animation). The CEVIS has no seat: her feet are clipped to the pedals and she holds the bars.
 */
const ISS_EXERCISE = "Ejercicio en la ISS: cinta T2 con arnés, ARED (sentadilla, peso muerto) y bicicleta CEVIS sin asiento: https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884";

const FORE: MotionKey["joints"] = { ForearmLeft: [-85, 0, 0], ForearmRight: [-85, 0, 0], Back: [8, 0, 0], Head: [-6, 0, 0] };

/** A running stride: left foot strikes ahead, then passes under her while the right swings through (and mirrored). */
const stride = (lead: "Left" | "Right"): MotionKey[] => {
  const back = lead === "Left" ? "Right" : "Left";
  return [
    { joints: { ...FORE, [`Thigh${lead}`]: [-32, 0, 0], [`Shin${lead}`]: [15, 0, 0], [`Thigh${back}`]: [25, 0, 0], [`Shin${back}`]: [80, 0, 0], [`Shoulder${lead}`]: [32, 0, 0], [`Shoulder${back}`]: [-38, 0, 0] }, rootHeight: null, stanceWidth: 0.16, reaches: [] },
    { joints: { ...FORE, [`Thigh${lead}`]: [4, 0, 0], [`Shin${lead}`]: [22, 0, 0], [`Thigh${back}`]: [-48, 0, 0], [`Shin${back}`]: [100, 0, 0], [`Shoulder${lead}`]: [0, 0, 0], [`Shoulder${back}`]: [0, 0, 0] }, rootHeight: null, stanceWidth: 0.16, reaches: [] },
  ];
};

/** The CEVIS's crank axle (ahead of her and low), its crank radius and the bars, in her body frame (m). */
export const CEVIS_FIT = { axleY: 0.38, axleZ: 0.4, crankM: 0.17, pedalX: 0.12, barY: 1.1, barZ: 0.42, barX: 0.22 } as const;
const CRANK_KEYS = 8;
/** Pedal of one side at crank angle `a` (0 = top, a quarter turn = ahead: pedalling forward). */
const pedal = (a: number, x: number): [number, number, number] => [x, CEVIS_FIT.axleY + CEVIS_FIT.crankM * Math.cos(a), CEVIS_FIT.axleZ + CEVIS_FIT.crankM * Math.sin(a)];
const cycleKeys: MotionKey[] = Array.from({ length: CRANK_KEYS }, (_, k) => {
  const a = (2 * Math.PI * k) / CRANK_KEYS;
  return {
    joints: { Back: [14, 0, 0], Chest: [8, 0, 0], Head: [-18, 0, 0], ThighLeft: [-70, 0, 0], ThighRight: [-70, 0, 0], ShinLeft: [70, 0, 0], ShinRight: [70, 0, 0], ShoulderLeft: [-60, 0, 0], ShoulderRight: [-60, 0, 0] },
    rootHeight: null,
    stanceWidth: 0.2,
    reaches: [
      { end: "FootLeft", target: pedal(a, -CEVIS_FIT.pedalX), en: "cuerpo" },
      { end: "FootRight", target: pedal(a + Math.PI, CEVIS_FIT.pedalX), en: "cuerpo" },
      { end: "HandLeft", target: [-CEVIS_FIT.barX, CEVIS_FIT.barY, CEVIS_FIT.barZ], en: "cuerpo" },
      { end: "HandRight", target: [CEVIS_FIT.barX, CEVIS_FIT.barY, CEVIS_FIT.barZ], en: "cuerpo" },
    ],
  };
});

/** The ARED's bar on her shoulders: hands just outside them (the chest's frame, as Cold Sanctuary's reaches). */
const BAR_HANDS: MotionKey["reaches"] = [
  { end: "HandLeft", target: [-0.34, 1.53, -0.04], en: "pecho" },
  { end: "HandRight", target: [0.34, 1.53, -0.04], en: "pecho" },
];

export const EXERCISE_MOTIONS: readonly ExerciseMotionData[] = [
  { id: "carrera-t2", name: "Carrera en la T2 con arnés", device: "cinta", source: ISS_EXERCISE, cycleS: 0.72, grounded: true, ease: "continuo", keys: [...stride("Left"), ...stride("Right")] },
  { id: "pedaleo-cevis", name: "Pedaleo en la CEVIS", device: "bicicleta", source: ISS_EXERCISE, cycleS: 0.8, grounded: false, ease: "continuo", keys: cycleKeys },
  {
    id: "sentadilla-ared",
    name: "Sentadilla en el ARED",
    device: "fuerza",
    source: ISS_EXERCISE,
    cycleS: 3.2,
    grounded: true,
    ease: "suave",
    keys: [
      { joints: { Head: [-4, 0, 0] }, rootHeight: null, stanceWidth: 0.36, reaches: BAR_HANDS },
      { joints: { Hips: [30, 0, 0], Back: [6, 0, 0], Head: [-22, 0, 0], ThighLeft: [-100, 0, 0], ThighRight: [-100, 0, 0], ShinLeft: [105, 0, 0], ShinRight: [105, 0, 0], FootLeft: [-35, 0, 0], FootRight: [-35, 0, 0] }, rootHeight: null, stanceWidth: 0.36, reaches: BAR_HANDS },
    ],
  },
];

export const motionOf = (device: ExerciseMotionData["device"]): ExerciseMotionData => EXERCISE_MOTIONS.find((m) => m.device === device)!;
