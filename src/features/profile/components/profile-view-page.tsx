import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserDisplay, UserAvatarProfile } from '@/components/user-avatar-profile';
import { getAdminSession } from '@/lib/auth-server';
import { format } from 'date-fns';

export default async function ProfileViewPage() {
  const { user, isAdmin } = await getAdminSession();
  if (!user) return null;

  const { fullName, email } = getUserDisplay(user);
  const provider = (user.app_metadata?.provider as string | undefined) ?? 'unknown';

  const rows: Array<[string, string]> = [
    ['Name', fullName || '—'],
    ['Email', email || '—'],
    ['Sign-in provider', provider],
    ['User ID', user.id],
    ['Member since', format(new Date(user.created_at), 'PPP')],
    ['Last sign-in', user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPP p') : '—']
  ];

  return (
    <div className='flex w-full flex-col p-4'>
      <Card className='max-w-2xl'>
        <CardHeader>
          <div className='flex items-center gap-4'>
            <UserAvatarProfile className='size-14' user={user} />
            <div className='flex flex-col gap-1'>
              <CardTitle className='flex items-center gap-2'>
                {fullName || email}
                {isAdmin && <Badge>Platform admin</Badge>}
              </CardTitle>
              <CardDescription>Your Dot Science account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className='grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm'>
            {rows.map(([label, value]) => (
              <div key={label} className='contents'>
                <dt className='text-muted-foreground'>{label}</dt>
                <dd className='font-medium break-all'>{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
