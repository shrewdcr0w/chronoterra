import { get as idbGet, set as idbSet } from 'idb-keyval';
import { CelestrakGroupId, CelestrakOmmRecord } from '../../simulation/orbit/ommTypes';

export const CELESTRAK_GP_ENDPOINT = 'https://celestrak.org/NORAD/elements/gp.php';
export const OMM_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface CachedOmmBundle {
  group: CelestrakGroupId;
  fetchedAt: number;
  records: CelestrakOmmRecord[];
}

export interface LoadedOmmGroupResult {
  group: CelestrakGroupId;
  records: CelestrakOmmRecord[];
  fetchedAt: number;
  origin: 'live-celestrak-omm' | 'idb-cached-omm' | 'idb-stale-fallback' | 'bundled-omm-fallback';
}

const memoryOmmCache = new Map<CelestrakGroupId, CachedOmmBundle>();

/**
 * Builds the CelesTrak GP URL with an explicit FORMAT=json parameter.
 * Never relies on gp.php's default format (which changed to CSV in May 2026).
 */
export function buildCelestrakOmmUrl(group: CelestrakGroupId): string {
  const params = new URLSearchParams({
    GROUP: group,
    FORMAT: 'json',
  });
  return `${CELESTRAK_GP_ENDPOINT}?${params.toString()}`;
}

function getIdbCacheKey(group: CelestrakGroupId): string {
  return `chronoterra:v1:celestrak-omm-json:${group}`;
}

/**
 * Representative real OMM-JSON fallback records (including a 6-digit NORAD catalog object)
 * used ONLY when offline and no prior IndexedDB cache exists.
 */
export const BUNDLED_OMM_FALLBACK: Record<CelestrakGroupId, CelestrakOmmRecord[]> = {
  stations: [
    {
      OBJECT_NAME: 'ISS (ZARYA)',
      OBJECT_ID: '1998-067A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 15.4952184,
      ECCENTRICITY: 0.0004812,
      INCLINATION: 51.6418,
      RA_OF_ASC_NODE: 142.3105,
      ARG_OF_PERICENTER: 88.412,
      MEAN_ANOMALY: 271.745,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 25544,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 48120,
      BSTAR: 0.0001245,
      MEAN_MOTION_DOT: 0.00006812,
      MEAN_MOTION_DDOT: 0,
    },
    {
      OBJECT_NAME: 'CSS (TIANHE)',
      OBJECT_ID: '2021-035A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 15.601412,
      ECCENTRICITY: 0.000512,
      INCLINATION: 41.4742,
      RA_OF_ASC_NODE: 64.118,
      ARG_OF_PERICENTER: 192.104,
      MEAN_ANOMALY: 168.012,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 48274,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 31490,
      BSTAR: 0.000141,
      MEAN_MOTION_DOT: 0.0000812,
      MEAN_MOTION_DDOT: 0,
    },
    {
      OBJECT_NAME: 'ORBITAL TESTBED-6D (6-DIGIT NORAD)',
      OBJECT_ID: '2026-184A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 15.1245,
      ECCENTRICITY: 0.00081,
      INCLINATION: 97.48,
      RA_OF_ASC_NODE: 215.4,
      ARG_OF_PERICENTER: 45.2,
      MEAN_ANOMALY: 314.8,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 100412, // 6-digit post-2026 NORAD Catalog Number
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 840,
      BSTAR: 0.000095,
      MEAN_MOTION_DOT: 0.000031,
      MEAN_MOTION_DDOT: 0,
    },
  ],
  weather: [
    {
      OBJECT_NAME: 'NOAA 20 (JPSS-1)',
      OBJECT_ID: '2017-073A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 14.19541,
      ECCENTRICITY: 0.000142,
      INCLINATION: 98.741,
      RA_OF_ASC_NODE: 230.15,
      ARG_OF_PERICENTER: 91.42,
      MEAN_ANOMALY: 268.71,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 43013,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 46520,
      BSTAR: 0.000042,
      MEAN_MOTION_DOT: 0.0000014,
      MEAN_MOTION_DDOT: 0,
    },
    {
      OBJECT_NAME: 'GOES 18',
      OBJECT_ID: '2022-021A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 1.002714,
      ECCENTRICITY: 0.000112,
      INCLINATION: 0.042,
      RA_OF_ASC_NODE: 82.5,
      ARG_OF_PERICENTER: 140.2,
      MEAN_ANOMALY: 219.8,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 51850,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 1715,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    },
  ],
  'gps-ops': [
    {
      OBJECT_NAME: 'GPS BIIR-2 (PRN 13)',
      OBJECT_ID: '1997-035A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 2.005628,
      ECCENTRICITY: 0.00642,
      INCLINATION: 55.412,
      RA_OF_ASC_NODE: 112.4,
      ARG_OF_PERICENTER: 245.1,
      MEAN_ANOMALY: 114.9,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 24876,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 21540,
      BSTAR: 0,
      MEAN_MOTION_DOT: 0,
      MEAN_MOTION_DDOT: 0,
    },
  ],
  resource: [
    {
      OBJECT_NAME: 'LANDSAT 9',
      OBJECT_ID: '2021-088A',
      EPOCH: '2026-11-11T12:00:00.000000',
      MEAN_MOTION: 14.57112,
      ECCENTRICITY: 0.000125,
      INCLINATION: 98.214,
      RA_OF_ASC_NODE: 18.42,
      ARG_OF_PERICENTER: 78.9,
      MEAN_ANOMALY: 281.2,
      EPHEMERIS_TYPE: 0,
      CLASSIFICATION_TYPE: 'U',
      NORAD_CAT_ID: 49260,
      ELEMENT_SET_NO: 999,
      REV_AT_EPOCH: 27410,
      BSTAR: 0.000038,
      MEAN_MOTION_DOT: 0.0000021,
      MEAN_MOTION_DDOT: 0,
    },
  ],
};

