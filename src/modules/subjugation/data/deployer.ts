import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";

/**
 * The CubeSat deployer Juventas really flies in (docs/design/modulo-lunar-juventas.md, «Cómo sale»): ISISPACE's
 * Deep Space Deployer (DSD), one per CubeSat on ESA's Hera (Juventas and Milani). Its door opens, the CubeSat
 * moves out to the edge still on its umbilical, then the springs release it at 3 cm/s.
 */
const DSD_SRC = "https://isispace.nl/product/deep_space_deployer/";
const DSD_HERA_SRC = "https://isispace.nl/isispace-deep-space-deployer-supports-esas-hera-mission-to-observe-dart-impact-and-beyond/";

export const DEEP_SPACE_DEPLOYER = {
  name: "Deep Space Deployer (ISISPACE)",
  /** Closed envelope, m (272 × 156,7 × 432,4 mm). */
  closedM: { value: [0.272, 0.1567, 0.4324] as const, source: DSD_SRC } as Sourced<readonly [number, number, number]>,
  /** Open envelope, m (272 × 206,77 × 555,05 mm): the door out and the CubeSat at the edge. */
  openM: { value: [0.272, 0.20677, 0.55505] as const, source: DSD_SRC } as Sourced<readonly [number, number, number]>,
  massKg: { value: 4.9, source: DSD_SRC } as Sourced<number>,
  releaseMs: { value: 0.03, source: DSD_HERA_SRC, note: "Menos de 5 cm/s para que la gravedad de Didymos la retenga" } as Sourced<number>,
} as const;

/** The ISS's way (for comparison, and for a release from the station): J-SSOD from Kibo's airlock and arm. */
export const J_SSOD = {
  releaseMs: { value: [0.77, 1.7] as const, source: "https://humans-in-space.jaxa.jp/en/biz-lab/experiment/facility/ef/jssod/" } as Sourced<readonly [number, number]>,
  steps: ["montar los estuches en el MPEP", "el MPEP sale por la esclusa de Kibo en su mesa", "el brazo JEMRMS lo agarra y lo lleva al punto de suelta", "orientarlo 45° hacia nadir y atrás", "los muelles la sueltan"],
} as const;

/**
 * Where deployer `slot` (of `count`) sits on the carrier, in its body frame: on the leeward hull (+y) of the
 * payload section, over the lander's ventral port, side by side across the hull. The probe inside sits just
 * under the skin; +y (out of the hull) is the release direction. Our layout (licence): Starship's payload
 * bay layout for a mission like this is not published.
 */
export function deployerBody(layout: { readonly spine: { readonly radiusM: number }; readonly port: { readonly position: Vec3 } }, slot: number, count: number, probeHalfY: number): Vec3 {
  const across = (slot - (count - 1) / 2) * (DEEP_SPACE_DEPLOYER.closedM.value[0] + 0.1);
  return new Vec3(across, layout.spine.radiusM - probeHalfY - 0.03, layout.port.position.z);
}
