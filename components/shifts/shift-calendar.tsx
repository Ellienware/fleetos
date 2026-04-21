'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Bus,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ShiftWithDetails, ShiftStatus } from '@/types';

interface ShiftCalendarProps {
  shifts: ShiftWithDetails[];
  onShiftClick?: (shift: ShiftWithDetails) => void;
  onDateClick?: (date: Date) => void;
  className?: string;
}

const STATUS_COLORS: Record<ShiftStatus, string> = {
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  in_progress: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-muted',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const STATUS_DOT_COLORS: Record<ShiftStatus, string> = {
  scheduled: 'bg-primary',
  in_progress: 'bg-success',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-destructive',
};

export function ShiftCalendar({
  shifts,
  onShiftClick,
  onDateClick,
  className,
}: ShiftCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped = new Map<string, ShiftWithDetails[]>();
    
    shifts.forEach((shift) => {
      const dateKey = format(parseISO(shift.startTime), 'yyyy-MM-dd');
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, shift]);
    });
    
    return grouped;
  }, [shifts]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn('w-full', className)}>
      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS.scheduled)} />
          <span className="text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS.in_progress)} />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS.completed)} />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_COLORS.cancelled)} />
          <span className="text-muted-foreground">Cancelled</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayShifts = shiftsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={index}
                className={cn(
                  'min-h-[100px] border-b border-r p-1 transition-colors last:border-r-0',
                  !isCurrentMonth && 'bg-muted/30',
                  isSelected && 'bg-primary/5',
                  '[&:nth-child(7n)]:border-r-0'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-muted',
                    isToday(day) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </button>

                {/* Shift indicators */}
                <div className="space-y-0.5">
                  {dayShifts.slice(0, 3).map((shift) => (
                    <Popover key={shift.$id}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShiftClick?.(shift);
                          }}
                          className={cn(
                            'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80',
                            STATUS_COLORS[shift.status]
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_COLORS[shift.status])} />
                          <span className="truncate">
                            {format(parseISO(shift.startTime), 'HH:mm')} - {shift.driver?.firstName || 'Driver'}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="start">
                        <ShiftPopoverContent shift={shift} />
                      </PopoverContent>
                    </Popover>
                  ))}
                  {dayShifts.length > 3 && (
                    <div className="px-1 text-[10px] text-muted-foreground">
                      +{dayShifts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShiftPopoverContent({ shift }: { shift: ShiftWithDetails }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">
            {format(parseISO(shift.startTime), 'EEEE, MMMM d')}
          </h4>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn('capitalize', STATUS_COLORS[shift.status])}
        >
          {shift.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        {shift.driver && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {shift.driver.firstName} {shift.driver.lastName}
            </span>
          </div>
        )}
        {shift.vehicle && (
          <div className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-muted-foreground" />
            <span>{shift.vehicle.registrationNumber}</span>
          </div>
        )}
        {shift.route && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{shift.route.name}</span>
          </div>
        )}
      </div>

      {shift.notes && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          {shift.notes}
        </p>
      )}
    </div>
  );
}