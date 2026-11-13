# Attributions & Dataset License Registry

**Code License:** All source code in Chronoterra is licensed under the **MIT License** (see `LICENSE`).
**Asset & Dataset Policy:** Every scientific dataset, ephemeris table, and planetary texture retains its original upstream license and citation requirements. This file is parsed directly at runtime by `src/components/AttributionsModal.tsx`.

## Dataset & Texture Registry

| Source ID | Title / Dataset | Category | Epistemic Class | Upstream License | Citation / Attribution URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | 
| `gibs-modis-terra-truecolor` | NASA GIBS MODIS Terra Corrected Reflectance (True Color) | Imagery | `OBSERVED` | Public Domain (17 U.S.C. § 105) | NASA EOSDIS Global Imagery Browse Services (`https://earthdata.nasa.gov/gibs`) | 
| `gibs-modis-terra-lst-day` | NASA GIBS MODIS Terra Land Surface Temperature (Day, MOD11C1) | Thermal | `OBSERVED` | Public Domain (17 U.S.C. § 105) | Wan, Z. et al. / NASA LP DAAC (`https://lpdaac.usgs.gov/products/mod11c1v061/`) | 
| `nasa-eonet-v3-events` | NASA Earth Observatory Natural Event Tracker (EONET v3) | Events | `OBSERVED` | Public Domain (17 U.S.C. § 105) | NASA Goddard Space Flight Center (`https://eonet.gsfc.nasa.gov/docs/v3`) | 
| `scotese-gplates-paleomap-v3` | Scotese PALEOMAP & EarthByte GPlates Continental Reconstructions | Paleogeography | `RECONSTRUCTED` | CC-BY-4.0 | Scotese, C.R. & Wright, N. (2018), EarthByte / GPlates (`https://www.earthbyte.org/`) | 
| `paleobiome-climate-belt-procedural-v1` | Rule-Based Paleobiome & Ancient Flora Zonal Reconstruction | Paleobiome | `HYPOTHETICAL` | MIT (Internal Code) | Parameterized from Scotese, C.R. et al. (2021), *Earth-Science Reviews* 215 | 
| `celestrak-gp-omm-json` | CelesTrak General Perturbations (GP) OMM-JSON Catalog | Orbital | `OBSERVED` | Public Domain / CelesTrak Open Data | Kelso, T.S. / 18th Space Defense Squadron (`https://celestrak.org/NORAD/elements/`) | 
| `astronomy-engine-ephemeris` | VSOP87 / ELP2000 Heliocentric & Geocentric Ephemerides | Ephemeris | `OBSERVED` | MIT License | Cross, D., `astronomy-engine` v2.1.19 (`https://github.com/cosinekitty/astronomy`) | 
| `sss-solar-system-textures-2k` | Solar System Scope Planetary & Lunar Surface Maps | Texture | `OBSERVED` | CC-BY-4.0 | Solar System Scope (`https://www.solarsystemscope.com/textures/`) | 
| `smithsonian-gvp-historical-volcanoes` | Smithsonian Global Volcanism Program Eruption Catalog | Events | `OBSERVED` / `RECONSTRUCTED` | CC-BY-4.0 | Smithsonian Institution NMNH (`https://volcano.si.edu/`) | 
| `earth-impact-database-passc` | Earth Impact Database (PASSC) & NASA CNEOS Superbolide Catalog | Events | `RECONSTRUCTED` / `OBSERVED` | Academic Open Access / Public Domain | Schulte et al. (2010), *Science* 327; NASA CNEOS (`https://cneos.jpl.nasa.gov/`) | 
| `chronoterra-event-decay-regrowth-model-v1` | Simplified Analytical Catastrophe Blast, Ash & Recovery Model | Catastrophe Model | `HYPOTHETICAL` | MIT (Internal Code) | Documented in `docs/simulation-models.md` | 
| `ipcc-ar6-cmip6-ssp-projections` | IPCC AR6 WGI Shared Socioeconomic Pathways (SSP1-2.6, SSP2-4.5, SSP5-8.5) | Climate Projection | `PROJECTED` | CC-BY-4.0 | IPCC (2021), *Climate Change 2021: The Physical Science Basis* (`Table SPM.1`, `Table 9.9`) | 
| `custom-hypothetical-future-sliders-v1` | User-Defined Hypothetical Future Warming & Sea-Level Sliders | Climate Sandbox | `HYPOTHETICAL` | MIT (Internal Code) | Interactive user sandbox (`src/simulation/climate/futureProjections.ts`) | 
| `procedural-fallback-v1` | Procedural Land/Ocean, Graticule & Planetary Canvas Fallback | Fallback | `HYPOTHETICAL` | MIT (Internal Code) | Generated at runtime in `src/utils/proceduralEarthTexture.ts` | 