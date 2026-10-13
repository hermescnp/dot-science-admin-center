import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF, useTexture, useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';
import { virtualOfficeAsset } from '../../lib/assets';
import { DotScienceScreen } from './dot-science-screen';
import { IframeScreenTracker } from './iframe-screen';
import { MetricsFrame } from './metrics-frame';
import { IFRAME_SCREENS } from './iframe-screens';

const SCREEN_TEXTURE_URLS = IFRAME_SCREENS.map((screen) => virtualOfficeAsset(screen.texturePath));

const VIDEO_TEXTURE_OPTIONS = {
  muted: true,
  loop: true,
  start: true,
  crossOrigin: 'anonymous'
};

// The visible panel behind the Prané logo is part of the baked `Object_246` wall mesh (with the
// logo's imprint baked into its texture); `Object_242001` is the backlight box right behind it,
// sharing the same y/z extent. The screen goes on the panel's front face.
const PRANE_PANEL_FRONT_X = 2.7286;
const SCREEN_BACKLIGHT_MESH_NAME = 'Object_242001';
const BRAND_CYAN = new THREE.Color('#68dbff');

const WALL_MESH_NAME = 'Object_251_1';
const WALL_TINT = new THREE.Color('#4f7fae');
// `Object_251_1` holds every wall in one mesh: the outer back walls are 0.2-thick slabs at
// x ∈ [2.8, 3] and z ∈ [-3, -2.8]; the interior partitions sit around x = 0 and z = 0.
const BACK_WALL_MIN_X = 2.75;
const BACK_WALL_MAX_Z = -2.75;

// Recolors the back walls' baked texture by its own luminance, so the baked shadows and ambient
// occlusion keep their contrast while the white base turns into the branding navy.
function tintBakedMaterial(material: THREE.Material, tint: THREE.Color) {
  if (material.userData.brandTint) return;
  material.userData.brandTint = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBrandTint = { value: tint };
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vBrandWorldPos;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vBrandWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        'uniform vec3 uBrandTint;\nvarying vec3 vBrandWorldPos;\nvoid main() {'
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (vBrandWorldPos.x > ${BACK_WALL_MIN_X.toFixed(2)} || vBrandWorldPos.z < ${BACK_WALL_MAX_Z.toFixed(2)}) {
          float bakedLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = uBrandTint * bakedLuminance;
        }`
      );
  };
  material.needsUpdate = true;
}

function configureVideoTexture(texture: THREE.VideoTexture) {
  texture.flipY = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
}

function configureScreenTexture(texture: THREE.Texture | THREE.Texture[]) {
  for (const item of Array.isArray(texture) ? texture : [texture]) {
    item.flipY = false;
    item.colorSpace = THREE.SRGBColorSpace;
  }
}

export default function SceneModel() {
  const { scene } = useGLTF(virtualOfficeAsset('/models/virtual-office-room.glb'));
  const alphaTexture = useTexture(virtualOfficeAsset('/textures/Follaje_Diffuse-Alpha.png'));
  const screenTextures = useTexture(SCREEN_TEXTURE_URLS, configureScreenTexture);
  const ledSignTexture = useVideoTexture(
    virtualOfficeAsset('/textures/LED-live-recording-sign.mp4'),
    VIDEO_TEXTURE_OPTIONS
  );

  useEffect(() => {
    configureVideoTexture(ledSignTexture);
  }, [ledSignTexture]);

  const { scene: threeScene } = useThree();

  const screenBox = useMemo(() => {
    const backlight = scene.getObjectByName(SCREEN_BACKLIGHT_MESH_NAME);
    if (!backlight) return null;
    const box = new THREE.Box3().setFromObject(backlight);
    box.min.x = PRANE_PANEL_FRONT_X;
    return box;
  }, [scene]);

  const iframeScreens = useMemo(
    () =>
      IFRAME_SCREENS.flatMap((screen) => {
        const mesh = scene.getObjectByName(screen.meshName);
        return mesh ? [{ screen, box: new THREE.Box3().setFromObject(mesh) }] : [];
      }),
    [scene]
  );

  useEffect(() => {
    const praneLogo = scene.getObjectByName('Logo_Prane');
    if (praneLogo) praneLogo.visible = false;

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (mesh.name === 'Object_17') {
        const material = new THREE.MeshPhongMaterial({ map: alphaTexture });
        material.transparent = true;
        material.alphaTest = 0.5;
        mesh.material = material;
      }

      if (mesh.name === WALL_MESH_NAME) {
        tintBakedMaterial(mesh.material as THREE.Material, WALL_TINT);
      }

      if (mesh.name === SCREEN_BACKLIGHT_MESH_NAME && !mesh.userData.brandGlow) {
        const material = (mesh.material as THREE.MeshStandardMaterial).clone();
        material.emissive.copy(BRAND_CYAN);
        mesh.material = material;
        mesh.userData.brandGlow = true;
      }

      const screenIndex = IFRAME_SCREENS.findIndex((screen) => screen.meshName === mesh.name);
      if (screenIndex !== -1) {
        mesh.material = new THREE.MeshBasicMaterial({
          map: screenTextures[screenIndex],
          toneMapped: false
        });
      }

      if (mesh.name === 'Object_28_2') {
        mesh.material = new THREE.MeshBasicMaterial({ map: ledSignTexture });
      }
    });

    threeScene.add(scene);
    return () => {
      threeScene.remove(scene);
    };
  }, [scene, alphaTexture, ledSignTexture, screenTextures, threeScene]);

  return (
    <>
      {screenBox ? <DotScienceScreen box={screenBox} /> : null}
      <MetricsFrame scene={scene} />
      {iframeScreens.map(({ screen, box }) => (
        <IframeScreenTracker key={screen.id} screen={screen} box={box} />
      ))}
    </>
  );
}
