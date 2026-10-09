import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  billingPlanSchema,
  toBillingPlanPayload
} from '@/features/billing-plans/schemas/billing-plan';
import {
  BillingPlanConflictError,
  deleteBillingPlan,
  updateBillingPlan
} from '@/features/billing-plans/server/billing-plans';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  const parsed = billingPlanSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const plan = await updateBillingPlan(supabase, id.data, toBillingPlanPayload(parsed.data));
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(plan);
  } catch (error) {
    const status = error instanceof BillingPlanConflictError ? 409 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const deleted = await deleteBillingPlan(supabase, id.data);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
