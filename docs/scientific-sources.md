# Chronoterra — Scientific Sources & Paleogeographic Reconstructions 

Every reconstruction and scientific model integrated into Chronoterra is cataloged below using the Dataset Registry Template.

## Paleogeographic & Paleoclimate Sources

| Source ID | Title / Dataset | Category | Epistemic Class | Temporal Coverage | Spatial Resolution | Upstream License | Citation / URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | 
| `scotese-gplates-paleomap-v3` | Scotese PALEOMAP Project & EarthByte GPlates Coastline/Craton Reconstructions | Paleogeography | `RECONSTRUCTED` | Discrete Slices: `14 Ma`, `66 Ma`, `150 Ma`, `250 Ma`, `400 Ma` | 1°x1° Craton Polygons & 3D Vector Coastlines | CC-BY-4.0 | Scotese, C.R. & Wright, N. (2018), *PALEOMAP Paleodigital Elevation Models (PaleoDEMs) for the Phanerozoic*, EarthByte / GPlates (`https://www.earthbyte.org/`) |  |
| `paleobiome-climate-belt-procedural-v1` | Parameterized Phanerozoic Paleoclimate & Biome Belt Generator | Paleobiome | `HYPOTHETICAL` | Discrete Slices: `14 Ma`, `66 Ma`, `150 Ma`, `250 Ma`, `400 Ma` | 1024x512 Equirectangular Land-Masked Canvas | MIT (Internal Code derived from published literature) | Parameterized from Scotese, C.R. et al. (2021), *Phanerozoic Paleotemperatures: The Earth's Changing Climate during the Last 540 Million Years*, Earth-Science Reviews, 215, 103503. |  

## Methodological & Uncertainty Notes
1. **Post-Triassic (<170 Ma) Reconstructions (`14 Ma`, `66 Ma`, `150 Ma`)**: Constrained by preserved oceanic lithosphere magnetic anomalies, fracture zones, and mantle hotspot reference frames. Positional uncertainty is typically ±1° to ±6°.
2. **Pre-Jurassic (>170 Ma) Reconstructions (`250 Ma`, `400 Ma`)**: Because almost all pre-Jurassic oceanic crust has been subducted, paleolatitudes and continental orientations are derived from paleomagnetic apparent polar wander (APW) paths, orogenic sutures, and paleobiogeographic provinces, leaving ±8° to ±15° of absolute paleolongitudinal uncertainty.for 

## Orbital Observatory & CelesTrak OMM-JSON Format Decision

| Source ID | Title / Dataset | Category | Epistemic Class | Temporal Coverage | Spatial Resolution | Upstream License | Citation / URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | 
| `celestrak-gp-omm-json` | CelesTrak General Perturbations (GP) Orbit Mean-Elements Message (OMM JSON) | Orbital | `OBSERVED` | Historical Satellite Era (Hourly GP Epoch Updates) | SGP4/SDP4 Analytical State Vectors | Public Domain / CelesTrak Open Data Policy | Kelso, T.S. (2026), *A New Way to Obtain GP Data (aka TLEs)*, CelesTrak (`https://celestrak.org/NORAD/documentation/gp-data-formats.php`) | 

### Why Chronoterra Uses OMM-JSON (`FORMAT=json`) Instead of Legacy 2-Line TLEs
1. **Six-Digit NORAD Catalog Exhaustion (Mid-2026)**: The legacy USSTRATCOM/18 SDS Two-Line Element (TLE) fixed-column ASCII format allocates only 5 characters (columns 3–7) for the NORAD Catalog Number (`00001` to `99999`). In mid-2026, active and tracked orbital objects exhausted the 5-digit catalog space, and newly cataloged objects carry 6-digit (`100000+`, up to 9-digit) NORAD IDs that bare TLE text cannot represent without non-standard Alpha-5 encoding hacks.
2. **CelesTrak `gp.php` Default Format Change (May 9, 2026)**: CelesTrak updated `https://celestrak.org/NORAD/elements/gp.php` so that omitting `FORMAT` defaults to `CSV` rather than `TLE`. Chronoterra therefore always sets `FORMAT=json` explicitly on every CelesTrak query and parses CCSDS **Orbit Mean-Elements Message (OMM)** JSON objects directly via `satellite.json2satrec(omm)`.

