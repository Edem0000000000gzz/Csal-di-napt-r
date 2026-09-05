import React, { useState } from 'react';
import { CalendarEvent, ParentShift, FamilyMemberId } from '../types';
import { FAMILY_MEMBERS, CATEGORIES, getMemberName } from '../data/defaultData';
import {
  getMonthCalendarGrid,
  HUNGARIAN_MONTHS,
  HUNGARIAN_DAYS_MON_FIRST,
  getTodayIso,
  formatToHungarianDate,
} from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  FileText,
  Users,
  Wand2,
} from 'lucide-react';

interface MonthlyViewProps {
  currentDate: Date;
  onChangeMonth: (newDate: Date) => void;
  onJumpToToday: () => void;
  events: CalendarEvent[];
  shifts: ParentShift[];
  selectedMember?: FamilyMemberId;
  memberNames?: Record<string, string>;
  onUpdateMemberName?: (memberId: FamilyMemberId | string, newName: string) => void;
  onOpenEventModal: (date: string, event?: CalendarEvent, memberId?: FamilyMemberId) => void;
  onOpenShiftModal: (date: string, parent?: 'apa' | 'anya', mode?: 'day' | 'week') => void;
  onDeleteEvent?: (eventId: string) => void;
  onToggleEventCompleted?: (eventId: string) => void;
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({
  currentDate,
  onChangeMonth,
  onJumpToToday,
  events,
  shifts,
  memberNames,
  onUpdateMemberName,
  onOpenEventModal,
  onOpenShiftModal,
  onDeleteEvent,
  onToggleEventCompleted,
}) => {
  const [dayDetailsModalIso, setDayDetailsModalIso] = useState<string | null>(null);
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const grid = getMonthCalendarGrid(year, monthIndex);
  const todayIso = getTodayIso();

  const handlePrevMonth = () => {
    const d = new Date(year, monthIndex - 1, 1);
    onChangeMonth(d);
  };

  const handleNextMonth = () => {
    const d = new Date(year, monthIndex + 1, 1);
    onChangeMonth(d);
  };

  // Events & shifts for the day detail modal
  const modalDayEvents = dayDetailsModalIso
    ? events.filter((e) => e.date === dayDetailsModalIso).sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      })
    : [];

  const modalDayShifts = dayDetailsModalIso
    ? {
        apa: shifts.find((s) => s.date === dayDetailsModalIso && s.memberId === 'apa'),
        anya: shifts.find((s) => s.date === dayDetailsModalIso && s.memberId === 'anya'),
      }
    : { apa: undefined, anya: undefined };

  return (
    <div className="space-y-4">
      {/* Month Navigation & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>
              {year}. {HUNGARIAN_MONTHS[monthIndex]}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={onJumpToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer shadow-xs"
          >
            Ma
          </button>
          <div className="flex items-center border border-slate-700/80 rounded-xl overflow-hidden bg-slate-800 shadow-xs">
            <button
              onClick={handlePrevMonth}
              aria-label="Előző hónap"
              className="p-1.5 px-2 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-700" />
            <button
              onClick={handleNextMonth}
              aria-label="Következő hónap"
              className="p-1.5 px-2 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Family Colors Legend Bar with In-place Name Editing */}
      <div className="p-2 sm:p-2.5 px-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs shadow-xs">
        <span className="font-semibold text-slate-400 flex items-center gap-1 shrink-0">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Színek & Nevek:</span>
        </span>
        {FAMILY_MEMBERS.map((m, idx) => {
          const val = memberNames?.[m.id] ?? '';
          return (
            <div
              key={m.id}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-xl px-2 py-1 transition group shadow-2xs"
              title="Kattints a név beírásához"
            >
              <span
                className="w-3 h-3 rounded-full shadow-xs shrink-0"
                style={{ backgroundColor: m.color }}
              />
              <input
                type="text"
                value={val}
                onChange={(e) => onUpdateMemberName?.(m.id, e.target.value)}
                className="bg-slate-900/90 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 border border-slate-700/80 rounded px-2 py-0.5 w-20 sm:w-28 transition"
                placeholder={`${idx + 1}. Név...`}
              />
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/70 rounded-xl px-2.5 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs shrink-0" />
          <span className="text-slate-300 text-xs font-semibold">Család</span>
        </div>
        <span className="text-[11px] text-slate-400 ml-auto hidden lg:inline">
          (A színes pöttyök melletti mezőkbe írd be a családtagok nevét)
        </span>
      </div>

      {/* Full-width 7-column Calendar */}
      <div className="w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-1.5 sm:p-3 overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {HUNGARIAN_DAYS_MON_FIRST.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-1.5 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {grid.map((cell) => {
            const isToday = cell.isToday;

            // Apa & Anya shift on this day
            const apaShift = shifts.find((s) => s.date === cell.iso && s.memberId === 'apa');
            const anyaShift = shifts.find((s) => s.date === cell.iso && s.memberId === 'anya');

            const hasApaShift = apaShift && !apaShift.isOffDay;
            const hasAnyaShift = anyaShift && !anyaShift.isOffDay;
            const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;

            // All family events on this day
            const dayEvents = events.filter((e) => e.date === cell.iso);

            // Group events by family member so colors represent WHO has tasks
            const memberGroups = ([
              { id: 'all' as const, name: getMemberName('all', memberNames), color: '#6366f1', count: dayEvents.filter((e) => e.memberId === 'all').length },
              { id: 'apa' as const, name: getMemberName('apa', memberNames) || '1. Tag', color: '#0284c7', count: dayEvents.filter((e) => e.memberId === 'apa').length },
              { id: 'anya' as const, name: getMemberName('anya', memberNames) || '2. Tag', color: '#e11d48', count: dayEvents.filter((e) => e.memberId === 'anya').length },
              { id: 'amira' as const, name: getMemberName('amira', memberNames) || '3. Tag', color: '#8b5cf6', count: dayEvents.filter((e) => e.memberId === 'amira').length },
              { id: 'donat' as const, name: getMemberName('donat', memberNames) || '4. Tag', color: '#059669', count: dayEvents.filter((e) => e.memberId === 'donat').length },
              { id: 'hella' as const, name: getMemberName('hella', memberNames) || '5. Tag', color: '#d97706', count: dayEvents.filter((e) => e.memberId === 'hella').length },
            ] as { id: FamilyMemberId; name: string; color: string; count: number }[]).filter((g) => g.count > 0);

            const hasAnything = hasApaShift || hasAnyaShift || dayEvents.length > 0;

            return (
              <div
                key={cell.iso}
                onClick={() => setDayDetailsModalIso(cell.iso)}
                className={`min-h-[92px] sm:min-h-[110px] p-1 sm:p-1.5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                  isToday
                    ? 'border-indigo-400 bg-slate-850 shadow-md ring-1 ring-indigo-400/50'
                    : cell.isCurrentMonth
                    ? 'border-slate-800/90 bg-slate-900/90 hover:border-slate-600 hover:bg-slate-800/70'
                    : 'border-slate-850/50 bg-slate-950/40 opacity-35'
                }`}
              >
                <div>
                  {/* Top row: Day number & Quick indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold leading-none ${
                        isToday
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[11px] sm:text-xs shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Quick + button directly on cell hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEventModal(cell.iso);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white transition cursor-pointer shadow-2xs"
                        title="Új esemény hozzáadása erre a napra"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* If there are items on this day, show a small counter or pulse dot */}
                      {hasAnything && (
                        <span className="text-[9px] font-bold text-slate-400 px-1 py-0.2 rounded bg-slate-800 border border-slate-700/60 hidden sm:inline">
                          {dayEvents.length > 0 ? `${dayEvents.length} esemény` : 'Munkanap'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Parental Shifts Mini Badges */}
                  <div className="mt-1 space-y-0.5">
                    {!isWeekend && hasApaShift && (
                      <div
                        className="flex items-center gap-0.5 text-[8px] sm:text-[9px] px-1 py-0.2 sm:py-0.5 rounded font-bold bg-sky-950 text-sky-200 border border-sky-800/70 truncate shadow-2xs"
                        title={`${getMemberName('apa', memberNames) || 'Apa'} munkaidő: ${apaShift.startTime || '07:00'} - ${apaShift.endTime || '15:00'}${apaShift.note ? ` (${apaShift.note})` : ''}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span className="truncate">
                          {getMemberName('apa', memberNames) || 'Apa'}: {apaShift.startTime && apaShift.endTime ? `${apaShift.startTime.slice(0, 5)}-${apaShift.endTime.slice(0, 5)}` : (apaShift.shiftType || '07:00-15:00')}
                        </span>
                      </div>
                    )}
                    {!isWeekend && apaShift && apaShift.isOffDay && (
                      <div
                        className="flex items-center gap-0.5 text-[8px] sm:text-[9px] px-1 py-0.2 sm:py-0.5 rounded font-semibold bg-slate-800 text-sky-300 border border-slate-700 truncate shadow-2xs"
                        title={`${getMemberName('apa', memberNames) || 'Apa'}: Szabadnap / Pihenő`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400/50 shrink-0" />
                        <span className="truncate">{getMemberName('apa', memberNames) || 'Apa'}: Szabadnap</span>
                      </div>
                    )}

                    {hasAnyaShift && (
                      <div
                        className="flex items-center gap-0.5 text-[8px] sm:text-[9px] px-1 py-0.2 sm:py-0.5 rounded font-bold bg-rose-950 text-rose-200 border border-rose-800/70 truncate shadow-2xs"
                        title={`${getMemberName('anya', memberNames) || 'Anya'} munkaidő: ${anyaShift.startTime || '06:00'} - ${anyaShift.endTime || '18:00'}${anyaShift.note ? ` (${anyaShift.note})` : ''}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        <span className="truncate">
                          {getMemberName('anya', memberNames) || 'Anya'}: {anyaShift.startTime && anyaShift.endTime ? `${anyaShift.startTime.slice(0, 5)}-${anyaShift.endTime.slice(0, 5)}` : (anyaShift.shiftType || '06:00-18:00')}
                        </span>
                      </div>
                    )}
                    {anyaShift && anyaShift.isOffDay && (
                      <div
                        className="flex items-center gap-0.5 text-[8px] sm:text-[9px] px-1 py-0.2 sm:py-0.5 rounded font-semibold bg-slate-800 text-rose-300 border border-slate-700 truncate shadow-2xs"
                        title={`${getMemberName('anya', memberNames) || 'Anya'}: Szabadnap / Pihenő`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400/50 shrink-0" />
                        <span className="truncate">{getMemberName('anya', memberNames) || 'Anya'}: Szabadnap</span>
                      </div>
                    )}
                  </div>

                  {/* Member Color Badges representing who has tasks on this day */}
                  {memberGroups.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {memberGroups.map((g) => (
                        <div
                          key={g.id}
                          className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold text-white shadow-2xs truncate max-w-full"
                          style={{ backgroundColor: g.color }}
                          title={`${g.name}: ${g.count} program / teendő`}
                        >
                          <span className="truncate">{g.name}</span>
                          {g.count > 1 && (
                            <span className="opacity-90 font-extrabold text-[7px] sm:text-[8px]">
                              {g.count}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom hint on hover: Olvasás */}
                <div className="mt-1 pt-0.5 text-[8px] text-indigo-300 opacity-0 group-hover:opacity-100 transition flex items-center justify-between">
                  <span>Részletek</span>
                  <span>&rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal: READ, VIEW & MANAGE */}
      {dayDetailsModalIso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-850 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Napi részletek és olvasó nézet
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {formatToHungarianDate(dayDetailsModalIso)}
                </h3>
              </div>
              <button
                onClick={() => setDayDetailsModalIso(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Bezárás"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Parental Shifts Section */}
              <div className="p-3 sm:p-3.5 bg-slate-850/90 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    Szülői munkaidő ezen a napon:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Apa */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-sky-900/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-sky-300 text-xs block truncate">{getMemberName('apa', memberNames) || 'Apa'}</span>
                        <span className="text-slate-300 text-xs block truncate">
                          {modalDayShifts.apa
                            ? modalDayShifts.apa.isOffDay
                              ? 'Szabadnap / Pihenőnap'
                              : `${modalDayShifts.apa.startTime || '07:00'} - ${modalDayShifts.apa.endTime || '15:00'}${modalDayShifts.apa.note ? ` (${modalDayShifts.apa.note})` : ''}`
                            : 'Nincs külön rögzítve (07:00 - 15:00)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const date = dayDetailsModalIso;
                        setDayDetailsModalIso(null);
                        onOpenShiftModal(date, 'apa');
                      }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Módosítás</span>
                    </button>
                  </div>

                  {/* Anya */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-rose-300 text-xs block truncate">{getMemberName('anya', memberNames) || 'Anya'}</span>
                        <span className="text-slate-300 text-xs block truncate">
                          {modalDayShifts.anya
                            ? modalDayShifts.anya.isOffDay
                              ? 'Szabadnap / Pihenőnap'
                              : `${modalDayShifts.anya.startTime || '06:00'} - ${modalDayShifts.anya.endTime || '18:00'}${modalDayShifts.anya.note ? ` (${modalDayShifts.anya.note})` : ''}`
                            : 'Nincs külön rögzítve (06:00 - 18:00)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const date = dayDetailsModalIso;
                        setDayDetailsModalIso(null);
                        onOpenShiftModal(date, 'anya');
                      }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Módosítás</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Member Shortcuts for adding multiple events for any of the 5 family members */}
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Új esemény hozzáadása családtaghoz (mind az 5 tagnak külön):</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {FAMILY_MEMBERS.map((m) => {
                    const name = getMemberName(m.id, memberNames, true);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const date = dayDetailsModalIso;
                          setDayDetailsModalIso(null);
                          onOpenEventModal(date, undefined, m.id);
                        }}
                        className="py-1.5 px-2 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1 shadow-xs cursor-pointer hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: m.color }}
                        title={`${name} eseményének beírása`}
                      >
                        <span>+ {name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const date = dayDetailsModalIso;
                      setDayDetailsModalIso(null);
                      onOpenEventModal(date, undefined, 'all');
                    }}
                    className="py-1.5 px-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    title="Családi közös program"
                  >
                    <span>+ Mindenki</span>
                  </button>
                </div>
              </div>

              {/* Family Events & Tasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Programok és feladatok ({modalDayEvents.length})
                  </span>
                  <button
                    onClick={() => {
                      const date = dayDetailsModalIso;
                      setDayDetailsModalIso(null);
                      onOpenEventModal(date);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Új esemény
                  </button>
                </div>

                {modalDayEvents.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-850/40 text-slate-400 space-y-2">
                    <Calendar className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
                    <p className="text-sm font-semibold text-slate-300">
                      Ezen a napon még nincs rögzítve esemény.
                    </p>
                    <p className="text-xs text-slate-400">
                      Kattints az alábbi gombra új családi program vagy teendő felvételéhez!
                    </p>
                    <button
                      onClick={() => {
                        const date = dayDetailsModalIso;
                        setDayDetailsModalIso(null);
                        onOpenEventModal(date);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Új esemény hozzáadása
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {modalDayEvents.map((ev) => {
                      const member = FAMILY_MEMBERS.find((m) => m.id === ev.memberId);
                      const cat = CATEGORIES[ev.category] || CATEGORIES.other;

                      return (
                        <div
                          key={ev.id}
                          className={`p-3.5 rounded-2xl border transition shadow-sm space-y-2 ${
                            ev.isCompleted
                              ? 'border-slate-800 bg-slate-900/60 opacity-65'
                              : 'border-slate-750 bg-slate-850/90'
                          }`}
                        >
                          {/* Card Top: Who + Category + Time */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              {/* Member Badge with distinct color */}
                              {ev.memberId === 'all' ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
                                  {getMemberName('all', memberNames)} (Mindenki)
                                </span>
                              ) : member ? (
                                <span
                                  className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: member.color }}
                                >
                                  {getMemberName(ev.memberId, memberNames)}
                                </span>
                              ) : null}

                              {/* Category Name */}
                              <span className="text-[11px] font-semibold text-slate-400">
                                {cat.name}
                              </span>
                            </div>

                            {/* Time */}
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {ev.isAllDay ? 'Egész nap' : `${ev.startTime || ''} - ${ev.endTime || ''}`}
                            </span>
                          </div>

                          {/* Card Middle: Title (Large & readable) */}
                          <div className="flex items-start gap-2.5">
                            {onToggleEventCompleted && (
                              <button
                                type="button"
                                onClick={() => onToggleEventCompleted(ev.id)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                                title={ev.isCompleted ? 'Megjelölés nem elvégzettként' : 'Késznek jelölés'}
                              >
                                {ev.isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                                )}
                              </button>
                            )}

                            <div className="flex-1">
                              <h4
                                className={`text-sm sm:text-base font-bold leading-snug ${
                                  ev.isCompleted ? 'line-through text-slate-400' : 'text-white'
                                }`}
                              >
                                {ev.title}
                              </h4>

                              {ev.location && (
                                <div className="mt-1 text-xs text-slate-300 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="font-medium">{ev.location}</span>
                                </div>
                              )}

                              {(ev.notes || (ev as any).description) && (
                                <div className="mt-2 text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-2.5 rounded-xl border border-slate-750 flex items-start gap-2 shadow-inner">
                                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-indigo-300 text-[11px] block mb-0.5">
                                      Jegyzetek & Fontos részletek:
                                    </span>
                                    <p className="whitespace-pre-wrap break-words text-slate-200 text-xs">
                                      {ev.notes || (ev as any).description}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Actions: Szerkesztés & Törlés */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => {
                                const date = dayDetailsModalIso;
                                setDayDetailsModalIso(null);
                                onOpenEventModal(date, ev);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-slate-700 transition cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Szerkesztés</span>
                            </button>

                            {onDeleteEvent && (
                              <button
                                type="button"
                                onClick={() => onDeleteEvent(ev.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-rose-800/60 transition cursor-pointer active:scale-95"
                                title="Tevékenység törlése"
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Törlés</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-850 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const date = dayDetailsModalIso;
                    setDayDetailsModalIso(null);
                    onOpenEventModal(date);
                  }}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Új esemény</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const date = dayDetailsModalIso;
                    setDayDetailsModalIso(null);
                    onOpenShiftModal(date, undefined, 'week');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
                  title="Ezen hét szülői munkaidejének gyors kitöltése"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ Hét gyorskitöltése</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDayDetailsModalIso(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
