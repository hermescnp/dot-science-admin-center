import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { virtualOfficeAsset } from '../../lib/assets';

const LOGO_SRC = virtualOfficeAsset('/textures/dot-science-workspace-logo.svg');
const LOGO_ASPECT = 394 / 196;
const TEXTURE_HEIGHT = 1024;
const BACKGROUND = '#0B1E33';
const SPOTLIGHT_ALPHA = 0.38;
const LOGO_HEIGHT_RATIO = 0.9;
const SURFACE_OFFSET = 0.002;

function drawScreen(canvas: HTMLCanvasElement, logo: HTMLImageElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  const radiusX = width / 2;
  const radiusY = height / 2;
  ctx.save();
  ctx.globalAlpha = SPOTLIGHT_ALPHA;
  ctx.translate(width / 2, height * 0.48);
  ctx.scale(radiusX / radiusY, 1);
  const spotlight = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusY);
  spotlight.addColorStop(0, 'rgba(104, 219, 255, 0.9)');
  spotlight.addColorStop(0.28, 'rgba(104, 219, 255, 0.45)');
  spotlight.addColorStop(0.55, 'rgba(10, 94, 149, 0.22)');
  spotlight.addColorStop(1, 'rgba(10, 94, 149, 0)');
  ctx.fillStyle = spotlight;
  ctx.fillRect(-radiusY * 2, -radiusY, radiusY * 4, radiusY * 2);
  ctx.restore();

  const logoHeight = Math.min(height * LOGO_HEIGHT_RATIO, (width * 0.95) / LOGO_ASPECT);
  const logoWidth = logoHeight * LOGO_ASPECT;
  ctx.drawImage(logo, (width - logoWidth) / 2, (height - logoHeight) / 2, logoWidth, logoHeight);
}

interface DotScienceScreenProps {
  box: THREE.Box3;
}

export function DotScienceScreen({ box }: DotScienceScreenProps) {
  const gl = useThree((state) => state.gl);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  useEffect(() => {
    let cancelled = false;
    let created: THREE.CanvasTexture | null = null;
    const canvas = document.createElement('canvas');
    canvas.height = TEXTURE_HEIGHT;
    canvas.width = Math.round((TEXTURE_HEIGHT * size.z) / size.y);

    const logo = new Image();
    logo.addEventListener(
      'load',
      () => {
        if (cancelled) return;
        drawScreen(canvas, logo);
        created = new THREE.CanvasTexture(canvas);
        created.colorSpace = THREE.SRGBColorSpace;
        created.anisotropy = gl.capabilities.getMaxAnisotropy();
        created.needsUpdate = true;
        setTexture(created);
      },
      { once: true }
    );
    logo.src = LOGO_SRC;

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [gl, size.y, size.z]);

  if (!texture) return null;

  return (
    <mesh
      position={[box.min.x - SURFACE_OFFSET, center.y, center.z]}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <planeGeometry args={[size.z, size.y]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