## Solar System & Lunar Ephemeris (`astronomy-engine`)

| Source ID | Title / Dataset | Category | Epistemic Class | Temporal Coverage | Spatial Resolution | Upstream License | Citation / URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | 
| `astronomy-engine-ephemeris` | VSOP87 / ELP2000 Heliocentric & Geocentric Ephemerides + IAU WGCCRE Rotational Elements | Ephemeris | `OBSERVED` | Historical & Near-Future Epochs | Sub-arcsecond J2000 state vectors | MIT | Cross, D. (`astronomy-engine` v2.1.19, derived from Bretagnon & Francou 1988 VSOP87 and IAU Working Group on Cartographic Coordinates and Rotational Elements) | 
| `sss-solar-system-textures-2k` | Solar System Scope Planetary & Lunar Surface Maps (with Procedural Canvas Fallback) | Texture | `OBSERVED` / `HYPOTHETICAL` (Fallback) | Static | 2048x1024 / 512x256 Equirectangular | CC-BY-4.0 | Solar System Scope (`https://www.solarsystemscope.com/textures/`) | 

## Curated Historical & Geological Catastrophe Sources

| Source ID | Title / Dataset | Category | Epistemic Class | Temporal Coverage | Spatial Resolution | Upstream License | Citation / URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | 
| `smithsonian-gvp-historical-volcanoes` | Smithsonian Global Volcanism Program (Hunga Tonga 2022, Pinatubo 1991, Tambora 1815, Siberian Traps 250 Ma) | Events | `OBSERVED` / `RECONSTRUCTED` | `250 Ma` to Present | Vent coordinates & VEI magnitudes | CC-BY-4.0 | Global Volcanism Program (2024), *Volcanoes of the World (v. 5.2)*, Smithsonian Institution (`https://volcano.si.edu/`); Proud et al. (2022), *Science* 378; Stothers (1984), *Science* 224; Burgess et al. (2014), *PNAS* 111. | 
| `earth-impact-database-passc` | Earth Impact Database (Chicxulub 66 Ma) & NASA CNEOS Superbolide Catalog (Chelyabinsk 2013) | Events | `OBSERVED` / `RECONSTRUCTED` | `66 Ma` to Present | Crater / airburst coordinates & energy | Academic Open Access / Public Domain | Schulte et al. (2010), *The Chicxulub Asteroid Impact and Mass Extinction at the Cretaceous-Paleogene Boundary*, *Science* 327; Brown et al. (2013), *Nature* 503 (`https://cneos.jpl.nasa.gov/`). | 

## Published Future Climate Projections (IPCC AR6 WGI / CMIP6)

| Source ID | Title / Dataset | Category | Epistemic Class | Temporal Coverage | Spatial Resolution | Upstream License | Citation / URL | 
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | 
| `ipcc-ar6-cmip6-ssp-projections` | IPCC AR6 WGI Shared Socioeconomic Pathway Projections (`SSP1-2.6`, `SSP2-4.5`, `SSP5-8.5`) | Climate Projection | `PROJECTED` | Discrete Horizons: `2050 CE`, `2100 CE`, `2200 CE` | Global Mean Surface Temperature (`Table SPM.1`) & Global Mean Sea Level (`Ch. 9 Table 9.9`) | CC-BY-4.0 | IPCC (2021), *Climate Change 2021: The Physical Science Basis. Contribution of Working Group I to the Sixth Assessment Report of the Intergovernmental Panel on Climate Change* (Masson-Delmotte, V. et al., eds.), Cambridge University Press (`https://www.ipcc.ch/report/ar6/wg1/`). | 
| `custom-hypothetical-future-sliders-v1` | User-Defined Hypothetical Future Warming & Sea-Level Sandbox | Climate Sandbox | `HYPOTHETICAL` | `2050 CE`, `2100 CE`, `2200 CE` | Equirectangular 1024x512 Canvas | MIT (Internal) | Documented in `docs/simulation-models.md`. Explicitly segregated from published IPCC projections. | 