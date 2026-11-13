# Chronoterra — Dataset Registry

Every dataset loaded by Chronoterra is registered in `src/data/metadata/datasetRegistry.ts` and surfaces its epistemic classification, provider, and license in the UI Info Panel.

| Source ID | Title | Epistemic Class | Temporal Coverage | Resolution | License | 
| :--- | :--- | :--- | :--- | :--- | :--- | 
| `gibs-modis-terra-truecolor` | NASA GIBS MODIS Terra Corrected Reflectance (True Color) | `OBSERVED` | `2000-03-01` to Present (Daily) | 250m native (WMS EPSG:4326) | Public Domain (17 U.S.C. § 105) | 
| `gibs-modis-terra-lst-day` | NASA GIBS MODIS Terra Land Surface Temperature (Day, MOD11C1) | `OBSERVED` | `2000-03-05` to Present (Daily) | 1km native (WMS EPSG:4326) | Public Domain (17 U.S.C. § 105) | 
| `nasa-eonet-v3-events` | NASA Earth Observatory Natural Event Tracker (EONET v3) | `OBSERVED` | `2000-03-01` to Present | Point/Polygon Event Telemetry | Public Domain (17 U.S.C. § 105) | 
| `procedural-zonal-climate-placeholder-v1` | Procedural Zonal & Seasonal Thermal Anomaly Placeholder | `HYPOTHETICAL` | `2000-03-01` to Present | 512x256 Canvas | MIT (Internal) | 
| `procedural-fallback-v1` | Procedural Land/Ocean & Graticule Canvas | `HYPOTHETICAL` | Static | 1024x512 Canvas | MIT (Internal) | 