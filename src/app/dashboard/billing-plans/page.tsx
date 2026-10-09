import PageContainer from '@/components/layout/page-container';
import { billingPlansInfoContent } from '@/config/infoconfig';
import { AverageCompensationToggle } from '@/features/billing-plans/components/average-compensation-toggle';
import { BillingPlanFormDialogTrigger } from '@/features/billing-plans/components/billing-plan-form-dialog';
import BillingPlanListing from '@/features/billing-plans/components/billing-plan-listing';

export const metadata = {
  title: 'Dashboard: Billing Plans'
};

export default function BillingPlansPage() {
  return (
    <PageContainer
      pageTitle='Billing Plans'
      pageDescription='Subscription plans, their limits and features, and what each subscriber costs to maintain'
      infoContent={billingPlansInfoContent}
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <AverageCompensationToggle />
          <BillingPlanFormDialogTrigger />
        </div>
      }
    >
      <BillingPlanListing />
    </PageContainer>
  );
}
