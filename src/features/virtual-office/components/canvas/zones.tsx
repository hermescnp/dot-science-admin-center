'use client';

import type { ThreeEvent } from '@react-three/fiber';
import type { SpaceZone } from '../../api/types';

type ZonePointerHandler = (zone: SpaceZone, event: ThreeEvent<PointerEvent>) => void;
type ZoneMouseHandler = (zone: SpaceZone, event: ThreeEvent<MouseEvent>) => void;

interface ZonesProps {
  data: SpaceZone[];
  currentInstance: string;
  onZonePointerDown?: ZonePointerHandler;
  onZonePointerUp?: ZonePointerHandler;
  onZoneClick?: ZoneMouseHandler;
  onZoneHover?: ZonePointerHandler;
  onZonePointerLeave?: ZonePointerHandler;
}

export function Zones({
  data,
  currentInstance,
  onZonePointerDown,
  onZonePointerUp,
  onZoneClick,
  onZoneHover,
  onZonePointerLeave
}: ZonesProps) {
  const currentZone = data.find((z) => z.key === currentInstance);
  const siblingKeys = currentZone
    ? [
        currentZone.nearestTopSibling,
        currentZone.nearestRightSibling,
        currentZone.nearestForwardSibling,
        currentZone.nearestBottomSibling,
        currentZone.nearestLeftSibling,
        currentZone.nearestBackwardSibling
      ].filter((key): key is string => key !== null && key !== undefined)
    : [];

  return (
    <>
      {data.map((zone) => {
        const isInteractive = zone.parentKey === currentInstance || siblingKeys.includes(zone.key);
        return (
          <mesh
            key={zone.key}
            position={[zone.positionX, zone.positionY, zone.positionZ]}
            userData={{ key: zone.key, name: zone.name }}
            onPointerDown={
              isInteractive
                ? (e) => {
                    e.stopPropagation();
                    onZonePointerDown?.(zone, e);
                  }
                : undefined
            }
            onPointerUp={
              isInteractive
                ? (e) => {
                    e.stopPropagation();
                    onZonePointerUp?.(zone, e);
                  }
                : undefined
            }
            onClick={
              isInteractive
                ? (e) => {
                    e.stopPropagation();
                    onZoneClick?.(zone, e);
                  }
                : undefined
            }
            onPointerEnter={
              isInteractive
                ? (e) => {
                    e.stopPropagation();
                    onZoneHover?.(zone, e);
                  }
                : undefined
            }
            onPointerLeave={
              isInteractive
                ? (e) => {
                    e.stopPropagation();
                    onZonePointerLeave?.(zone, e);
                  }
                : undefined
            }
          >
            <boxGeometry args={[zone.width, zone.height, zone.depth]} />
            <meshBasicMaterial color={0x00aaff} transparent opacity={0.5} visible={false} />
          </mesh>
        );
      })}
    </>
  );
}
