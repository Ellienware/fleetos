'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Search,
  Filter,
  User,
  Bus,
  MapPin,
  Clock,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ShiftWithDetails, ShiftStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ShiftListClientProps {
  shifts: ShiftWithDetails[];
  tenantId: string;
}

const STATUS_COLORS: Record<ShiftStatus, string> = {
  scheduled: 'bg-primary/10 text-primary',
  in_progress: 'bg-success/10 text-success',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function ShiftListClient({ shifts, tenantId }: ShiftListClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredShifts = shifts.filter((shift) => {
    // Status filter
    if (statusFilter !== 'all' && shift.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const driverName = shift.driver
        ? `${shift.driver.firstName} ${shift.driver.lastName}`.toLowerCase()
        : '';
      const vehicleReg = shift.vehicle?.registrationNumber?.toLowerCase() || '';
      const routeName = shift.route?.name?.toLowerCase() || '';
      const ownerName = shift.owner
        ? `${shift.owner.firstName} ${shift.owner.lastName}`.toLowerCase()
        : '';

      return (
        driverName.includes(search) ||
        vehicleReg.includes(search) ||
        routeName.includes(search) ||
        ownerName.includes(search)
      );
    }

    return true;
  });

  // Group shifts by date using startTime
  const groupedShifts = filteredShifts.reduce((acc, shift) => {
    const dateKey = format(parseISO(shift.startTime), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, ShiftWithDetails[]>);

  const sortedDates = Object.keys(groupedShifts).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search driver, vehicle, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ShiftStatus | 'all')}
        >
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shifts grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No shifts found</h3>
          <p className="text-sm text-muted-foreground">
            {shifts.length === 0
              ? 'No shifts have been scheduled yet.'
              : 'No shifts match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const dayShifts = groupedShifts[dateKey];
            const date = parseISO(dateKey);
            const isExpanded = expandedRows.has(dateKey);

            return (
              <Collapsible
                key={dateKey}
                open={isExpanded}
                onOpenChange={() => toggleRow(dateKey)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex w-full items-center justify-between rounded-lg border bg-muted/50 p-4 hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">
                          {format(date, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayShifts.map((shift) => (
                          <TableRow key={shift.$id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-sm">
                                  {format(parseISO(shift.startTime), 'HH:mm')} -{' '}
                                  {format(parseISO(shift.endTime), 'HH:mm')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {shift.driver ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <span>
                                    {shift.driver.firstName} {shift.driver.lastName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {shift.vehicle ? (
                                <div className="flex items-center gap-2">
                                  <Bus className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono">
                                    {shift.vehicle.registrationNumber}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {shift.route ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{shift.route.name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {shift.owner ? (
                                <span className="text-sm">
                                  {shift.owner.firstName} {shift.owner.lastName}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'capitalize border-0',
                                  STATUS_COLORS[shift.status]
                                )}
                              >
                                {shift.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}