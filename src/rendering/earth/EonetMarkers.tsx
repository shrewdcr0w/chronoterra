import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { EonetEventMarker } from '../../data/loaders/eonetLoader';

interface EonetMarkersProps {
  events: EonetEventMarker[];
  onSelectEvent: (event: EonetEventMarker | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  wildfires: '#f97316',
  volcanoes: '#ec4899',
  severeStorms: '#38bdf8',
  seaLakeIce: '#a5f3fc',
  earthquakes: '#facc15',
  floods: '#60a5fa',
  default: '#ef4444',
};

export const EonetMarkers: React.FC<EonetMarkersProps> = ({ events, onSelectEvent }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    events.forEach((ev, idx) => {
      dummy.position.set(ev.position[0], ev.position[1], ev.position[2]);
      dummy.lookAt(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      const hex = CATEGORY_COLORS[ev.categoryId] ?? CATEGORY_COLORS.default;
      colorHelper.set(hex);
      mesh.setColorAt(idx, colorHelper);
    });

    mesh.count = events.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [events, dummy, colorHelper]);

  const handlePointerOrClick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && events[e.instanceId]) {
      onSelectEvent(events[e.instanceId]);
    }
  };

  if (events.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(1, events.length)]}
      onPointerOver={handlePointerOrClick}
      onPointerOut={() => onSelectEvent(null)}
      onClick={handlePointerOrClick}
    >
      <sphereGeometry args={[0.013, 10, 10]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};