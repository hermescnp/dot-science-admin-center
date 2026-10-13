import type { OverviewIndicator } from './types';

const INDICATORS: OverviewIndicator[] = [
  {
    label: 'Total Revenue',
    value: '$1,250.00',
    changePercent: 12.5,
    summary: 'Trending up this month',
    detail: 'Visitors for the last 6 months'
  },
  {
    label: 'New Customers',
    value: '1,234',
    changePercent: -20,
    summary: 'Down 20% this period',
    detail: 'Acquisition needs attention'
  },
  {
    label: 'Active Accounts',
    value: '45,678',
    changePercent: 12.5,
    summary: 'Strong user retention',
    detail: 'Engagement exceed targets'
  },
  {
    label: 'Growth Rate',
    value: '4.5%',
    changePercent: 4.5,
    summary: 'Steady performance increase',
    detail: 'Meets growth projections'
  }
];

export async function getOverviewIndicators(): Promise<OverviewIndicator[]> {
  return INDICATORS;
}

export function formatChangePercent(changePercent: number): string {
  return `${changePercent > 0 ? '+' : ''}${changePercent}%`;
}
