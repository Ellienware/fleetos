'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShiftCalendar } from '@/components/shifts/shift-calendar';
import type { ShiftWithDetails } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { User, Bus, MapPin, Calendar, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ShiftCalendarClientProps {
  shifts: ShiftWithDetails[];
  tenantId: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  in_progress: 'bg-success/10 text-success border-success/20',
  completed: 'bg-muted text-muted-foreground border-muted',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ShiftCalendarClient({ shifts, tenantId }: ShiftCalendarClientProps) {
  const [selectedShift, setSelectedShift] = useState<ShiftWithDetails | null>(null);
  const router = useRouter();

  const handleShiftClick = (shift: ShiftWithDetails) => {
    setSelectedShift(shift);
  };

  const handleDateClick = (date: Date) => {
    // Could open a create shift dialog for this date
    console.log('Date clicked:', date);
  };

  return (
    <>
      <ShiftCalendar
        shifts={shifts}
        onShiftClick={handleShiftClick}
        onDateClick={handleDateClick}
      />

      {/* Shift Detail Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Details
            </DialogTitle>
            <DialogDescription>
              {selectedShift && format(parseISO(selectedShift.startTime), 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          {selectedShift && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`capitalize ${STATUS_COLORS[selectedShift.status]}`}
                >
                  {selectedShift.status.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(parseISO(selectedShift.startTime), 'HH:mm')} - {format(parseISO(selectedShift.endTime), 'HH:mm')}
                </div>
              </div>

              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                {selectedShift.driver && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedShift.driver.firstName} {selectedShift.driver.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">Driver</p>
                    </div>
                  </div>
                )}

                {selectedShift.vehicle && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Bus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedShift.vehicle.registrationNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedShift.vehicle.make} {selectedShift.vehicle.model}
                      </p>
                    </div>
                  </div>
                )}

                {selectedShift.route && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedShift.route.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedShift.route.origin} → {selectedShift.route.destination}
                      </p>
                    </div>
                  </div>
                )}

                {selectedShift.owner && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs text-muted-foreground">
                      Owner: {selectedShift.owner.firstName} {selectedShift.owner.lastName}
                    </p>
                  </div>
                )}
              </div>

              {selectedShift.notes && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedShift.notes}</p>
                </div>
              )}

              {selectedShift.attendance && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attendance</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Clock In:</span>
                    <span>
                      {selectedShift.attendance.clockInTime
                        ? format(parseISO(selectedShift.attendance.clockInTime), 'HH:mm')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Clock Out:</span>
                    <span>
                      {selectedShift.attendance.clockOutTime
                        ? format(parseISO(selectedShift.attendance.clockOutTime), 'HH:mm')
                        : '-'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedShift(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}