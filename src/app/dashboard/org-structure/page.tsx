import { OrgCanvas } from '@/features/org-structure/components/org-canvas';

export const metadata = {
  title: 'Dashboard : Hierarchy Map'
};

export default function OrgStructurePage() {
  return (
    <div className='flex min-h-0 flex-1'>
      <OrgCanvas />
    </div>
  );
}
