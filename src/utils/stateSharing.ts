import LZString from 'lz-string';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { PlanetaryState, PlanetaryStateSchema } from '../types/planetaryState';

export const URL_HASH_PREFIX = '#state=';
export const SAVED_STATES_IDB_KEY = 'chronoterra:v1:saved-planetary-states';
const MAX_URL_PAYLOAD_CHARS = 8_192; // Guard against raw datasets encoded in URLs
const MAX_DATASET_ID_LENGTH = 128;

export type DecodeStateResult =
  | { success: true; state: PlanetaryState }
  | { success: false; error: string };

/**
 * Verifies that dataset fields contain only short identifier references and never raw data blobs/DataURLs.
 */
function assertNoRawDatasetPayloads(state: PlanetaryState): string | null {
  const refs = [
    state.geography.continentalModel,
    state.geography.terrainDataset,
    state.atmosphere.temperatureDataset,
    state.atmosphere.compositionDataset,
    state.atmosphere.cloudDataset,
    state.biosphere.vegetationDataset,
    state.biosphere.biomeDataset,
    state.biosphere.biodiversityDataset,
    state.orbitalState.satelliteDataset,
    state.orbitalState.planetaryEphemeris,
    ...state.scenario.sourceIds,
  ];

  for (const ref of refs) {
    if (!ref) continue;
    if (ref.length > MAX_DATASET_ID_LENGTH) {
      return `Dataset reference "${ref.slice(0, 24)}..." exceeds ${MAX_DATASET_ID_LENGTH} chars; raw datasets are forbidden in shareable state.`;
    }
    if (ref.startsWith('data:') || ref.includes('{') || ref.includes('[')) {
      return `Dataset reference "${ref.slice(0, 24)}..." contains inline data rather than a registry ID.`;
    }
  }
  return null;
}

/**
 * Compresses a validated PlanetaryState into a URL-safe hash string (#state=...).
 */
export function encodeStateToUrlHash(state: PlanetaryState): string {
  const parseCheck = PlanetaryStateSchema.safeParse(state);
  if (!parseCheck.success) {
    throw new Error(`Cannot encode invalid PlanetaryState: ${parseCheck.error.message}`);
  }
  const refError = assertNoRawDatasetPayloads(state);
  if (refError) {
    throw new Error(refError);
  }

  const json = JSON.stringify(parseCheck.data);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `${URL_HASH_PREFIX}${compressed}`;
}

/**
 * Decodes and validates an untrusted URL hash (#state=...) using lz-string and Zod.
 */
export function decodeStateFromUrlHash(hash: string): DecodeStateResult {
  if (!hash || !hash.startsWith(URL_HASH_PREFIX)) {
    return { success: false, error: 'URL hash does not start with #state=' };
  }

  const encodedPayload = hash.slice(URL_HASH_PREFIX.length).trim();
  if (!encodedPayload) {
    return { success: false, error: 'Empty #state= payload in URL hash' };
  }

  if (encodedPayload.length > MAX_URL_PAYLOAD_CHARS) {
    return {
      success: false,
      error: `URL payload length (${encodedPayload.length}) exceeds maximum safe limit (${MAX_URL_PAYLOAD_CHARS})`,
    };
  }

  let decompressed: string | null = null;
  try {
    decompressed = LZString.decompressFromEncodedURIComponent(encodedPayload);
  } catch {
    return { success: false, error: 'Failed to decompress lz-string payload' };
  }

  if (!decompressed) {
    return {
      success: false,
      error: 'Decompressed URL payload is null or corrupted',
    };
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(decompressed);
  } catch {
    return { success: false, error: 'Decompressed URL payload is not valid JSON' };
  }

  const validation = PlanetaryStateSchema.safeParse(rawParsed);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return {
      success: false,
      error: `Zod validation rejected URL state at "${firstIssue?.path.join('.') || 'root'}": ${firstIssue?.message}`,
    };
  }

  const refError = assertNoRawDatasetPayloads(validation.data);
  if (refError) {
    return { success: false, error: refError };
  }

  return { success: true, state: validation.data };
}

// In-memory fallback so saved states also work in restricted environments or JSDOM tests
let memorySavedStatesFallback: PlanetaryState[] = [];

export async function loadSavedStatesFromIdb(): Promise<PlanetaryState[]> {
  try {
    const rawList = await idbGet<unknown[]>(SAVED_STATES_IDB_KEY);
    if (!Array.isArray(rawList)) {
      return [...memorySavedStatesFallback];
    }
    const validStates: PlanetaryState[] = [];
    for (const item of rawList) {
      const parsed = PlanetaryStateSchema.safeParse(item);
      if (parsed.success && !assertNoRawDatasetPayloads(parsed.data)) {
        validStates.push(parsed.data);
      }
    }
    memorySavedStatesFallback = validStates;
    return validStates;
  } catch {
    return [...memorySavedStatesFallback];
  }
}

export async function saveNamedStateToIdb(
  label: string,
  state: PlanetaryState
): Promise<PlanetaryState[]> {
  const existing = await loadSavedStatesFromIdb();
  const cleanLabel = label.trim() || state.label || 'Saved Planetary State';
  const entry: PlanetaryState = {
    ...state,
    id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: cleanLabel,
    createdAt: Date.now(),
  };

  const updated = [entry, ...existing.filter((s) => s.id !== entry.id)].slice(0, 30);
  memorySavedStatesFallback = updated;

  try {
    await idbSet(SAVED_STATES_IDB_KEY, updated);
  } catch {
    // Fallback to in-memory array when IndexedDB is unavailable
  }

  return updated;
}

export async function deleteSavedStateFromIdb(id: string): Promise<PlanetaryState[]> {
  const existing = await loadSavedStatesFromIdb();
  const updated = existing.filter((s) => s.id !== id);
  memorySavedStatesFallback = updated;

  try {
    await idbSet(SAVED_STATES_IDB_KEY, updated);
  } catch {
    // Ignore in environments without IndexedDB
  }

  return updated;
}

export async function clearSavedStatesInIdb(): Promise<void> {
  memorySavedStatesFallback = [];
  try {
    await idbSet(SAVED_STATES_IDB_KEY, []);
  } catch {
    // Ignore
  }
}