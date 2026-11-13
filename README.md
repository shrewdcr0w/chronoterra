# Chronoterra

**Chronoterra** is an epistemic-first, browser-based 3D planetary visualization engine that models Earth across deep geological time (`400 Ma` to `14 Ma`), the satellite observational era (`2000 CE` to present), and 21st/22nd-century climate horizons (`2050`–`2200 CE`), integrated with real-time SGP4/SDP4 satellite tracking and a VSOP87 solar-system ephemeris explorer.

It is explicitly **not** a physically accurate General Circulation Model (GCM) or hydrocode geophysics simulator. Instead, it combines empirical satellite observations, published paleogeographic reconstructions, IPCC ensemble projections, and simplified analytical models—strictly classifying every visual layer and scene state into one of four transparent epistemic categories:
- **`OBSERVED`**: Empirical satellite imagery, natural hazard telemetry, SGP4 orbital elements, and astronomical ephemerides.
- **`RECONSTRUCTED`**: Peer-reviewed paleogeographic continental plate models (`PALEOMAP` / `GPlates`) and geological impact/eruption records with explicit paleomagnetic uncertainty notes.
- **`PROJECTED`**: Published multi-model climate ensemble outputs (`IPCC AR6 WGI` Shared Socioeconomic Pathways `SSP1-2.6`, `SSP2-4.5`, `SSP5-8.5`).
- **`HYPOTHETICAL`**: Simplified analytical catastrophe models (shockwave rings, ash dispersion, exponential flora recovery), procedural biome belts, and user-defined custom warming sliders.

---

## Core Features
1. **Epistemic Transparency by Design**: Every active dataset, HUD banner, viewport frame, and side-by-side comparison pane displays its exact epistemic classification (`OBSERVED`, `RECONSTRUCTED`, `PROJECTED`, `HYPOTHETICAL`) and upstream license.
2. **Satellite Era Earth Observation (Phase 3)**: Daily NASA EOSDIS GIBS WMS reflectance (`MODIS_Terra_CorrectedReflectance_TrueColor`), daytime thermal IR Land Surface Temperature (`MOD11C1`), and GPU-instanced NASA EONET v3 natural hazard markers backed by a two-tier LRU + IndexedDB (`idb-keyval`) cache.
3. **Geological Time Machine (Phase 4)**: Discrete paleogeographic time slices (`14 Ma`, `66 Ma`, `150 Ma`, `250 Ma`, `400 Ma`) with 3D craton coastline vectors, cartographic survey hatching, eustatic sea-level halos, and paleobiome belt overlays.
4. **Orbital Observatory (Phase 5)**: Fetches CelesTrak General Perturbations data explicitly as CCSDS **OMM-JSON** (`FORMAT=json`) to natively support both 5-digit and post-2026 6-digit+ NORAD catalog numbers, propagated at `PlanetaryState.timestamp` via `satellite.js` SGP4/SDP4.
5. **Solar System & Earth–Moon Explorer (Phase 6)**: Real heliocentric and geocentric positions, lunar phases, tidal-locked rotation, and sidereal/solar day lengths computed via `astronomy-engine`, with smooth damped camera travel and switchable **True 1:1 Scale** vs. **Educational Scale**.
6. **Event Laboratory (Phase 7)**: Curated historical/geological catastrophes (Hunga Tonga 2022, Chelyabinsk 2013, Pinatubo 1991, Tambora 1815, Chicxulub 66 Ma, Siberian Traps 250 Ma) and user-placed hypothetical impacts/eruptions with procedural shockwaves, ash clouds, and vegetation decay-and-regrowth curves.
7. **Future Earth Horizons (Phase 8)**: Discrete `2050`, `2100`, and `2200 CE` horizons for `SSP1-2.6`, `SSP2-4.5`, and `SSP5-8.5`, plus segregated custom warming and sea-level sliders.
8. **State Sharing, Side-by-Side Comparison & Hardware Profiler (Phase 9)**: `lz-string` URL hash serialization (`#state=...`) with `zod` untrusted-input validation, persistent local saved states, synchronized Side-by-Side Comparison (`ComparisonModal`), temporary Ultra-res PNG capture, and an in-app GPU benchmark sweep.

---

## Tech Stack
- **Application Shell**: React 18, TypeScript 5, Vite 6
- **3D Rendering**: Three.js (`0.170.0`), `@react-three/fiber`, `@react-three/drei`, custom GLSL shaders
- **State & Validation**: Zustand (`usePlanetaryStore`), Zod (`PlanetaryStateSchema`), `lz-string`, `idb-keyval`
- **Scientific & Orbital Engines**: `satellite.js` (`^7.1.0` OMM-JSON SGP4/SDP4), `astronomy-engine` (`^2.1.19`), `geotiff`, `proj4`
- **Testing & CI/CD**: Vitest, React Testing Library, JSDOM, GitHub Actions Pages deployment

---

## Installation, Development & Deployment

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (serves at http://localhost:5173/chronoterra/)
npm run dev

# 3. Run TypeScript typecheck and Vitest unit test suite
npm run lint
npm run test

# 4. Build production bundle and preview locally
npm run build
npm run preview