import type { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";

/**
 * Something the ship can travel to. Today only asteroids; the union leaves room for other kinds
 * (for example docking with a mothership) that bring their own flight target and arrival rule.
 */
export type NavTarget = AsteroidTarget;

export interface AsteroidTarget {
  readonly kind: "asteroid";
  readonly id: string;
  readonly name: string;
  readonly body: Asteroid;
}

export const asteroidTarget = (body: Asteroid): AsteroidTarget => ({ kind: "asteroid", id: body.data.id, name: body.data.name, body });

/** Centre of the target, world frame, metres. */
export const targetPosition = (t: NavTarget): Vec3 => t.body.position;
