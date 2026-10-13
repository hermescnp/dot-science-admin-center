import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatChangePercent, getOverviewIndicators } from '../api/service';

interface OverviewIndicatorsProps {
  className?: string;
}

export async function OverviewIndicators({ className }: OverviewIndicatorsProps) {
  const indicators = await getOverviewIndicators();

  return (
    <div
      className={cn(
        '*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs',
        className
      )}
    >
      {indicators.map((indicator) => {
        const TrendIcon = indicator.changePercent < 0 ? Icons.trendingDown : Icons.trendingUp;
        return (
          <Card key={indicator.label} className='@container/card'>
            <CardHeader>
              <CardDescription>{indicator.label}</CardDescription>
              <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                {indicator.value}
              </CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  <TrendIcon />
                  {formatChangePercent(indicator.changePercent)}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-1.5 text-sm'>
              <div className='line-clamp-1 flex gap-2 font-medium'>
                {indicator.summary} <TrendIcon className='size-4' />
              </div>
              <div className='text-muted-foreground'>{indicator.detail}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
