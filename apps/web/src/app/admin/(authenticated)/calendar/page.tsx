'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';

interface CalendarEvent {
  id: number;
  title?: string;
  scheduledStartTime: string;
  status: string;
  schedule?: { name: string };
}

const statusColors: Record<string, string> = {
  CREATED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  FINISHED: '#22c55e',
  CANCELLED: '#ef4444',
};

export default function CalendarPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const res = await api.getCalendarEvents({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      });
      const list = Array.isArray(res) ? res : (res as { data?: CalendarEvent[] }).data || [];
      setEvents(list as CalendarEvent[]);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const getEventsForDay = (day: number) => {
    return events.filter((e) => {
      const d = new Date(e.scheduledStartTime);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  };

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Calendar" />
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
            <i className="fas fa-chevron-left" />
          </button>
          <h2 className="text-xl font-semibold">{monthName}</h2>
          <button onClick={nextMonth} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        <div ref={containerRef} className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">{d}</div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="bg-white p-2 min-h-[100px]" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
            return (
              <div key={day} className={`bg-white p-2 min-h-[100px] ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{day}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="text-xs px-1 py-0.5 rounded truncate text-white"
                      style={{ backgroundColor: statusColors[e.status] || '#6b7280' }}
                      title={`${e.schedule?.name || 'Game'} #${e.id} - ${e.status}`}
                    >
                      {e.schedule?.name || `Game #${e.id}`}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
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
