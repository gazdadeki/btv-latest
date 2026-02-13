'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/loading';
import { Dialog } from '@/components/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

/* ────── Types ────── */
interface CalendarEvent {
  id: number;
  title?: string;
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  isPseudo?: boolean;
  isExclusiveToGold?: boolean;
  orderIndex?: number;
  scheduleId?: number;
  scheduleName?: string;
  schedule?: { name: string; id: number };
  teamAName?: string;
  teamBName?: string;
  slotsReserved?: number;
  totalSlots?: number;
  slotsConfirmed?: number;
  slotsAvailable?: number;
  slots?: Array<{ id: number; slotNumber: number; isReserved: boolean }>;
  reservations?: Array<{
    id: number;
    userId: number;
    status: string;
    reservedAt?: string;
    confirmedAt?: string;
    user?: { email: string };
    slot?: { slotNumber: number };
  }>;
}

type ViewType = 'month' | 'week' | 'day' | 'list';

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  FINISHED: '#22c55e',
  CANCELLED: '#ef4444',
  PSEUDO: '#9ca3af',
};
const STATUS_COLORS_GOLD = '#eab308';

const STATUS_BG: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  FINISHED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, string> = {
  CREATED: 'fa-circle',
  IN_PROGRESS: 'fa-play-circle',
  FINISHED: 'fa-check-circle',
  CANCELLED: 'fa-times-circle',
  PSEUDO: 'fa-question-circle',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENTS_PER_DAY_LIMIT = 5;

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatHM(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function getEventColor(ev: CalendarEvent): string {
  if (ev.isPseudo) return STATUS_COLORS.PSEUDO;
  if (ev.isExclusiveToGold) return STATUS_COLORS_GOLD;
  return STATUS_COLORS[ev.status] || '#6b7280';
}
function getEventTooltip(ev: CalendarEvent): string {
  const parts: string[] = [];
  const name = ev.schedule?.name || ev.scheduleName || `Game #${ev.id}`;
  parts.push(name);
  if (ev.isPseudo) {
    parts.push('Status: Pseudo (Not Generated)');
  } else {
    parts.push(`Status: ${ev.status}`);
  }
  if (ev.isExclusiveToGold) parts.push('Gold Exclusive');
  parts.push(`Time: ${formatHM(ev.scheduledStartTime)}`);
  if (ev.teamAName && ev.teamBName) parts.push(`${ev.teamAName} vs ${ev.teamBName}`);
  if (!ev.isPseudo) parts.push(`Slots: ${ev.slotsReserved || 0}/${ev.totalSlots || '?'}`);
  return parts.join('\n');
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [generateDialog, setGenerateDialog] = useState<{ scheduleId: number; date: string } | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  /* ─── Date range for current view ─── */
  const getRange = useCallback((): { start: Date; end: Date } => {
    if (view === 'month') {
      const s = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const e = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return { start: s, end: e };
    }
    if (view === 'week') {
      const s = startOfWeek(currentDate);
      return { start: s, end: addDays(s, 6) };
    }
    return { start: currentDate, end: currentDate };
  }, [currentDate, view]);

  const load = useCallback(async () => {
    try {
      const { start, end } = getRange();
      const wide = view === 'list' ? addDays(start, 30) : end;
      const res = await api.getCalendarEvents({
        startDate: start.toISOString().split('T')[0],
        endDate: wide.toISOString().split('T')[0],
      });
      const list = Array.isArray(res) ? res : (res as { data?: CalendarEvent[] }).data || [];
      setEvents(list as CalendarEvent[]);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [getRange, view]);

  useEffect(() => { load(); }, [load]);

  /* ─── Navigation ─── */
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const title = () => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const s = startOfWeek(currentDate);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (view === 'day') return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return 'Upcoming Events';
  };

  const getEventsFor = (date: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.scheduledStartTime), date))
      .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());

  /* ─── Expand/collapse day events ─── */
  const toggleExpand = (date: Date) => {
    const key = dateKey(date);
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ─── Click event ─── */
  const handleEventClick = async (ev: CalendarEvent) => {
    if (ev.isPseudo) {
      setGenerateDialog({
        scheduleId: ev.scheduleId || ev.schedule?.id || 0,
        date: new Date(ev.scheduledStartTime).toISOString().split('T')[0],
      });
      return;
    }
    try {
      const game = (await api.getGame(ev.id)) as CalendarEvent;
      setDetail(game);
    } catch {
      setDetail(ev);
    }
  };

  const handleGenerate = async () => {
    if (!generateDialog) return;
    try {
      const res = (await api.generateGamesForSchedule(generateDialog.scheduleId, generateDialog.date)) as { gamesCreated?: number };
      toast.success(`Generated ${res.gamesCreated || 0} game(s)`);
      setGenerateDialog(null);
      load();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ─── Render event pill with status icon ─── */
  const EventPill = ({ ev, compact = false }: { ev: CalendarEvent; compact?: boolean }) => {
    const icon = ev.isPseudo ? STATUS_ICONS.PSEUDO : (STATUS_ICONS[ev.status] || 'fa-circle');
    return (
      <button
        onClick={() => handleEventClick(ev)}
        className={`text-xs px-1.5 py-0.5 rounded truncate text-white cursor-pointer w-full text-left flex items-center gap-1 ${compact ? '' : 'mb-0.5'}`}
        style={{ backgroundColor: getEventColor(ev) }}
        title={getEventTooltip(ev)}
      >
        <i className={`fas ${icon} text-[9px] shrink-0 opacity-80`} />
        {compact && <span>{formatHM(ev.scheduledStartTime)}</span>}
        <span className="truncate">{ev.schedule?.name || ev.scheduleName || `Game #${ev.id}`}</span>
        {ev.isPseudo && <span className="opacity-70">*</span>}
        {ev.isExclusiveToGold && !ev.isPseudo && <i className="fas fa-crown text-[8px] shrink-0 opacity-80" />}
      </button>
    );
  };

  if (loading) return <PageLoading />;

  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Calendar"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {(['month', 'week', 'day', 'list'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs rounded cursor-pointer ${view === v ? 'bg-indigo-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  load();
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="w-px h-6 bg-gray-300" />

            <button
              onClick={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
                toast.success('Calendar refreshed');
              }}
              disabled={refreshing}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
            >
              <i className={`fas fa-sync mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow p-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
            <i className="fas fa-chevron-left" />
          </button>
          <h2 className="text-xl font-semibold">{title()}</h2>
          <button onClick={() => navigate(1)} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
            <i className="fas fa-chevron-right" />
          </button>
        </div>

        {/* ─── Month View ─── */}
        {view === 'month' && (() => {
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
          return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">{d}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`e-${i}`} className="bg-white p-2 min-h-[100px]" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayEvents = getEventsFor(date);
                const isToday = isSameDay(date, today);
                const isExpanded = expandedDates.has(dateKey(date));
                const limit = EVENTS_PER_DAY_LIMIT;
                const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, limit);
                const hasMore = dayEvents.length > limit;
                return (
                  <div key={day} className={`bg-white p-2 min-h-[100px] ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{day}</div>
                    <div className="space-y-0.5">
                      {visibleEvents.map((e) => <EventPill key={e.id} ev={e} />)}
                      {hasMore && (
                        <button
                          onClick={() => toggleExpand(date)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer w-full text-left px-1"
                        >
                          {isExpanded
                            ? `Show less`
                            : `+${dayEvents.length - limit} more`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ─── Week View ─── */}
        {view === 'week' && (() => {
          const weekStart = startOfWeek(currentDate);
          const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
              {days.map((d) => (
                <div key={d.toISOString()} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-600">
                  {WEEKDAY_LABELS[d.getDay()]} {d.getDate()}
                </div>
              ))}
              {days.map((d) => {
                const dayEvents = getEventsFor(d);
                const isToday = isSameDay(d, today);
                return (
                  <div key={d.toISOString() + '-body'} className={`bg-white p-2 min-h-[200px] ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}>
                    <div className="space-y-1">
                      {dayEvents.map((e) => (
                        <div key={e.id}>
                          <EventPill ev={e} compact />
                        </div>
                      ))}
                      {dayEvents.length === 0 && <p className="text-xs text-gray-300 text-center pt-4">No events</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ─── Day View ─── */}
        {view === 'day' && (() => {
          const dayEvents = getEventsFor(currentDate);
          return (
            <div className="space-y-2">
              {dayEvents.length === 0 && <p className="text-center text-gray-400 py-8">No events for this day</p>}
              {dayEvents.map((e) => {
                const icon = e.isPseudo ? STATUS_ICONS.PSEUDO : (STATUS_ICONS[e.status] || 'fa-circle');
                return (
                  <button
                    key={e.id}
                    onClick={() => handleEventClick(e)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-1 h-10 rounded" style={{ backgroundColor: getEventColor(e) }} />
                    <i className={`fas ${icon}`} style={{ color: getEventColor(e) }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {e.schedule?.name || e.scheduleName || `Game #${e.id}`}
                        {e.orderIndex ? ` - Game ${e.orderIndex}` : ''}
                        {e.isPseudo && <span className="text-gray-400 ml-1">(scheduled)</span>}
                        {e.isExclusiveToGold && <span className="ml-1 text-yellow-600"><i className="fas fa-crown text-xs" /> Gold</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatHM(e.scheduledStartTime)} - {e.status}
                        {e.teamAName && e.teamBName && ` | ${e.teamAName} vs ${e.teamBName}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{e.isPseudo ? '-' : `${e.slotsReserved || 0}/${e.totalSlots || '?'} slots`}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* ─── List View ─── */}
        {view === 'list' && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Schedule</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Slots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEventClick(e)}>
                    <td className="px-3 py-2">{new Date(e.scheduledStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-3 py-2">{formatHM(e.scheduledStartTime)}</td>
                    <td className="px-3 py-2">
                      <i className={`fas ${e.isPseudo ? STATUS_ICONS.PSEUDO : (STATUS_ICONS[e.status] || 'fa-circle')} mr-1`} style={{ color: getEventColor(e), fontSize: 10 }} />
                      {e.schedule?.name || e.scheduleName || `Game #${e.id}`}
                      {e.isPseudo && <span className="text-gray-400 ml-1">(scheduled)</span>}
                      {e.isExclusiveToGold && <i className="fas fa-crown text-yellow-500 text-xs ml-1" />}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BG[e.status] || 'bg-gray-100 text-gray-500'}`}>
                        {e.isPseudo ? 'SCHEDULED' : e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{e.isPseudo ? '-' : `${e.slotsReserved || 0}/${e.totalSlots || '?'}`}</td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">No events in this period</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Game Detail Dialog ═══ */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} title="Game Details" className="max-w-2xl">
        {detail && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Basic Info</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 font-medium w-1/3">ID</td><td>{detail.id}</td></tr>
                <tr><td className="py-2 font-medium">Schedule</td><td>{detail.schedule?.name || detail.scheduleName || 'N/A'}</td></tr>
                <tr>
                  <td className="py-2 font-medium">Status</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BG[detail.status] || ''}`}>{detail.status}</span></td>
                </tr>
                <tr><td className="py-2 font-medium">Scheduled Start</td><td>{formatDate(detail.scheduledStartTime)}</td></tr>
                <tr><td className="py-2 font-medium">Actual Start</td><td>{detail.actualStartTime ? formatDate(detail.actualStartTime) : 'N/A'}</td></tr>
                <tr><td className="py-2 font-medium">Actual End</td><td>{detail.actualEndTime ? formatDate(detail.actualEndTime) : 'N/A'}</td></tr>
                <tr><td className="py-2 font-medium">Gold Exclusive</td><td>{detail.isExclusiveToGold ? 'Yes' : 'No'}</td></tr>
                <tr><td className="py-2 font-medium">Order Index</td><td>Game {detail.orderIndex || 1}</td></tr>
              </tbody>
            </table>

            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Slots Info</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-blue-50 rounded text-center text-sm">
                <div className="font-medium">{detail.totalSlots ?? (detail.slots ? detail.slots.length : 0)}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded text-center text-sm">
                <div className="font-medium">{detail.slotsReserved ?? (detail.slots ? detail.slots.filter((s) => s.isReserved).length : 0)}</div>
                <div className="text-xs text-gray-500">Reserved</div>
              </div>
              <div className="p-2 bg-green-50 rounded text-center text-sm">
                <div className="font-medium">{detail.slotsConfirmed ?? (detail.reservations ? detail.reservations.filter((r) => r.status === 'CONFIRMED').length : 0)}</div>
                <div className="text-xs text-gray-500">Confirmed</div>
              </div>
              <div className="p-2 bg-gray-50 rounded text-center text-sm">
                <div className="font-medium">
                  {detail.slotsAvailable ?? (() => {
                    const total = detail.totalSlots ?? (detail.slots ? detail.slots.length : 0);
                    const reserved = detail.slotsReserved ?? (detail.slots ? detail.slots.filter((s) => s.isReserved).length : 0);
                    return total - reserved;
                  })()}
                </div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
            </div>

            {detail.reservations && detail.reservations.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Reservations</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 py-1.5 text-left">User</th>
                        <th className="px-2 py-1.5 text-left">Slot</th>
                        <th className="px-2 py-1.5 text-left">Status</th>
                        <th className="px-2 py-1.5 text-left">Reserved At</th>
                        <th className="px-2 py-1.5 text-left">Confirmed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.reservations.map((r) => (
                        <tr key={r.id}>
                          <td className="px-2 py-1.5">{r.user?.email || `User #${r.userId}`}</td>
                          <td className="px-2 py-1.5">Slot {r.slot?.slotNumber || r.id}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700'
                                : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                                : r.status === 'EXPIRED' ? 'bg-gray-100 text-gray-500'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">{r.reservedAt ? formatDate(r.reservedAt) : 'N/A'}</td>
                          <td className="px-2 py-1.5">{r.confirmedAt ? formatDate(r.confirmedAt) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No reservations</p>
            )}

            <div className="flex justify-end">
              <a href={`/admin/games?gameId=${detail.id}`} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                View Full Game Details
              </a>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Generate Game Dialog ═══ */}
      <Dialog open={generateDialog !== null} onClose={() => setGenerateDialog(null)} title="Generate Games">
        {generateDialog && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This is a scheduled (pseudo) event for <strong>{generateDialog.date}</strong>. Would you like to generate actual games for this schedule?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGenerateDialog(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleGenerate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">Generate Games</button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={confirmAction !== null} title={confirmAction?.title || ''} message={confirmAction?.message || ''} onConfirm={() => confirmAction?.onConfirm()} onCancel={() => setConfirmAction(null)} />
    </div>
  );
}
