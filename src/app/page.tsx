import { getAdminSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, isAdmin } = await getAdminSession();

  if (!user) {
    // The shared auth callback reports failures as `/?error=...`.
    const { error } = await searchParams;
    redirect(error ? `/auth/sign-in?error=${encodeURIComponent(error)}` : '/auth/sign-in');
  }
  if (!isAdmin) redirect('/auth/forbidden');
  redirect('/dashboard/overview');
}
