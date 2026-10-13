import 'server-only';

import type { Database, Json } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAIN_BOARD_ID, type DesignBoard, type DesignBoardScene } from '../api/types';

type Client = SupabaseClient<Database>;

const EMPTY_SCENE: DesignBoardScene = { elements: [], files: {}, appState: {} };

function toScene(value: Json): DesignBoardScene {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_SCENE;
  const scene = value as Partial<DesignBoardScene>;
  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    files: scene.files && typeof scene.files === 'object' ? scene.files : {},
    appState: scene.appState && typeof scene.appState === 'object' ? scene.appState : {}
  };
}

export async function getDesignBoard(supabase: Client): Promise<DesignBoard> {
  const { data, error } = await supabase
    .from('design_boards')
    .select('id, name, scene, updated_at')
    .eq('id', MAIN_BOARD_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { id: MAIN_BOARD_ID, name: 'Design board', scene: EMPTY_SCENE, updatedAt: '' };
  }
  return { id: data.id, name: data.name, scene: toScene(data.scene), updatedAt: data.updated_at };
}

export async function saveDesignBoard(
  supabase: Client,
  scene: DesignBoardScene
): Promise<{ updatedAt: string }> {
  const { data, error } = await supabase
    .from('design_boards')
    .upsert({ id: MAIN_BOARD_ID, name: 'Design board', scene: scene as unknown as Json })
    .select('updated_at')
    .single();
  if (error) throw new Error(error.message);
  return { updatedAt: data.updated_at };
}
