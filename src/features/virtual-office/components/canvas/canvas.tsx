'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, HueSaturation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useExperienceContext } from '../../context/experience-context';
import Camera from './camera';
import Scene from './scene';

const CAMERA_POSITION = new THREE.Vector3(-13.0, 7.0, 13.0);

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

interface VirtualOfficeCanvasProps {
  onReady: () => void;
}

export default function VirtualOfficeCanvas({ onReady }: VirtualOfficeCanvasProps) {
  const { spaceData, pushToHistory, getLastHistoryItem, setPlaceHover } = useExperienceContext();
  const currentInstance = getLastHistoryItem();

  const primaryData = spaceData[0];
  const generalTarget = useMemo(
    () =>
      new THREE.Vector3(
        primaryData?.positionX ?? 0,
        primaryData?.positionY ?? 0,
        primaryData?.positionZ ?? 0
      ),
    [primaryData]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      pushToHistory('main');
      setPlaceHover({ key: '', name: '' });
    },
    [pushToHistory, setPlaceHover]
  );

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      gl={{
        antialias: true,
        toneMapping: THREE.LinearToneMapping,
        toneMappingExposure: 1.2,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        logarithmicDepthBuffer: true
      }}
      onCreated={({ gl, scene }) => {
        gl.shadowMap.enabled = false;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        scene.fog = new THREE.Fog(new THREE.Color(0x0b1e33), 50, 70);
        scene.background = null;
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Camera position={CAMERA_POSITION} target={generalTarget} />
      <ambientLight color='#fff' intensity={0.2} />
      <Suspense fallback={null}>
        <Scene data={spaceData} currentInstance={currentInstance} />
        <SceneReady onReady={onReady} />
      </Suspense>
      <EffectComposer>
        <HueSaturation saturation={0.1} hue={-0.1} />
      </EffectComposer>
    </Canvas>
  );
}