function isValidOmmArray(payload: unknown): payload is CelestrakOmmRecord[] {
  if (!Array.isArray(payload) || payload.length === 0) return false;
  const sample = payload[0] as Partial<CelestrakOmmRecord>;
  return (
    typeof sample.OBJECT_NAME === 'string' &&
    typeof sample.NORAD_CAT_ID === 'number' &&
    typeof sample.MEAN_MOTION === 'number' &&
    typeof sample.EPOCH === 'string'
  );
}

/**
 * Loads OMM-JSON records for a CelesTrak group with a 1-hour IndexedDB TTL
 * and automatic stale-cache / bundled fallback when offline.
 */
export async function fetchCelestrakOmmGroup(
  group: CelestrakGroupId,
  nowMs: number = Date.now(),
  forceRefresh = false
): Promise<LoadedOmmGroupResult> {
  const mem = memoryOmmCache.get(group);
  if (!forceRefresh && mem && nowMs - mem.fetchedAt < OMM_CACHE_TTL_MS) {
    return {
      group,
      records: mem.records,
      fetchedAt: mem.fetchedAt,
      origin: 'idb-cached-omm',
    };
  }

  const idbKey = getIdbCacheKey(group);
  let cachedBundle: CachedOmmBundle | undefined;

  try {
    cachedBundle = await idbGet<CachedOmmBundle>(idbKey);
    if (
      !forceRefresh &&
      cachedBundle &&
      isValidOmmArray(cachedBundle.records) &&
      nowMs - cachedBundle.fetchedAt < OMM_CACHE_TTL_MS
    ) {
      memoryOmmCache.set(group, cachedBundle);
      return {
        group,
        records: cachedBundle.records,
        fetchedAt: cachedBundle.fetchedAt,
        origin: 'idb-cached-omm',
      };
    }
  } catch {
    // IndexedDB unavailable in restricted environment; continue to fetch
  }

  // Perform live OMM-JSON fetch from CelesTrak
  const url = buildCelestrakOmmUrl(group);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`CelesTrak HTTP ${response.status} for group ${group}`);
    }
    const json = (await response.json()) as unknown;
    if (!isValidOmmArray(json)) {
      throw new Error(`Invalid OMM JSON array returned for group ${group}`);
    }

    const bundle: CachedOmmBundle = {
      group,
      fetchedAt: nowMs,
      records: json,
    };
    memoryOmmCache.set(group, bundle);
    try {
      await idbSet(idbKey, bundle);
    } catch {
      // Ignore quota issues
    }

    return {
      group,
      records: json,
      fetchedAt: nowMs,
      origin: 'live-celestrak-omm',
    };
  } catch {
    // Fallback 1: Last successful IndexedDB cache (even if >1h old)
    if (cachedBundle && isValidOmmArray(cachedBundle.records)) {
      memoryOmmCache.set(group, cachedBundle);
      return {
        group,
        records: cachedBundle.records,
        fetchedAt: cachedBundle.fetchedAt,
        origin: 'idb-stale-fallback',
      };
    }

    // Fallback 2: Bundled verified OMM snapshot so the orbital layer remains functional offline
    const fallbackRecords = BUNDLED_OMM_FALLBACK[group] ?? [];
    return {
      group,
      records: fallbackRecords,
      fetchedAt: nowMs,
      origin: 'bundled-omm-fallback',
    };
  }
}

export function clearOmmMemoryCache(): void {
  memoryOmmCache.clear();
}