/**
 * Small worlds for the coexistence cases (docs/qa/casos.md, área CV): the modules wired the way
 * main.ts wires them, without Three.js or the DOM. Each case builds only what it needs.
 */
import { Vec3 } from "@core/math/vec3";
import { Asteroid } from "@modules/celestial/domain/asteroid";
import { BENNU } from "@modules/celestial/data/bennu";
import { POLANA_MEMBERS } from "@modules/celestial/data/nueva-polana";
import { HULL_ENERGY_J, type Protection } from "@modules/asteroid-wrath/domain/protection";
import type { TargetKind } from "@modules/asteroid-wrath/domain/power";
import type { WrathTarget } from "@modules/asteroid-wrath/application/wrath";
import { RapportBook } from "@modules/subjugation/domain/rapport";
import { packageKg } from "@modules/subjugation/domain/yields";
import { AsteroidServices, type PursuitPort } from "@modules/subjugation/application/asteroid-services";
import { DeliveryLine } from "@modules/imports/domain/delivery";
import { MaterialStock } from "@modules/station/domain/materials";
import { Hangar } from "@modules/station/domain/hangar";
import { Station } from "@modules/station/domain/station";
import { POLANA_STATION } from "@modules/station/data/station";
import { STATION_TUNING } from "@modules/station/domain/blueprint";
import { BOARD_DAYS_PER_REAL_S, frameClocks, type FrameClocks } from "@modules/navigation/domain/travel-time";

/** Real seconds in a game day of life on board (main: NANO_DAYS_PER_SECOND = 1/40). */
export const DAY_REAL_S = 1 / BOARD_DAYS_PER_REAL_S;

/** The clocks of one frame, as main computes them. */
export const clocks = (dt: number, tripLapse = 1, manualWarp = 1): FrameClocks => frameClocks(dt, tripLapse, manualWarp, STATION_TUNING.hoursPerSecond);

/** Run `realS` seconds of frames of `dt`, calling `frame` with each frame's clocks. */
export function frames(realS: number, dt: number, tripLapse: number, frame: (c: FrameClocks) => void, manualWarp = 1): void {
  const n = Math.round(realS / dt);
  for (let i = 0; i < n; i++) frame(clocks(dt, tripLapse, manualWarp));
}

/** A wrath target that stands still (or where the test puts it) and records what it takes. */
export function wrathTarget(id: string, kind: TargetKind, position: Vec3, opts: { active?: () => boolean; crewed?: boolean } = {}) {
  const log = { damage: 0, dose: 0, pos: position, vel: Vec3.ZERO };
  const protection: Protection = { hullEnergyJ: HULL_ENERGY_J[kind], debrisFactor: 1, radiation: { material: "aluminio", arealDensityGcm2: 1 } };
  const t: WrathTarget = {
    id,
    kind,
    name: id,
    radiusM: kind === "estacion" ? 60 : 2,
    position: () => log.pos,
    velocity: () => log.vel,
    active: opts.active ?? (() => true),
    protection: () => protection,
    damage: (f) => (log.damage += f),
    dose: (m) => (log.dose += m),
    thrustAccelMs2: () => 0.33,
  };
  return { t, log };
}

/**
 * The asteroids' services wired to a real station and its delivery inbox (main: LevelsUi with the
 * import inbox), and the mothership's hold as a list of kg.
 */
export function servicesWorld(opts: { wrath?: PursuitPort; anchored?: () => boolean; stationPosition?: () => Vec3 } = {}) {
  const bennu = new Asteroid(BENNU, Vec3.ZERO);
  const member = new Asteroid(POLANA_MEMBERS[0]!, new Vec3(-4200, 900, -9000));
  const book = new RapportBook();
  const inbox = new DeliveryLine();
  const station = new Station(POLANA_STATION, new MaterialStock({}), new Hangar());
  const hold: number[] = [];
  const services = new AsteroidServices([bennu, member], {
    rapport: book,
    station: {
      position: opts.stationPosition ?? (() => station.position),
      radiusM: () => POLANA_STATION.radiusM,
      send: (source, label, goods, hours) => inbox.send(source, label, goods, hours),
      goods: (p) => Object.fromEntries(p.map((c) => [c.material, c.kg])),
    },
    ship: { position: () => new Vec3(250, 120, 1600), load: (p) => (hold.push(packageKg(p)), packageKg(p)) },
    wrath: opts.wrath,
    anchoredOn: opts.anchored ?? (() => false),
    secondsPerDay: DAY_REAL_S,
    stationHoursPerSecond: STATION_TUNING.hoursPerSecond,
  });
  /** One frame of main: services on the mission clock and the station clock, then the inbox and the machines. */
  const frame = (c: FrameClocks) => {
    services.update(c.missionS, c.stationHours);
    for (const d of inbox.tick(c.stationHours)) station.stock.add(d.goods);
    station.tick(c.stationHours);
  };
  const storedKg = () => station.stock.entries().reduce((s, [, kg]) => s + kg, 0);
  return { bennu, member, book, inbox, station, hold, services, frame, storedKg };
}
