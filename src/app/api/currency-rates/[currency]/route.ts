import { NextResponse } from 'next/server';
import {
  currency as currencySchema,
  currencyRatePayloadSchema
} from '@/features/external-services/schemas/external-service';
import { updateCurrencyRate } from '@/features/external-services/server/external-services';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ currency: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const currency = currencySchema.safeParse((await params).currency);
  if (!currency.success || currency.data === 'USD') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const parsed = currencyRatePayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rate' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const usdRate = await updateCurrencyRate(supabase, currency.data, parsed.data.usdRate);
    return NextResponse.json({ currency: currency.data, usdRate });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
