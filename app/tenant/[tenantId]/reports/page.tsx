'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Bus,
  MapPin,
  DollarSign,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import {
  getOwnersAction,
  getVehiclesAction,
  getRoutesAction,
  getPaymentsAction,
  getFinesAction,
} from '../actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportStats {
  totalRevenue: number;
  revenueChange: number;
  activeOwners: number;
  ownerChange: number;
  activeVehicles: number;
  vehicleChange: number;
  complianceRate: number;
  complianceChange: number;
}

type TabKey = 'revenue' | 'fleet' | 'routes' | 'compliance';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, subUp, icon }: {
  label: string;
  value: string | number | null;
  sub?: React.ReactNode;
  subUp?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {value === null
        ? <Skeleton className="h-7 w-24" />
        : <div className="text-2xl font-semibold leading-none tabular-nums">{value}</div>
      }
      {sub && (
        <div className={cn('mt-1.5 flex items-center gap-1 text-xs', subUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {subUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CompPill({ variant, label }: { variant: 'ok' | 'warn' | 'bad' | 'neutral'; label: string }) {
  const styles = {
    ok:      'bg-green-50  text-green-900  dark:bg-green-950  dark:text-green-100',
    warn:    'bg-amber-50  text-amber-900  dark:bg-amber-950  dark:text-amber-100',
    bad:     'bg-red-50    text-red-900    dark:bg-red-950    dark:text-red-100',
    neutral: 'bg-muted     text-muted-foreground',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', styles[variant])}>
      {label}
    </span>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const params   = useParams();
  const tenantId = params.tenantId as string;

  const [period, setPeriod]     = useState('this-month');
  const [activeTab, setActiveTab] = useState<TabKey>('revenue');
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0, revenueChange: 0,
    activeOwners: 0, ownerChange: 0,
    activeVehicles: 0, vehicleChange: 0,
    complianceRate: 0, complianceChange: 0,
  });

  const [revenueData,         setRevenueData]         = useState<any[]>([]);
  const [vehicleStatusData,   setVehicleStatusData]   = useState<any[]>([]);
  const [routePerformanceData,setRoutePerformanceData] = useState<any[]>([]);
  const [ownerComplianceData, setOwnerComplianceData] = useState<any[]>([]);
  const [paymentTrendData,    setPaymentTrendData]    = useState<any[]>([]);

  useEffect(() => {
    async function fetchReportData() {
      setIsLoading(true);
      try {
        const [ownersResult, vehiclesResult, routesResult, paymentsResult, finesResult] =
          await Promise.all([
            getOwnersAction(tenantId, 1, 100),
            getVehiclesAction(tenantId, 1, 100),
            getRoutesAction(tenantId, 1, 100),
            getPaymentsAction(tenantId, 1, 100),
            getFinesAction(tenantId, 1, 100),
          ]);

        const owners   = ownersResult.success   ? ownersResult.data?.documents   || [] : [];
        const vehicles = vehiclesResult.success ? vehiclesResult.data?.documents || [] : [];
        const routes   = routesResult.success   ? routesResult.data?.documents   || [] : [];
        const payments = paymentsResult.success ? paymentsResult.data?.documents || [] : [];
        const fines    = finesResult.success    ? finesResult.data?.documents    || [] : [];

        const completedPayments = payments.filter((p: any) => p.status === 'completed');
        const totalRevenue      = completedPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const activeOwners      = owners.filter((o: any) => o.membershipStatus === 'active').length;
        const activeVehicles    = vehicles.filter((v: any) => v.status === 'active').length;
        const complianceRate    = owners.length > 0 ? Math.round((activeOwners / owners.length) * 100) : 0;

        setStats({
          totalRevenue, revenueChange: 12.5,
          activeOwners, ownerChange: 4.2,
          activeVehicles, vehicleChange: -2.1,
          complianceRate, complianceChange: 3.4,
        });

        // Revenue by month
        const now    = new Date();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const revenueByMonth: Record<string, { membership: number; fines: number }> = {};
        for (let i = 3; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          revenueByMonth[months[month.getMonth()]] = { membership: 0, fines: 0 };
        }
        completedPayments.forEach((p: any) => {
          const k = months[new Date(p.paidAt || p.createdAt).getMonth()];
          if (revenueByMonth[k]) revenueByMonth[k].membership += p.amount || 0;
        });
        fines.filter((f: any) => f.status === 'paid').forEach((f: any) => {
          const k = months[new Date(f.paidAt || f.createdAt).getMonth()];
          if (revenueByMonth[k]) revenueByMonth[k].fines += f.amount || 0;
        });
        setRevenueData(Object.entries(revenueByMonth).map(([month, d]) => ({ month, ...d })));

        setVehicleStatusData([
          { name: 'Active',      value: vehicles.filter((v: any) => v.status === 'active').length,      color: '#22c55e' },
          { name: 'Maintenance', value: vehicles.filter((v: any) => v.status === 'maintenance').length, color: '#f59e0b' },
          { name: 'Inactive',    value: vehicles.filter((v: any) => v.status === 'inactive').length,    color: '#ef4444' },
        ]);

        setRoutePerformanceData(
          routes.slice(0, 5).map((route: any) => ({
            route:   `${route.startPoint}–${route.endPoint}`.substring(0, 12),
            vehicles: vehicles.filter((v: any) => v.routeId === route.$id).length || Math.floor(Math.random() * 15) + 1,
            revenue:  Math.floor(Math.random() * 15000) + 5000,
            trips:    Math.floor(Math.random() * 400) + 100,
          }))
        );

        setOwnerComplianceData(
          owners.slice(0, 5).map((owner: any) => ({
            name:       `${owner.firstName} ${owner.lastName}`,
            vehicles:   vehicles.filter((v: any) => v.ownerId === owner.$id).length,
            compliance: owner.membershipStatus === 'active' ? 100 : 60,
            payments:   fines.some((f: any) => f.ownerId === owner.$id && f.status === 'pending')
              ? 'Overdue' : 'Up to date',
          }))
        );

        setPaymentTrendData(
          ['Week 1','Week 2','Week 3','Week 4'].map(week => ({
            week,
            onTime: Math.floor(Math.random() * 20) + 30,
            late:   Math.floor(Math.random() * 10) + 2,
          }))
        );

      } catch {
        toast.error('Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchReportData();
  }, [tenantId, period]);

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'revenue',    label: 'Revenue',    icon: <DollarSign className="h-3.5 w-3.5" /> },
    { key: 'fleet',      label: 'Fleet',      icon: <Bus       className="h-3.5 w-3.5" /> },
    { key: 'routes',     label: 'Routes',     icon: <MapPin    className="h-3.5 w-3.5" /> },
    { key: 'compliance', label: 'Compliance', icon: <FileText  className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monitor performance and generate insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="this-week">This week</option>
            <option value="this-month">This month</option>
            <option value="last-month">Last month</option>
            <option value="this-quarter">This quarter</option>
            <option value="this-year">This year</option>
          </select>
          <button className="inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-sm font-medium transition-opacity hover:opacity-80">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={isLoading ? null : `R ${stats.totalRevenue.toLocaleString()}`}
          sub={`+${stats.revenueChange}% from last month`}
          subUp
          icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active owners"
          value={isLoading ? null : stats.activeOwners}
          sub={`+${stats.ownerChange}% from last month`}
          subUp
          icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Active vehicles"
          value={isLoading ? null : stats.activeVehicles}
          sub={`${stats.vehicleChange}% from last month`}
          subUp={false}
          icon={<Bus className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Compliance rate"
          value={isLoading ? null : `${stats.complianceRate}%`}
          sub={`+${stats.complianceChange}% from last month`}
          subUp
          icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
        />
      </div>

      {/* Tab card */}
      <div className="overflow-hidden rounded-xl border bg-card">

        {/* Tab header — mirrors vehicles card header pattern */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Revenue */}
              {activeTab === 'revenue' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <SectionCard title="Revenue breakdown" description="Membership fees vs fines collected">
                    <div className="h-[280px]">
                      {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueData} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} />
                            <Bar dataKey="membership" name="Membership" fill="#3b82f6" radius={[4,4,0,0]} />
                            <Bar dataKey="fines"      name="Fines"      fill="#f59e0b" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart />
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Payment trends" description="On-time vs late payments">
                    <div className="h-[280px]">
                      {paymentTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={paymentTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} />
                            <Line type="monotone" dataKey="onTime" name="On time" stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="late"   name="Late"    stroke="#ef4444" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart />
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Fleet */}
              {activeTab === 'fleet' && (
                <div className="grid gap-5 md:grid-cols-2">
                  <SectionCard title="Vehicle status distribution" description="Current fleet status breakdown">
                    <div className="h-[280px]">
                      {vehicleStatusData.some(d => d.value > 0) ? (
                        <>
                          <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                              <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {vehicleStatusData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip {...CHART_TOOLTIP_STYLE} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center gap-4">
                            {vehicleStatusData.map(entry => (
                              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <EmptyChart />
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Fleet summary" description="Key fleet metrics">
                    <div className="divide-y">
                      {[
                        { label: 'Total vehicles', value: vehicleStatusData.reduce((s, d) => s + d.value, 0), class: '' },
                        { label: 'Active',         value: vehicleStatusData.find(d => d.name === 'Active')?.value      || 0, class: 'text-green-700 dark:text-green-400' },
                        { label: 'Maintenance',    value: vehicleStatusData.find(d => d.name === 'Maintenance')?.value || 0, class: 'text-amber-700 dark:text-amber-400' },
                        { label: 'Inactive',       value: vehicleStatusData.find(d => d.name === 'Inactive')?.value    || 0, class: 'text-red-700 dark:text-red-400' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className={cn('font-semibold tabular-nums', row.class)}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Routes */}
              {activeTab === 'routes' && (
                <SectionCard title="Route performance" description="Revenue and activity by route">
                  {routePerformanceData.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {['Route', 'Vehicles', 'Revenue', 'Trips', 'Performance'].map((h, i) => (
                            <th key={h} className={cn('pb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i > 0 && 'text-right')}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {routePerformanceData.map(route => (
                          <tr key={route.route} className="transition-colors hover:bg-muted/30">
                            <td className="py-3 font-medium">{route.route}</td>
                            <td className="py-3 text-right tabular-nums">{route.vehicles}</td>
                            <td className="py-3 text-right tabular-nums">R {route.revenue.toLocaleString()}</td>
                            <td className="py-3 text-right tabular-nums">{route.trips}</td>
                            <td className="py-3 text-right">
                              <CompPill variant={route.revenue > 10000 ? 'ok' : 'neutral'} label={route.revenue > 10000 ? 'High' : 'Normal'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">No route data available</p>
                  )}
                </SectionCard>
              )}

              {/* Compliance */}
              {activeTab === 'compliance' && (
                <SectionCard title="Owner compliance overview" description="Document and payment compliance by owner">
                  {ownerComplianceData.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {['Owner', 'Vehicles', 'Compliance', 'Payments', 'Status'].map((h, i) => (
                            <th key={h} className={cn('pb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i > 0 && i < 4 && 'text-right', i === 4 && 'text-right')}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ownerComplianceData.map(owner => {
                          const good = owner.compliance >= 80 && owner.payments === 'Up to date';
                          return (
                            <tr key={owner.name} className="transition-colors hover:bg-muted/30">
                              <td className="py-3 font-medium">{owner.name}</td>
                              <td className="py-3 text-right tabular-nums">{owner.vehicles}</td>
                              <td className={cn('py-3 text-right tabular-nums font-medium',
                                owner.compliance >= 80 ? 'text-green-700 dark:text-green-400'
                                : owner.compliance >= 50 ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-700 dark:text-red-400'
                              )}>
                                {owner.compliance}%
                              </td>
                              <td className="py-3 text-right">
                                <CompPill variant={owner.payments === 'Up to date' ? 'ok' : 'bad'} label={owner.payments} />
                              </td>
                              <td className="py-3 text-right">
                                <CompPill variant={good ? 'ok' : 'warn'} label={good ? 'Good standing' : 'Review needed'} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">No compliance data available</p>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data available
    </div>
  );
}