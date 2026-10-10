import { type Icon, Icons } from '@/components/icons';
import type { LeadEmailStatus, LeadSource, LeadStatus } from '../api/types';

export const leadStatusOptions: { value: LeadStatus; label: string; className: string }[] = [
  {
    value: 'new',
    label: 'New',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  {
    value: 'contacted',
    label: 'Contacted',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  {
    value: 'qualified',
    label: 'Qualified',
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400'
  },
  {
    value: 'converted',
    label: 'Converted',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  },
  { value: 'discarded', label: 'Discarded', className: 'text-muted-foreground' }
];

export const leadStatusesByValue = new Map(
  leadStatusOptions.map((option) => [option.value, option])
);

export const leadSourceOptions: { value: LeadSource; label: string }[] = [
  { value: 'iateneo_guest', label: 'Joined as guest' },
  { value: 'iateneo_invited', label: 'Invited by email' }
];

export const leadEmailStatusOptions: {
  value: LeadEmailStatus;
  label: string;
  description: string;
  icon: Icon;
  className: string;
}[] = [
  {
    value: 'verified',
    label: 'Verified',
    description: 'Opened the invitation link',
    icon: Icons.circleCheck,
    className: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    value: 'pending',
    label: 'Invitation sent',
    description: 'Invitation sent, not opened yet',
    icon: Icons.mail,
    className: 'text-amber-600 dark:text-amber-400'
  },
  {
    value: 'failed',
    label: 'Invitation failed',
    description: "The invitation email couldn't be delivered",
    icon: Icons.alertCircle,
    className: 'text-destructive'
  },
  {
    value: 'unverified',
    label: 'Unverified',
    description: 'Typed when joining as a guest, never confirmed',
    icon: Icons.help,
    className: 'text-muted-foreground'
  }
];

export const leadEmailStatusesByValue = new Map(
  leadEmailStatusOptions.map((option) => [option.value, option])
);

export const leadSourceLabels = new Map(
  leadSourceOptions.map((option) => [option.value, option.label])
);
