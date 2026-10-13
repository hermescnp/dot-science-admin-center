import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { virtualOfficeAsset } from '../../lib/assets';

export default function Background() {
  const { scene } = useThree();

  useEffect(() => {
    const color = new THREE.Color(0x1e2332);
    scene.fog = new THREE.Fog(color, 50, 70);

    new RGBELoader().load(virtualOfficeAsset('/textures/night-environment.hdr'), (hdri) => {
      hdri.mapping = THREE.EquirectangularReflectionMapping;
      scene.backgroundBlurriness = 0.3;
      scene.environment = hdri;
      scene.background = color;
    });
  }, [scene]);

  return null;
}
