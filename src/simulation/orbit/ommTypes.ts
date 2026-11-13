export type CelestrakGroupId = 'stations' | 'weather' | 'gps-ops' | 'resource';

export type OrbitalRegime = 'LEO' | 'MEO' | 'GEO' | 'HEO';

/**
 * CCSDS Orbit Mean-Elements Message (OMM) JSON schema returned by:
 * https://celestrak.org/NORAD/elements/gp.php?GROUP={GROUP}&FORMAT=json
 * Supports 1 to 9 digit NORAD_CAT_ID values (including 6-digit post-2026 catalog objects).
 */
export interface CelestrakOmmRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string;               // International Designator (e.g., "1998-067A")
  EPOCH: string;                   // ISO-8601 UTC timestamp (e.g., "2026-11-12T08:15:22.104192")
  MEAN_MOTION: number;             // Revolutions per day
  ECCENTRICITY: number;
  INCLINATION: number;             // Degrees
  RA_OF_ASC_NODE: number;          // Right Ascension of Ascending Node (Degrees)
  ARG_OF_PERICENTER: number;       // Argument of Perigee (Degrees)
  MEAN_ANOMALY: number;            // Degrees
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;     // "U" (Unclassified)
  NORAD_CAT_ID: number;            // 5-digit or 6-digit+ integer (e.g., 25544 or 100042)
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;                   // B* drag term (1 / Earth radii)
  MEAN_MOTION_DOT: number;         // First derivative of mean motion
  MEAN_MOTION_DDOT: number;        // Second derivative of mean motion
}

export interface PropagatedSatelliteState {
  noradId: number;
  name: string;
  objectId: string;
  group: CelestrakGroupId;
  regime: OrbitalRegime;
  epochISO: string;
  inclinationDeg: number;
  eccentricity: number;
  periodMinutes: number;
  altitudeKm: number;
  velocityKmS: number;
  latDeg: number;
  lonDeg: number;
  /** Three.js world-space coordinates in Earth radii (R_earth = 1.0) */
  positionScene: [number, number, number];
  dataSourceLabel: string;
  omm: CelestrakOmmRecord;
}

export interface CelestrakGroupDefinition {
  id: CelestrakGroupId;
  label: string;
  description: string;
  defaultEnabled: boolean;
  colorHex: string;
}

export const CELESTRAK_GROUPS: CelestrakGroupDefinition[] = [
  {
    id: 'stations',
    label: 'Space Stations',
    description: 'Crewed orbital outposts (ISS, Tiangong/CSS, visiting spacecraft)',
    defaultEnabled: true,
    colorHex: '#facc15', // High-visibility amber-gold
  },
  {
    id: 'weather',
    label: 'Weather Satellites',
    description: 'Meteorological & polar/geostationary environmental imagers (NOAA, METOP, GOES)',
    defaultEnabled: true,
    colorHex: '#38bdf8', // Sky cyan
  },
  {
    id: 'gps-ops',
    label: 'GPS Navigation (MEO)',
    description: 'Operational US Global Positioning System Medium Earth Orbit constellation',
    defaultEnabled: false,
    colorHex: '#4ade80', // Emerald green
  },
  {
    id: 'resource',
    label: 'Earth Resources & SAR',
    description: 'Landsat, Sentinel, and remote-sensing satellites',
    defaultEnabled: false,
    colorHex: '#f472b6', // Rose pink
  },
];

/**
 * Classifies an orbit into LEO, MEO, GEO, or HEO using its period, eccentricity, and altitude.
 */
export function classifyOrbitRegime(
  meanMotionRevPerDay: number,
  eccentricity: number,
  altitudeKm: number
): OrbitalRegime {
  if (eccentricity >= 0.25) {
    return 'HEO';
  }
  const periodMinutes = 1440 / Math.max(0.01, meanMotionRevPerDay);
  if (periodMinutes >= 1380 && periodMinutes <= 1500 && Math.abs(altitudeKm - 35786) < 2500) {
    return 'GEO';
  }
  if (altitudeKm < 2000) {
    return 'LEO';
  }
  return 'MEO';
}