import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CratonPolygon } from '../../simulation/time/deepTimeSlices';
import { latLonToCartesian } from '../../data/loaders/eonetLoader';

interface PaleoCoastlineLinesProps {
  polygons: CratonPolygon[];
}

export const PaleoCoastlineLines: React.FC<PaleoCoastlineLinesProps> = ({ polygons }) => {
  const geometry = useMemo(() => {
    const positions: number[] = [];

    for (const craton of polygons) {
      const coords = craton.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        const [lonA, latA] = coords[i];
        const [lonB, latB] = coords[i + 1];

        // Subdivide long segments so coastline vectors hug the curved sphere without cutting through it
        const steps = Math.max(
          1,
          Math.ceil(Math.hypot(lonB - lonA, latB - latA) / 4)
        );

        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;

          const p0 = latLonToCartesian(
            latA + (latB - latA) * t0,
            lonA + (lonB - lonA) * t0,
            1.0045
          );
          const p1 = latLonToCartesian(
            latA + (latB - latA) * t1,
            lonA + (lonB - lonA) * t1,
            1.0045
          );

          positions.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]);
        }
      }
    }

    const buf = new THREE.BufferGeometry();
    buf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return buf;
  }, [polygons]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#e9d5ff" linewidth={1.5} transparent opacity={0.92} />
    </lineSegments>
  );
};