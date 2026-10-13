export interface OverviewIndicator {
  label: string;
  value: string;
  /** Change versus the previous period, in percent (e.g. `12.5` or `-20`). */
  changePercent: number;
  summary: string;
  detail: string;
}
