import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DepartmentMember } from '../api/types';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface MemberAvatarProps {
  member: Pick<DepartmentMember, 'kind' | 'name' | 'avatarUrl'>;
  size?: 'sm' | 'default';
}

export function MemberAvatar({ member, size = 'sm' }: MemberAvatarProps) {
  return (
    <Avatar size={size} title={member.name}>
      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name} /> : null}
      <AvatarFallback
        className={
          member.kind === 'agent' ? 'bg-primary/15 text-primary' : 'text-[10px] font-medium'
        }
      >
        {member.kind === 'agent' ? (
          <Icons.robot className='size-3.5' stroke={1.75} />
        ) : (
          initials(member.name)
        )}
      </AvatarFallback>
    </Avatar>
  );
}
