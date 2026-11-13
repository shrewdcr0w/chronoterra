import { buildCacheKey, getOrFetchCached } from './cacheManager';

export interface EonetEventMarker {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  dateISO: string;
  lon: number;
  lat: number;
  position: [number, number, number];
  sourceUrl?: string;
}

interface RawEonetEvent {
  id: string;
  title: string;
  categories?: Array<{ id: string; title: string }>;
  sources?: Array<{ id: string; url: string }>;
  geometry?: Array<{
    date: string;
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][][];
  }>;
}

interface RawEonetResponse {
  events: RawEonetEvent[];
}

/**
 * Converts geodetic latitude/longitude (degrees) into Three.js Cartesian [x, y, z]
 * aligned with standard equirectangular UV mapping on Three.js SphereGeometry.
 */
export function latLonToCartesian(latDeg: number, lonDeg: number, radius = 1.008): [number, number, number] {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [Number(x.toFixed(5)), Number(y.toFixed(5)), Number(z.toFixed(5))];
}

/**
 * Buckets EONET queries by YYYY-MM so scrubbing within a month reuses a single cached payload.
 */
export async function fetchEonetEventsForDate(
  dateISO: string
): Promise<{ events: EonetEventMarker[]; cacheSource: 'memory' | 'idb' | 'network' }> {
  const yearMonth = dateISO.slice(0, 7); // YYYY-MM
  const startISO = `${yearMonth}-01`;
  const [yearStr, monthStr] = yearMonth.split('-');
  const lastDay = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0)).getUTCDate();
  const endISO = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const cacheKey = buildCacheKey('eonet-v3', 'events-month', yearMonth, 'limit200');
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=all&start=${startISO}&end=${endISO}&limit=200`;

  const { data: rawEvents, source } = await getOrFetchCached<EonetEventMarker[]>(
    cacheKey,
    async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`NASA EONET HTTP ${res.status}`);
      }
      const json = (await res.json()) as RawEonetResponse;
      const parsed: EonetEventMarker[] = [];

      for (const ev of json.events || []) {
        if (!ev.geometry || ev.geometry.length === 0) continue;
        // Pick the geometry entry closest to the month window
        const geom = ev.geometry[ev.geometry.length - 1];
        let lon = 0;
        let lat = 0;

        if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          lon = Number(geom.coordinates[0]);
          lat = Number(geom.coordinates[1]);
        } else if (
          geom.type === 'Polygon' &&
          Array.isArray(geom.coordinates) &&
          Array.isArray(geom.coordinates[0]) &&
          Array.isArray(geom.coordinates[0][0])
        ) {
          lon = Number(geom.coordinates[0][0][0]);
          lat = Number(geom.coordinates[0][0][1]);
        } else {
          continue;
        }

        if (Number.isNaN(lon) || Number.isNaN(lat)) continue;

        const category = ev.categories?.[0] ?? { id: 'other', title: 'Natural Event' };
        parsed.push({
          id: ev.id,
          title: ev.title,
          categoryId: category.id,
          categoryTitle: category.title,
          dateISO: geom.date.slice(0, 10),
          lon,
          lat,
          position: latLonToCartesian(lat, lon, 1.008),
          sourceUrl: ev.sources?.[0]?.url,
        });
      }

      return parsed;
    }
  );

  // Filter events within +/- 15 days of the scrubbed dateISO
  const targetMs = Date.parse(`${dateISO}T00:00:00Z`);
  const windowMs = 15 * 86_400_000;
  const activeEvents = rawEvents.filter((ev) => {
    const evMs = Date.parse(`${ev.dateISO}T00:00:00Z`);
    return Math.abs(evMs - targetMs) <= windowMs;
  });

  return { events: activeEvents.length > 0 ? activeEvents : rawEvents.slice(0, 60), cacheSource: source };
}