'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { SpaceZone } from '../../api/types';
import { useExperienceContext } from '../../context/experience-context';
import { virtualOfficeAsset } from '../../lib/assets';
import Background from './background';
import HologramEffect from './hologram-effect';
import SceneModel from './scene-model';
import useSceneHandlers from './use-scene-handlers';
import { Zones } from './zones';

const BLOOM_EFFECT_SRC = virtualOfficeAsset('/assets/PNG/bloom-effect.png');
const BLOOM_POSITIONS: [number, number, number][] = [
  [1.63, 4.55, -0.59],
  [0.67, 3.91, -2.62],
  [0.51, 4.18, -1.29]
];

interface SceneProps {
  data: SpaceZone[];
  currentInstance: string;
}

export default function Scene({ data, currentInstance }: SceneProps) {
  if (data.length === 0) return null;
  return <SceneContent data={data} currentInstance={currentInstance} />;
}

function SceneContent({ data, currentInstance }: SceneProps) {
  const { onZonePointerDown, onZonePointerUp, onZoneClick, onZoneHover, onZonePointerOut } =
    useSceneHandlers();
  const { isPortraitMode } = useExperienceContext();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const desiredInstance = useRef({
    target: new THREE.Vector3(data[0].positionX, data[0].positionY, data[0].positionZ),
    minDistance: data[0].minDistance,
    maxDistance: data[0].maxDistance,
    minAzimuthAngle: data[0].minAzimuthAngle,
    maxAzimuthAngle: data[0].maxAzimuthAngle,
    minPolarAngle: data[0].minPolarAngle,
    maxPolarAngle: data[0].maxPolarAngle
  });

  useEffect(() => {
    const found = data.find((item) => item.key === currentInstance);
    if (!found) return;

    const desired = desiredInstance.current;
    desired.target.set(found.positionX, found.positionY, found.positionZ);
    desired.minDistance = found.minDistance;
    desired.maxDistance = found.maxDistance;
    desired.minAzimuthAngle = found.minAzimuthAngle;
    desired.maxAzimuthAngle = found.maxAzimuthAngle;
    desired.minPolarAngle = found.minPolarAngle;
    desired.maxPolarAngle = found.maxPolarAngle;
  }, [currentInstance, data]);

  useFrame(() => {
    const controls = orbitRef.current;
    if (!controls) return;
    const desired = desiredInstance.current;
    const lerpFactor = 0.05;
    const distanceFactor = isPortraitMode ? 1.5 : 1;

    controls.target.lerp(desired.target, lerpFactor);
    controls.minDistance = THREE.MathUtils.lerp(
      controls.minDistance,
      desired.minDistance * distanceFactor,
      lerpFactor
    );
    controls.maxDistance = THREE.MathUtils.lerp(
      controls.maxDistance,
      desired.maxDistance * distanceFactor,
      lerpFactor
    );
    controls.minAzimuthAngle = THREE.MathUtils.lerp(
      controls.minAzimuthAngle,
      desired.minAzimuthAngle,
      lerpFactor
    );
    controls.maxAzimuthAngle = THREE.MathUtils.lerp(
      controls.maxAzimuthAngle,
      desired.maxAzimuthAngle,
      lerpFactor
    );
    controls.minPolarAngle = THREE.MathUtils.lerp(
      controls.minPolarAngle,
      Math.PI / desired.minPolarAngle,
      lerpFactor
    );
    controls.maxPolarAngle = THREE.MathUtils.lerp(
      controls.maxPolarAngle,
      Math.PI / desired.maxPolarAngle,
      lerpFactor
    );
    controls.update();
  });

  return (
    <group>
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.08}
        enableZoom
        zoomSpeed={0.5}
        enableRotate
        rotateSpeed={0.4}
        enablePan={false}
        maxDistance={28}
        minDistance={18}
        maxAzimuthAngle={0}
        minAzimuthAngle={-1.6}
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={Math.PI / 3.1}
      />
      <Background />
      <SceneModel />
      <HologramEffect />

      {BLOOM_POSITIONS.map((position) => (
        <Html
          key={position.join(',')}
          center
          position={position}
          zIndexRange={[0, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <Image
            src={BLOOM_EFFECT_SRC}
            alt=''
            width={150}
            height={150}
            unoptimized
            style={{ width: '150px', height: 'auto', opacity: 0.7 }}
          />
        </Html>
      ))}

      <Zones
        data={data}
        currentInstance={currentInstance}
        onZonePointerDown={onZonePointerDown}
        onZonePointerUp={onZonePointerUp}
        onZoneClick={onZoneClick}
        onZoneHover={onZoneHover}
        onZonePointerLeave={onZonePointerOut}
      />
    </group>
  );
}
