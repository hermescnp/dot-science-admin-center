import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@supabase/supabase-js';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: User | null;
}

export function getUserDisplay(user: User | null) {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? '';
  const avatarUrl =
    (metadata.avatar_url as string | undefined) ?? (metadata.picture as string | undefined) ?? '';
  return { fullName, avatarUrl, email: user?.email ?? '' };
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  const { fullName, avatarUrl, email } = getUserDisplay(user);
  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={avatarUrl} alt={fullName} />
        <AvatarFallback className='rounded-lg'>
          {(fullName || email).slice(0, 2).toUpperCase() || 'DS'}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{fullName}</span>
          <span className='truncate text-xs'>{email}</span>
        </div>
      )}
    </div>
  );
}
