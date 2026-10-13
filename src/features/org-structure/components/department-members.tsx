'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { platformAgentsQueryOptions } from '@/features/platform-agents/api/queries';
import { usersQueryOptions } from '@/features/users/api/queries';
import { useAppForm } from '@/lib/form';
import { addDepartmentMemberMutation, removeDepartmentMemberMutation } from '../api/mutations';
import type { Department, DepartmentMemberKind } from '../api/types';
import { departmentMemberSchema } from '../schemas/department';
import { MemberAvatar } from './member-avatar';

const USER_FILTERS = { page: 1, limit: 100, sort: 'name.asc' } as const;

const kindOptions = [
  { value: 'user', label: 'Person' },
  { value: 'agent', label: 'Agent' }
];

export function DepartmentMembers({ department }: { department: Department }) {
  const { data: usersData } = useQuery(usersQueryOptions(USER_FILTERS));
  const { data: agents } = useQuery(platformAgentsQueryOptions());

  const memberIds = new Set(department.members.map((member) => `${member.kind}:${member.refId}`));
  const candidates: Record<DepartmentMemberKind, { value: string; label: string }[]> = {
    user: (usersData?.users ?? [])
      .filter((user) => !memberIds.has(`user:${user.id}`))
      .map((user) => ({
        value: user.id,
        label: user.displayName || user.email || 'Unnamed user'
      })),
    agent: (agents ?? [])
      .filter((agent) => !memberIds.has(`agent:${agent.id}`))
      .map((agent) => ({ value: agent.id, label: agent.name }))
  };

  const addMutation = useMutation({
    ...addDepartmentMemberMutation,
    onSuccess: (...args) => {
      addDepartmentMemberMutation.onSuccess?.(...args);
      toast.success('Member added');
      form.reset();
    },
    onError: (error) =>
      toast.error(
        error.message.includes('409')
          ? 'Already a member of this department.'
          : "Couldn't add the member. Try again."
      )
  });

  const removeMutation = useMutation({
    ...removeDepartmentMemberMutation,
    onSuccess: (...args) => {
      removeDepartmentMemberMutation.onSuccess?.(...args);
      toast.success('Member removed');
    },
    onError: () => toast.error("Couldn't remove the member")
  });

  const form = useAppForm({
    defaultValues: {
      kind: 'user' as DepartmentMemberKind,
      refId: '',
      role: ''
    },
    validators: {
      onSubmit: departmentMemberSchema
    },
    onSubmit: async ({ value }) => {
      await addMutation.mutateAsync({
        departmentId: department.id,
        values: value
      });
    }
  });

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <FieldLabel>People and agents</FieldLabel>
        <span className='text-muted-foreground text-xs'>{department.members.length}</span>
      </div>

      {department.members.length ? (
        <ul className='divide-y rounded-lg border'>
          {department.members.map((member) => (
            <li key={member.id} className='flex items-center gap-3 px-3 py-2'>
              <MemberAvatar member={member} size='default' />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{member.name}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {member.kind === 'agent' ? 'Agent' : 'Person'}
                  {member.role ? ` · ${member.role}` : ''}
                </p>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={`Remove ${member.name}`}
                disabled={removeMutation.isPending}
                onClick={() =>
                  removeMutation.mutate({
                    departmentId: department.id,
                    memberId: member.id
                  })
                }
              >
                <Icons.trash className='h-4 w-4' />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-muted-foreground text-xs'>No people or agents in this department yet.</p>
      )}

      <form
        className='space-y-3 rounded-lg border p-3'
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className='grid grid-cols-[8rem_1fr] gap-3'>
          <form.AppField
            name='kind'
            listeners={{ onChange: () => form.setFieldValue('refId', '') }}
            children={(field) => <field.SelectField label='Type' options={kindOptions} />}
          />
          <form.Subscribe
            selector={(state) => state.values.kind}
            children={(kind) => (
              <form.AppField
                name='refId'
                children={(field) => (
                  <field.ComboboxField
                    label={kind === 'agent' ? 'Agent' : 'Person'}
                    options={candidates[kind]}
                    placeholder={kind === 'agent' ? 'Select agent' : 'Select person'}
                    searchPlaceholder='Search...'
                  />
                )}
              />
            )}
          />
        </div>
        <form.AppField
          name='role'
          children={(field) => <field.TextField label='Role' placeholder='Lead designer' />}
        />
        <div className='flex justify-end'>
          <LoadingButton loading={addMutation.isPending} type='submit' size='sm'>
            <Icons.add className='mr-1 h-4 w-4' /> Add member
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
