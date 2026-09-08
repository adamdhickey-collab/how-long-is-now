/**
 * Where the sun stands.
 *
 * NOAA's low-precision solar position, good to about a tenth of a degree
 * over the twenty-first century — a hundred times finer than any sky the
 * piece draws. Pure arithmetic: a moment in UTC and a place on Earth in,
 * altitude and azimuth out. The manifest decides which moments to ask for.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface SunPosition {
  /** Degrees above the horizon; negative once set. */
  altitude: number;
  /** Degrees clockwise from north: east 90, south 180, west 270. */
  azimuth: number;
  /** The sun's angle above the celestial equator, degrees: +23.44° at the
   *  June solstice, −23.44° in December, zero at the equinoxes. */
  declination: number;
  /** Minutes the sundial runs ahead of the clock. Positive in November,
   *  when the sun is early; negative in February, when it is late. */
  equationOfTime: number;
}

/** Sun position for an instant (ms since the Unix epoch, UTC) at a latitude
 *  and longitude in degrees, east positive. */
export function sunPosition(utcMs: number, lat: number, lon: number): SunPosition {
  const jd = utcMs / 86_400_000 + 2_440_587.5;
  const T = (jd - 2_451_545) / 36_525;

  // The sun's place on the ecliptic.
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(M * D2R) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * D2R) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * D2R);

  // Tilted onto the equator: declination, and the equation of time.
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * D2R);
  const decl = Math.asin(Math.sin(eps * D2R) * Math.sin(lambda * D2R));
  const y = Math.tan((eps * D2R) / 2) ** 2;
  const eot =
    4 *
    R2D *
    (y * Math.sin(2 * L0 * D2R) -
      2 * e * Math.sin(M * D2R) +
      4 * e * y * Math.sin(M * D2R) * Math.cos(2 * L0 * D2R) -
      0.5 * y * y * Math.sin(4 * L0 * D2R) -
      1.25 * e * e * Math.sin(2 * M * D2R));

  // The hour angle: how far past local solar noon this instant is.
  const date = new Date(utcMs);
  const minutesUTC = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const solarMinutes = (minutesUTC + eot + 4 * lon + 1440) % 1440;
  const ha = (solarMinutes / 4 - 180) * D2R;

  const phi = lat * D2R;
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const altitude = Math.asin(sinAlt) * R2D;
  const azimuth =
    (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * R2D +
      180 +
      360) %
    360;

  return { altitude, azimuth, declination: decl * R2D, equationOfTime: eot };
}
