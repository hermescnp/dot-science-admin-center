import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SignInViewPage from '@/features/auth/components/sign-in-view';
import { getAdminSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Authentication | Sign In',
  description: 'Sign in to the Dot Science Admin Center.'
};

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, isAdmin } = await getAdminSession();
  if (user) redirect(isAdmin ? '/dashboard/overview' : '/auth/forbidden');

  const { error } = await searchParams;
  return <SignInViewPage error={error} />;
}
