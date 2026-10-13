/** Excalidraw scene as stored in `design_boards.scene`; the whiteboard component owns its exact shape. */
export interface DesignBoardScene {
  elements: unknown[];
  files: Record<string, unknown>;
  appState: { viewBackgroundColor?: string };
}

export interface DesignBoard {
  id: string;
  name: string;
  scene: DesignBoardScene;
  updatedAt: string;
}

export const MAIN_BOARD_ID = 'main';

/** Kept under Vercel's 4.5 MB request body limit; images are embedded in the scene. */
export const MAX_SCENE_BYTES = 4 * 1024 * 1024;
