'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useAppForm } from '@/lib/form';
import {
  createDepartmentMutation,
  deleteDepartmentMutation,
  updateDepartmentMutation
} from '../api/mutations';
import type { Department } from '../api/types';
import { ROOT_PARENT, departmentSchema, type DepartmentFormValues } from '../schemas/department';
import { DepartmentImage } from './department-image';
import { DepartmentMembers } from './department-members';

function saveErrorMessage(error: Error) {
  if (error.message.includes('409')) return 'A department with this name already exists.';
  if (error.message.includes('400')) return "That parent isn't allowed: it would create a loop.";
  return "Couldn't save the department. Try again.";
}

/** The department itself and everything below it can't become its parent. */
function descendantIds(departments: Department[], id: string) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const department of departments) {
      if (department.parentId && ids.has(department.parentId) && !ids.has(department.id)) {
        ids.add(department.id);
        grew = true;
      }
    }
  }
  return ids;
}

interface DepartmentSheetProps {
  /** Null when creating a department. */
  department: Department | null;
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentSheet({
  department: liveDepartment,
  departments,
  open,
  onOpenChange
}: DepartmentSheetProps) {
  // Keeps the sheet's content while it closes after a delete.
  const [initialDepartment] = useState(liveDepartment);
  const department = liveDepartment ?? initialDepartment;
  const isEdit = !!department;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const excluded = department ? descendantIds(departments, department.id) : new Set<string>();
  const parentOptions = [
    { value: ROOT_PARENT, label: 'Dot Science' },
    ...departments
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ value: item.id, label: item.name }))
  ];

  const createMutation = useMutation({
    ...createDepartmentMutation,
    onSuccess: (...args) => {
      createDepartmentMutation.onSuccess?.(...args);
      toast.success('Department created');
      onOpenChange(false);
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const updateMutation = useMutation({
    ...updateDepartmentMutation,
    onSuccess: (...args) => {
      updateDepartmentMutation.onSuccess?.(...args);
      toast.success('Department updated');
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const deleteMutation = useMutation({
    ...deleteDepartmentMutation,
    onSuccess: (...args) => {
      deleteDepartmentMutation.onSuccess?.(...args);
      toast.success('Department deleted');
      setDeleteOpen(false);
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't delete the department")
  });

  const form = useAppForm({
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
      longDescription: department?.longDescription ?? '',
      parentId: department?.parentId ?? ROOT_PARENT
    } as DepartmentFormValues,
    validators: {
      onSubmit: departmentSchema
    },
    onSubmit: async ({ value }) => {
      const values = departmentSchema.parse(value);
      if (department) {
        await updateMutation.mutateAsync({ id: department.id, values });
      } else {
        await createMutation.mutateAsync(values);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{isEdit ? department.name : 'New department'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Edit the department, choose who it reports to and manage its people and agents.'
              : 'Departments report to Dot Science unless you pick another department.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-6 overflow-auto p-4'>
          <form
            id='department-form-sheet'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='name'
                children={(field) => (
                  <field.TextField label='Name' required placeholder='Design Department' />
                )}
              />
              <form.AppField
                name='description'
                children={(field) => (
                  <field.TextareaField
                    label='Description'
                    rows={3}
                    maxLength={400}
                    showCount
                    placeholder='What the department is responsible for'
                  />
                )}
              />
              <form.AppField
                name='longDescription'
                children={(field) => (
                  <field.TextareaField
                    label='Long description (Markdown)'
                    description='Shown as the department documentation in the virtual office.'
                    rows={10}
                    className='max-h-96 font-mono text-xs'
                    maxLength={10000}
                    showCount
                    placeholder='A longer presentation of the department'
                  />
                )}
              />
              <form.AppField
                name='parentId'
                children={(field) => (
                  <field.SelectField label='Reports to' required options={parentOptions} />
                )}
              />
            </FieldGroup>
          </form>

          {department ? (
            <>
              <Separator />
              <DepartmentImage department={department} />
              <Separator />
              <DepartmentMembers department={department} />
            </>
          ) : (
            <p className='text-muted-foreground text-xs'>
              Create the department first, then add people and agents to it.
            </p>
          )}
        </div>

        <SheetFooter className='flex-row'>
          {isEdit ? (
            <Button
              type='button'
              variant='ghost'
              className='text-destructive hover:text-destructive mr-auto'
              onClick={() => setDeleteOpen(true)}
            >
              <Icons.trash className='mr-1 h-4 w-4' /> Delete
            </Button>
          ) : null}
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <LoadingButton loading={isPending} type='submit' form='department-form-sheet'>
            {isEdit ? 'Save changes' : 'Create department'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
      {department ? (
        <AlertModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(department.id)}
          loading={deleteMutation.isPending}
          title={`Delete ${department.name}?`}
          description='Its members are removed from it, and any sub-departments move up to its parent.'
          confirmLabel='Delete'
        />
      ) : null}
    </Sheet>
  );
}
