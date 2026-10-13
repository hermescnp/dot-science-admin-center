import { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperienceContext } from '../../context/experience-context';
import { IFRAME_SCREENS, type IframeScreenConfig } from './iframe-screens';

type Matrix3 = [number, number, number, number, number, number, number, number, number];

function adjugate(m: Matrix3): Matrix3 {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3]
  ];
}

function multiply(a: Matrix3, b: Matrix3): Matrix3 {
  const c: Matrix3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j];
    }
  }
  return c;
}

function basisToPoints(points: [number, number][]): Matrix3 {
  const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = points;
  const m: Matrix3 = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const adj = adjugate(m);
  const v = [
    adj[0] * x4 + adj[1] * y4 + adj[2],
    adj[3] * x4 + adj[4] * y4 + adj[5],
    adj[6] * x4 + adj[7] * y4 + adj[8]
  ];
  return multiply(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

// Projective transform mapping the frame's rectangle onto the projected screen quad, as a CSS
// `matrix3d` (corners ordered top-left, top-right, bottom-left, bottom-right).
function quadToMatrix3d(width: number, height: number, quad: [number, number][]): string {
  const source = basisToPoints([
    [0, 0],
    [width, 0],
    [0, height],
    [width, height]
  ]);
  const t = multiply(basisToPoints(quad), adjugate(source));
  const n = t.map((value) => value / t[8]);
  return `matrix3d(${n[0]},${n[3]},0,${n[6]},${n[1]},${n[4]},0,${n[7]},0,0,1,0,${n[2]},${n[5]},0,${n[8]})`;
}

// Screens are flat axis-aligned quads: a thin-in-x box faces -x (studio wall), otherwise the
// quad faces +z (back wall).
function getScreenCorners(box: THREE.Box3): THREE.Vector3[] {
  const { min, max } = box;
  const size = box.getSize(new THREE.Vector3());
  if (size.x < size.z) {
    return [
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z)
    ];
  }
  return [
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, max.y, max.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(max.x, min.y, max.z)
  ];
}

// Outside its zone each screen shows a static screenshot texture; the live iframe is only mounted
// once the zone is first visited and is display:none whenever the user is elsewhere, so it costs
// nothing while the camera orbits.
function IframeScreenFrame({ screen }: { screen: IframeScreenConfig }) {
  const { screenFramesRef, getLastHistoryItem } = useExperienceContext();
  const isInZone = getLastHistoryItem() === screen.zoneKey;
  const [hasVisitedZone, setHasVisitedZone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (isInZone && !hasVisitedZone) setHasVisitedZone(true);

  if (!hasVisitedZone) return null;

  return (
    <div
      ref={(node) => {
        if (!node) return;
        screenFramesRef.current.set(screen.id, node);
        return () => {
          screenFramesRef.current.delete(screen.id);
        };
      }}
      hidden={!isInZone || !isLoaded}
      className='pointer-events-none invisible absolute top-0 left-0 origin-top-left'
      style={{ width: screen.frameWidth }}
    >
      <iframe
        src={screen.url}
        title={screen.title}
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
        className='pointer-events-auto block h-full w-full border-0 bg-black'
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}

export function IframeScreenFrames() {
  return IFRAME_SCREENS.map((screen) => <IframeScreenFrame key={screen.id} screen={screen} />);
}

interface IframeScreenTrackerProps {
  screen: IframeScreenConfig;
  box: THREE.Box3;
}

export function IframeScreenTracker({ screen, box }: IframeScreenTrackerProps) {
  const { screenFramesRef } = useExperienceContext();
  const corners = useMemo(() => getScreenCorners(box), [box]);
  const projected = useMemo(() => corners.map(() => new THREE.Vector3()), [corners]);
  const frameHeight = Math.round(
    (screen.frameWidth * corners[0].distanceTo(corners[2])) / corners[0].distanceTo(corners[1])
  );

  useFrame(({ camera, size }) => {
    const frame = screenFramesRef.current.get(screen.id);
    if (!frame) return;
    if (frame.hidden) {
      frame.style.visibility = 'hidden';
      return;
    }
    const height = `${frameHeight}px`;
    if (frame.style.height !== height) frame.style.height = height;

    let isInView = true;
    const quad = corners.map((corner, index): [number, number] => {
      const point = projected[index].copy(corner).project(camera);
      if (point.z > 1) isInView = false;
      return [((point.x + 1) / 2) * size.width, ((1 - point.y) / 2) * size.height];
    });

    frame.style.visibility = isInView ? 'visible' : 'hidden';
    if (isInView) frame.style.transform = quadToMatrix3d(screen.frameWidth, frameHeight, quad);
  });

  return null;
}
