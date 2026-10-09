import PageContainer from '@/components/layout/page-container';
import { maintenanceInfoContent } from '@/config/infoconfig';
import { ExchangeRateButton } from '@/features/external-services/components/exchange-rate-dialog';
import MaintenanceListing from '@/features/external-services/components/maintenance-listing';
import { ProjectionButton } from '@/features/external-services/components/projection-dialog';

export const metadata = {
  title: 'Dashboard: Maintenance'
};

export default function MaintenancePage() {
  return (
    <PageContainer
      pageTitle='Maintenance'
      pageDescription='External services, their plans and what they cost'
      infoContent={maintenanceInfoContent}
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <ProjectionButton />
          <ExchangeRateButton />
        </div>
      }
    >
      <MaintenanceListing />
    </PageContainer>
  );
}
