import React from 'react';
import { CalendarEvent, ParentShift, FamilyMemberId } from '../types';
import { FAMILY_MEMBERS, CATEGORIES, getMemberName } from '../data/defaultData';
import { getWeekDays, getTodayIso, formatIso } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Clock,
  MapPin,
  Bell,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface WeeklyViewProps {
  currentMonday: Date;
  onChangeWeek: (newMonday: Date) => void;
  onJumpToToday: () => void;
  events: CalendarEvent[];
  shifts: ParentShift[];
  selectedMember: FamilyMemberId;
  onOpenEventModal: (date: string, event?: CalendarEvent) => void;
  onOpenShiftModal: (date: string, parent?: 'apa' | 'anya') => void;
  onToggleEventCompleted: (eventId: string) => void;
  memberNames?: Record<string, string>;
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  currentMonday,
  onChangeWeek,
  onJumpToToday,
  events,
  shifts,
  selectedMember,
  onOpenEventModal,
  onOpenShiftModal,
  onToggleEventCompleted,
  memberNames,
}) => {
  const weekDays = getWeekDays(currentMonday);
  const todayIso = getTodayIso();

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    onChangeWeek(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    onChangeWeek(next);
  };

  const isCurrentWeek = weekDays.some((d) => d.iso === todayIso);

  return (
    <div className="space-y-4">
      {/* Week Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>
              {weekDays[0].date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })} –{' '}
              {weekDays[6].date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </h2>
          {isCurrentWeek && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
              Aktuális hét
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {!isCurrentWeek && (
            <button
              onClick={onJumpToToday}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer shadow-xs"
            >
              Ma
            </button>
          )}
          <div className="flex items-center border border-slate-700/80 rounded-xl overflow-hidden bg-slate-800 shadow-xs">
            <button
              onClick={handlePrevWeek}
              aria-label="Előző hét"
              className="p-1.5 px-2 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-700" />
            <button
              onClick={handleNextWeek}
              aria-label="Következő hét"
              className="p-1.5 px-2 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Vertical / Grid Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const isToday = day.iso === todayIso;

          // Shifts for parents on this day
          const apaShift = shifts.find((s) => s.date === day.iso && s.memberId === 'apa');
          const anyaShift = shifts.find((s) => s.date === day.iso && s.memberId === 'anya');

          // Events for this day
          const dayEvents = events.filter((e) => {
            if (e.date !== day.iso) return false;
            if (selectedMember !== 'all' && e.memberId !== selectedMember && e.memberId !== 'all') {
              return false;
            }
            return true;
          }).sort((a, b) => {
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;
            return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
          });

          return (
            <div
              key={day.iso}
              className={`flex flex-col rounded-2xl border transition-all overflow-hidden ${
                isToday
                  ? 'border-indigo-500/70 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-900/80 shadow-md'
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b flex items-center justify-between ${
                  isToday
                    ? 'border-indigo-900/60 bg-indigo-950/50'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {day.dayName}
                    </span>
                    {isToday && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {day.dayNumber}.
                  </div>
                </div>

                <button
                  onClick={() => onOpenEventModal(day.iso)}
                  title="Új esemény hozzáadása erre a napra"
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700/60 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Parents Shift Widget for this day ("szülői munkaidő") */}
              <div className="p-2.5 border-b border-slate-800/80 bg-slate-850/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Briefcase className="w-2.5 h-2.5 text-indigo-400" />
                    Munkaidő:
                  </span>
                </div>

                {/* Apa shift pill */}
                <div
                  onClick={() => onOpenShiftModal(day.iso, 'apa')}
                  className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg border cursor-pointer hover:border-sky-500 transition shadow-2xs ${
                    apaShift
                      ? 'bg-sky-950/60 border-sky-900/80 text-sky-200'
                      : 'bg-slate-800/40 border-dashed border-slate-700/80 text-slate-400 hover:text-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${apaShift ? 'bg-sky-400' : 'bg-slate-600'}`} />
                    <span className="truncate">{getMemberName('apa', memberNames) || 'Apa'}:</span>
                  </div>
                  <span className="font-bold text-[10px] shrink-0 ml-1">
                    {apaShift
                      ? apaShift.isOffDay
                        ? 'Szabadnap'
                        : `${apaShift.startTime || '07:00'} - ${apaShift.endTime || '15:00'}${apaShift.note ? ` (${apaShift.note})` : ''}`
                      : 'Nincs rögzítve'}
                  </span>
                </div>

                {/* Anya shift pill */}
                <div
                  onClick={() => onOpenShiftModal(day.iso, 'anya')}
                  className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg border cursor-pointer hover:border-rose-500 transition shadow-2xs ${
                    anyaShift
                      ? 'bg-rose-950/60 border-rose-900/80 text-rose-200'
                      : 'bg-slate-800/40 border-dashed border-slate-700/80 text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${anyaShift ? 'bg-rose-400' : 'bg-slate-600'}`} />
                    <span className="truncate">{getMemberName('anya', memberNames) || 'Anya'}:</span>
                  </div>
                  <span className="font-bold text-[10px] shrink-0 ml-1">
                    {anyaShift
                      ? anyaShift.isOffDay
                        ? 'Szabadnap'
                        : `${anyaShift.startTime || '06:00'} - ${anyaShift.endTime || '18:00'}${anyaShift.note ? ` (${anyaShift.note})` : ''}`
                      : 'Nincs rögzítve'}
                  </span>
                </div>
              </div>

              {/* Day Events Container */}
              <div className="p-2.5 space-y-2 flex-1 min-h-[140px]">
                {dayEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-600">
                    <Sparkles className="w-4 h-4 mb-1 opacity-40 text-slate-500" />
                    <span className="text-[11px] font-medium text-slate-500">Nincs egyéb teendő</span>
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const member = FAMILY_MEMBERS.find((m) => m.id === event.memberId);
                    const category = CATEGORIES[event.category] || CATEGORIES.other;

                    return (
                      <div
                        key={event.id}
                        className={`group relative rounded-xl p-2.5 border transition-all text-left shadow-xs hover:border-slate-600 cursor-pointer ${
                          event.isCompleted
                            ? 'opacity-60 bg-slate-900/40 border-slate-800'
                            : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-800'
                        }`}
                        onClick={() => onOpenEventModal(day.iso, event)}
                      >
                        {/* Member & Category Header */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {event.memberId === 'all' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 text-slate-200 border border-slate-600">
                                {getMemberName('all', memberNames)}
                              </span>
                            ) : member ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs"
                                style={{ backgroundColor: member.color }}
                              >
                                {getMemberName(event.memberId, memberNames) || 'Családtag'}
                              </span>
                            ) : null}

                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: category.color }}
                              title={category.name}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleEventCompleted(event.id);
                            }}
                            className="text-slate-400 hover:text-emerald-400 transition cursor-pointer p-0.5"
                            title={event.isCompleted ? 'Megjelölés folyamatban lévőként' : 'Késznek jelölés'}
                          >
                            {event.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Title */}
                        <div
                          className={`text-xs font-bold leading-snug line-clamp-2 ${
                            event.isCompleted
                              ? 'line-through text-slate-500'
                              : 'text-white'
                          }`}
                        >
                          {event.title}
                        </div>

                        {/* Time & Location */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5 font-semibold text-slate-300">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            {event.isAllDay
                              ? 'Egész nap'
                              : `${event.startTime || ''}${event.endTime ? ` - ${event.endTime}` : ''}`}
                          </span>

                          {event.location && (
                            <span className="flex items-center gap-0.5 truncate max-w-[90px]">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {event.location}
                            </span>
                          )}

                          {event.reminder !== 'none' && (
                            <span className="flex items-center text-amber-400 font-semibold" title="Emlékeztető beállítva">
                              <Bell className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {event.notes && (
                          <p className="mt-1 text-[10px] text-slate-400 line-clamp-1 italic">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
