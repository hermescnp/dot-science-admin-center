import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead, LeadSession, LeadStatus } from '../api/types';
import { leadEmailStatusesByValue, leadStatusesByValue } from '../constants/options';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const option = leadStatusesByValue.get(status);
  return (
    <Badge variant='outline' className={cn('whitespace-nowrap', option?.className)}>
      {option?.label ?? status}
    </Badge>
  );
}

export function leadEmailStatusDescription(lead: Pick<Lead, 'emailStatus' | 'emailVerifiedAt'>) {
  const option = leadEmailStatusesByValue.get(lead.emailStatus);
  if (lead.emailStatus === 'verified' && lead.emailVerifiedAt) {
    return `Opened the invitation link on ${dateFormat.format(new Date(lead.emailVerifiedAt))}`;
  }
  return option?.description ?? lead.emailStatus;
}

export function LeadEmailStatusIcon({
  status,
  className
}: {
  status: Lead['emailStatus'];
  className?: string;
}) {
  const option = leadEmailStatusesByValue.get(status);
  if (!option) return null;
  const Icon = option.icon;
  return (
    <Icon
      aria-label={option.label}
      className={cn('h-4 w-4 shrink-0', option.className, className)}
    />
  );
}

export function LeadSessionList({ sessions }: { sessions: LeadSession[] }) {
  return (
    <ul className='flex flex-col gap-1'>
      {sessions.map((session) => (
        <li key={session.id} className='flex items-baseline justify-between gap-4'>
          <span>
            {session.name ?? session.code}
            <span className='opacity-70'>
              {' · '}
              {session.role === 'invited' ? 'Invited' : 'Guest'}
              {session.openedAt ? `, opened ${dateFormat.format(new Date(session.openedAt))}` : ''}
            </span>
          </span>
          <span className='tabular-nums opacity-70'>
            {dateFormat.format(new Date(session.date))}
          </span>
        </li>
      ))}
    </ul>
  );
}
