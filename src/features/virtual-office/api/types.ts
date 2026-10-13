export interface SpaceZone {
  key: string;
  isSubSpace: boolean;
  name: string;
  description: string;
  parentKey: string;
  nearestTopSibling: string | null;
  nearestRightSibling: string | null;
  nearestForwardSibling: string | null;
  nearestBottomSibling: string | null;
  nearestLeftSibling: string | null;
  nearestBackwardSibling: string | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  maxDistance: number;
  minDistance: number;
  maxAzimuthAngle: number;
  minAzimuthAngle: number;
  maxPolarAngle: number;
  minPolarAngle: number;
  isLocked: boolean;
  documentation: string | null;
}

/** Database content (a department or the organization) that replaces a zone's documentation. */
export interface ZoneContent {
  zoneKey: string;
  /** Replaces the zone name; null keeps the name from space-map.json. */
  name: string | null;
  imageUrl: string | null;
  longDescription: string;
}
