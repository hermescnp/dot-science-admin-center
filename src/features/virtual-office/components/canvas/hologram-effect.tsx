import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { virtualOfficeAsset } from '../../lib/assets';

export default function HologramEffect() {
  const { nodes, materials } = useGLTF(virtualOfficeAsset('/models/VR-Headset.glb'));
  const headsetRef = useRef<THREE.Group>(null);

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const horizGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      horizGradient.addColorStop(0, 'lightblue');
      horizGradient.addColorStop(0.33, '#68DBFF');
      horizGradient.addColorStop(0.66, 'rgba(200,200,255,0)');
      horizGradient.addColorStop(1, 'lightblue');
      ctx.fillStyle = horizGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mask the horizontal gradient with a vertical fade so the hologram dissolves upward.
      ctx.globalCompositeOperation = 'destination-in';
      const vertGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      vertGradient.addColorStop(0, 'rgba(255,255,255,1)');
      vertGradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = vertGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(8, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((state, delta) => {
    gradientTexture.offset.x += delta * 0.3;

    if (headsetRef.current) {
      headsetRef.current.rotation.y += delta * 0.3;
      const amplitude = 0.05;
      const frequency = 1;
      const baseY = 1.1;
      headsetRef.current.position.y =
        baseY + Math.sin(state.clock.elapsedTime * frequency) * amplitude;
    }
  });

  return (
    <group dispose={null}>
      <group ref={headsetRef} name='VR-Headset' position={[-1.89, 1.1, 1.22]}>
        <mesh
          geometry={(nodes['vr-head-display'] as THREE.Mesh).geometry}
          material={materials['Material']}
          position={[-0.15, 0, 0]}
        />
        <mesh
          geometry={(nodes['vr-head-strap'] as THREE.Mesh).geometry}
          material={materials['Material.040']}
          position={[0.05, 0, 0]}
        />
      </group>
      <mesh
        geometry={(nodes['Hologram_effect'] as THREE.Mesh).geometry}
        position={[-1.89, 0.71, 1.22]}
        scale={0.37}
      >
        <meshBasicMaterial
          side={THREE.DoubleSide}
          map={gradientTexture}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
