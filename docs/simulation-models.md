# Chronoterra — Simplified Analytical Simulation Models

> **Epistemic Classification:** `HYPOTHETICAL` (`chronoterra-event-decay-regrowth-model-v1`).
> Every equation in this document is an analytical, closed-form parameterization designed for interactive browser visualization on integrated GPUs. None of these models solve hydrodynamic shock conservation laws, Navier-Stokes atmospheric transport, or coupled radiative-convective General Circulation Models (GCMs).

## 1. State Variables (`PlanetaryState.event`)
Every active event is controlled by two dimensionless scalar parameters stored in `PlanetaryState.event`:
- **`intensity`** ($I \in [1.0, 10.0]$): Logarithmic severity index. For volcanic eruptions, $I$ maps roughly to Volcanic Explosivity Index ($\text{VEI} \approx 0.7 \cdot I + 1$); for bolide impacts, $I$ scales from Chelyabinsk-class airbursts ($I \approx 2.8$) to Chicxulub-class mass extinction impactors ($I \approx 9.8$).
- **`progress`** ($p \in [0.0, 1.0]$): Normalized event-and-recovery timeline.
  - $p = 0.0$: Pre-event baseline.
  - $p \in (0.0, 0.20]$: Acute blast wave, ballistic ejecta plume, and rapid defoliation onset.
  - $p = 0.20$ ($p_{\text{peak}}$): Maximum ecological scarring and peak stratospheric aerosol loading.
  - $p \in (0.20, 1.0]$: Multi-year ecological succession (pioneer "fern spike" at $p \approx 0.55$) and exponential canopy recovery over the event's `recoveryHorizonYears`.

## 2. What `intensity` and `progress` Control Mathematically
1. **Shockwave Front Angular Radius** ($p \in (0, 0.25]$):
   $$\theta_{\text{shock}}(I, p) = \left(c_{\text{kind}} \cdot I + 3^\circ\right) \cdot \left(\frac{p}{0.25}\right)^{0.65}$$
   where $c_{\text{impact}} = 4.5^\circ$ and $c_{\text{volcano}} = 2.8^\circ$.
2. **Zonal Stratospheric Ash & Aerosol Cloud**:
   Latitudinal half-width $\Delta\phi(I, p) = (4.2^\circ \cdot I + 2^\circ) \cdot \min(1, (p/0.4)^{0.55})$, with a $1.65\times$ longitudinal stretch ($\Delta\lambda = 1.65 \cdot \Delta\phi$) to visually represent zonal stratospheric wind shear.
3. **Vegetation Damage & Ecological Recovery Curve**:
   At great-circle angular distance $\psi$ from the epicenter $(\phi_0, \lambda_0)$, spatial attenuation is quadratic inside $\psi_{\text{crit}}(I) = 3.8^\circ \cdot I + 2.5^\circ$:
   $$S(\psi, I) = \max\left(0, 1 - \left(\frac{\psi}{\psi_{\text{crit}}(I)}\right)^2\right)$$
   Temporal damage $T(p)$ rises linearly to $p_{\text{peak}} = 0.20$ and decays exponentially during ecological recovery:
   $$T(p) = \exp\left(-3.2 \cdot \frac{p - 0.20}{0.80}\right) \quad \text{for } p > 0.20$$

## 3. Physical Effects Explicitly Ignored
- **Topographic & Bathymetric Wave Refraction**: Shockwaves and ejecta curtains expand as idealized spherical caps without mountain shadowing or tsunami shelf shoaling.
- **3D Atmospheric Circulation & Coriolis Advection**: Ash plumes use an analytical $1.65:1$ zonal ellipse rather than integrating 3D wind vector fields.
- **Coupled Carbon-Silicate & Ocean Acidification Feedbacks**: The HUD temperature perturbation ($\Delta T_{\text{global}}$) is a single algebraic scaling law, not an energy-balance or ocean-atmosphere radiative transfer solver.