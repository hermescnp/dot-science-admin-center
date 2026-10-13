import { NextResponse } from 'next/server';
import {
  KNOWLEDGE_IMAGE_MAX_BYTES,
  KNOWLEDGE_IMAGE_TYPES
} from '@/features/knowledge-base/api/types';
import { listKnowledgeImages, uploadKnowledgeImage } from '@/features/knowledge-base/server/images';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const images = await listKnowledgeImages(await getSupabaseServerClient());
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 });
  }
  if (!Object.hasOwn(KNOWLEDGE_IMAGE_TYPES, file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }
  if (file.size > KNOWLEDGE_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 5 MB' }, { status: 400 });
  }

  try {
    const image = await uploadKnowledgeImage(await getSupabaseServerClient(), file);
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
