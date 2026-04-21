'use client';

import { useState } from 'react';

import { Calendar, List } from 'lucide-react';
import { ShiftCalendarClient } from './shift-calendar-client';
import { ShiftListClient } from './shift-list-client';

interface ShiftsViewClientProps {
  shifts: any[];
  tenantId: string;
}

export function ShiftsViewClient({ shifts, tenantId }: ShiftsViewClientProps) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  return (
    <div>
      {/* Tab strip */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 mb-5 w-fit">
        <button
          onClick={() => setView('calendar')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'calendar'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Calendar
        </button>
        <button
          onClick={() => setView('list')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'list'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
      </div>

      {/* View content */}
      {view === 'calendar' ? (
        <ShiftCalendarClient shifts={shifts} tenantId={tenantId} />
      ) : (
        <ShiftListClient shifts={shifts} tenantId={tenantId} />
      )}
    </div>
  );
}