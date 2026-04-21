import {
  Building2,
  Bus,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    totalTenants: number;
    activeTenants: number;
    totalOwners: number;
    totalVehicles: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
}

const cards = (stats: StatsCardsProps['stats']) => [
  {
    title: 'Total associations',
    value: stats.totalTenants.toLocaleString(),
    sub: `${stats.activeTenants} active`,
    icon: Building2,
    trend: '+12% from last month',
    trendUp: true,
  },
  {
    title: 'Total owners',
    value: stats.totalOwners.toLocaleString(),
    sub: 'Across all associations',
    icon: Users,
    trend: '+8% from last month',
    trendUp: true,
  },
  {
    title: 'Total vehicles',
    value: stats.totalVehicles.toLocaleString(),
    sub: 'Registered fleet',
    icon: Bus,
    trend: '+5% from last month',
    trendUp: true,
  },
  {
    title: 'Monthly revenue',
    value: `R ${stats.monthlyRevenue.toLocaleString()}`,
    sub: `${stats.activeSubscriptions} active subscriptions`,
    icon: CreditCard,
    trend: '+15% from last month',
    trendUp: true,
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {cards(stats).map(card => (
        <div key={card.title} className="rounded-lg bg-muted/60 px-4 py-3">

          {/* Label + icon */}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{card.title}</span>
            <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Value */}
          <div className="text-2xl font-semibold leading-none tabular-nums">
            {card.value}
          </div>

          {/* Sub-label */}
          <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>

          {/* Trend */}
          <div className={cn(
            'mt-2.5 flex items-center gap-1 text-xs font-medium',
            card.trendUp ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          )}>
            {card.trendUp
              ? <TrendingUp className="h-3 w-3 shrink-0" />
              : <TrendingDown className="h-3 w-3 shrink-0" />
            }
            {card.trend}
          </div>

        </div>
      ))}
    </div>
  );
}
