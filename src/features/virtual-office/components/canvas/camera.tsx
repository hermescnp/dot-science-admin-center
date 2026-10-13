import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraProps {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export default function Camera({ position, target }: CameraProps) {
  const { set, camera, size } = useThree();
  const aspect = size.width / size.height;

  useEffect(() => {
    const perspectiveCamera = new THREE.PerspectiveCamera(25, aspect, 0.01, 100);
    perspectiveCamera.position.copy(position);
    perspectiveCamera.lookAt(target);
    perspectiveCamera.updateProjectionMatrix();
    set({ camera: perspectiveCamera });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    camera.lookAt(target);
  }, [camera, target]);

  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, aspect]);

  return null;
}
