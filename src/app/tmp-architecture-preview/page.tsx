import { ArchitectureCanvas } from '@/features/architecture/components/architecture-canvas';

export default function Page() {
  return (
    <div className='flex h-svh flex-col'>
      <div className='h-14' />
      <ArchitectureCanvas />
    </div>
  );
}
