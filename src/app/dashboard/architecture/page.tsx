import { ArchitectureCanvas } from '@/features/architecture/components/architecture-canvas';

export const metadata = {
  title: 'Dashboard : Architecture'
};

export default function ArchitecturePage() {
  return (
    <div className='flex min-h-0 flex-1'>
      <ArchitectureCanvas />
    </div>
  );
}
