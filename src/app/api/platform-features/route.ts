import { NextResponse, type NextRequest } from 'next/server';
import {
  platformFeaturesPageSize,
  platformFeaturesPageSizeOptions
} from '@/features/platform-features/constants/pagination';
import { platformFeatureSchema } from '@/features/platform-features/schemas/platform-feature';
import {
  PlatformFeatureConflictError,
  createPlatformFeature,
  listFeaturesForPlatform,
  listPlatformFeatures
} from '@/features/platform-features/server/platform-features';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = Math.max(...platformFeaturesPageSizeOptions);

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function list(value: string | null) {
  return value ? value.split(',').filter(Boolean) : undefined;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const supabase = await getSupabaseServerClient();
  try {
    const platform = params.get('platform');
    if (platform) {
      const features = await listFeaturesForPlatform(supabase, platform);
      return NextResponse.json({ features }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const body = await listPlatformFeatures(supabase, {
      page: positiveInt(params.get('page'), 1),
      limit: Math.min(positiveInt(params.get('limit'), platformFeaturesPageSize), MAX_LIMIT),
      search: params.get('search') ?? undefined,
      platforms: list(params.get('platforms')),
      sections: list(params.get('sections')),
      statuses: list(params.get('statuses')),
      sort: params.get('sort') ?? undefined
    });
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = platformFeatureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const feature = await createPlatformFeature(supabase, parsed.data);
    return NextResponse.json(feature, { status: 201 });
  } catch (error) {
    const status = error instanceof PlatformFeatureConflictError ? 409 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
