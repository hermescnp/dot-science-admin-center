'use client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <Button
      variant='outline'
      onClick={async () => {
        await signOut();
        router.replace('/auth/sign-in');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
