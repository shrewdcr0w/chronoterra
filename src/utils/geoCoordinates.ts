import * as THREE from 'three';

/**
 * Converts geodetic [lat, lon] in degrees to Three.js Cartesian [x, y, z]
 * aligned with standard SphereGeometry equirectangular UV mapping.
 */
export function latLonToCartesian(
  latDeg: number,
  lonDeg: number,
  radius = 1.0
): [number, number, number] {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [Number(x.toFixed(5)), Number(y.toFixed(5)), Number(z.toFixed(5))];
}

/**
 * Converts Three.js Cartesian [x, y, z] (or THREE.Vector3) back to geodetic { lat, lon, distance }.
 */
export function cartesianToLatLon(
  position: [number, number, number] | THREE.Vector3
): { lat: number; lon: number; distance: number } {
  const [x, y, z] = Array.isArray(position)
    ? position
    : [position.x, position.y, position.z];

  const distance = Number((Math.hypot(x, y, z) || 1).toFixed(3));
  const lat = Number(
    (THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, y / distance)))) || 0).toFixed(2)
  );
  const lon = Number(
    (THREE.MathUtils.radToDeg(Math.atan2(x, z)) || 0).toFixed(2)
  );

  return { lat, lon, distance };
}