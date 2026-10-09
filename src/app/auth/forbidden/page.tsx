import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getAdminSession } from '@/lib/auth-server';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Authentication | Access denied'
};

export default async function ForbiddenPage() {
  const { user, isAdmin } = await getAdminSession();
  if (!user) redirect('/auth/sign-in');
  if (isAdmin) redirect('/dashboard/overview');

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='flex w-full max-w-md flex-col items-center space-y-4 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight'>Not a platform admin</h1>
        <p className='text-muted-foreground text-sm'>
          You are signed in as <span className='text-foreground font-medium'>{user.email}</span>,
          but this account does not have platform admin access to the Dot Science Admin Center.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
