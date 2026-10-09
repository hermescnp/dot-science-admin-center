import { NextResponse } from 'next/server';
import {
  billingPlanSchema,
  toBillingPlanPayload
} from '@/features/billing-plans/schemas/billing-plan';
import {
  BillingPlanConflictError,
  createBillingPlan,
  listBillingPlans
} from '@/features/billing-plans/server/billing-plans';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const response = await listBillingPlans(supabase);
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = billingPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const plan = await createBillingPlan(supabase, toBillingPlanPayload(parsed.data));
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    const status = error instanceof BillingPlanConflictError ? 409 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
