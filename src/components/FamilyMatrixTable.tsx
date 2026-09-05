import React from 'react';
import { CalendarEvent, ParentShift, FamilyMemberId } from '../types';
import { FAMILY_MEMBERS, CATEGORIES, getMemberName, getMemberInitial } from '../data/defaultData';
import { getWeekDays, getTodayIso } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  Table as TableIcon,
} from 'lucide-react';

interface FamilyMatrixTableProps {
  currentMonday: Date;
  onChangeWeek: (newMonday: Date) => void;
  onJumpToToday: () => void;
  events: CalendarEvent[];
  shifts: ParentShift[];
  onOpenEventModal: (date: string, event?: CalendarEvent) => void;
  onOpenShiftModal: (date: string, parent?: 'apa' | 'anya') => void;
  memberNames?: Record<string, string>;
}

export const FamilyMatrixTable: React.FC<FamilyMatrixTableProps> = ({
  currentMonday,
  onChangeWeek,
  onJumpToToday,
  events,
  shifts,
  onOpenEventModal,
  onOpenShiftModal,
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

  return (
    <div className="space-y-4">
      {/* Top Controller */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-indigo-400" />
            <span>Családi Heti Beosztás Mátrix</span>
          </h2>
          <p className="text-xs text-slate-400">
            {weekDays[0].date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', year: 'numeric' })} • Áttekinthető táblázat a család 5 tagjának
          </p>
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

      {/* Responsive Table Container */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850">
                <th className="py-3 px-3 w-36 font-bold text-xs text-slate-300 uppercase tracking-wider">
                  Nap / Dátum
                </th>
                {FAMILY_MEMBERS.map((member) => {
                  const currentName = getMemberName(member.id, memberNames, true);
                  const initial = getMemberInitial(member.id, memberNames);
                  return (
                    <th
                      key={member.id}
                      className="py-3 px-3 font-bold text-xs border-l border-slate-800"
                      style={{ borderTop: `3px solid ${member.color}` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: member.color }}
                        >
                          {initial}
                        </div>
                        <span className="text-white">{currentName}</span>
                        {member.role === 'szulo' && (
                          <span className="text-[10px] font-normal text-slate-400">
                            ({member.id === 'apa' ? '07-15' : '06-18'})
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {weekDays.map((day) => {
                const isToday = day.iso === todayIso;

                // Joint events for whole family on this day
                const jointEvents = events.filter((e) => e.date === day.iso && e.memberId === 'all');

                return (
                  <tr
                    key={day.iso}
                    className={`${
                      isToday
                        ? 'bg-indigo-950/25'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Day Column */}
                    <td className="py-3 px-3 align-top bg-slate-900/80">
                      <div className="flex items-center gap-1 font-bold text-slate-200">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                        <span>{day.dayName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {day.iso}
                      </div>
                      <button
                        onClick={() => onOpenEventModal(day.iso)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Bejegyzés
                      </button>

                      {jointEvents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {jointEvents.map((je) => (
                            <div
                              key={je.id}
                              onClick={() => onOpenEventModal(day.iso, je)}
                              className="p-1.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-[10px] text-amber-200 font-semibold cursor-pointer hover:border-amber-600 shadow-2xs"
                              title="Egész család program"
                            >
                              👨‍👩‍👧‍👦 {je.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Member Columns: Apa, Anya, Amira, Donát, Hella */}
                    {FAMILY_MEMBERS.map((member) => {
                      const memberEvents = events.filter(
                        (e) => e.date === day.iso && e.memberId === member.id
                      );
                      const shift = shifts.find(
                        (s) => s.date === day.iso && s.memberId === member.id
                      );

                      return (
                        <td
                          key={member.id}
                          className="py-2.5 px-2.5 align-top border-l border-slate-800"
                        >
                          <div className="space-y-1.5 min-h-[60px]">
                            {/* Shift badge for parents */}
                            {member.role === 'szulo' && (
                              shift ? (
                                <div
                                  onClick={() => onOpenShiftModal(day.iso, member.id as 'apa' | 'anya')}
                                  className={`p-1.5 rounded-xl border text-[11px] cursor-pointer hover:opacity-90 transition shadow-2xs ${
                                    member.id === 'apa'
                                      ? 'bg-sky-950/60 border-sky-900/80 text-sky-200'
                                      : 'bg-rose-950/60 border-rose-900/80 text-rose-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold text-[10px] mb-0.5">
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="w-2.5 h-2.5" />
                                      Munkaidő
                                    </span>
                                    <span>{shift.isOffDay ? 'Szabadnap' : 'Munkanap'}</span>
                                  </div>
                                  <div className="font-semibold text-[11px]">
                                    {shift.isOffDay
                                      ? 'Szabadnap'
                                      : `${shift.startTime || (member.id === 'apa' ? '07:00' : '06:00')} - ${shift.endTime || (member.id === 'apa' ? '15:00' : '18:00')}`}
                                  </div>
                                  {shift.note && (
                                    <div className="text-[9px] opacity-80 italic truncate">
                                      {shift.note}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div
                                  onClick={() => onOpenShiftModal(day.iso, member.id as 'apa' | 'anya')}
                                  className="p-1 rounded-lg border border-dashed border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-500 text-[10px] text-center cursor-pointer transition"
                                >
                                  + Munkaidő
                                </div>
                              )
                            )}

                            {/* Member's individual events */}
                            {memberEvents.map((event) => {
                              const cat = CATEGORIES[event.category] || CATEGORIES.other;
                              return (
                                <div
                                  key={event.id}
                                  onClick={() => onOpenEventModal(day.iso, event)}
                                  className="p-1.5 rounded-xl border border-slate-800 bg-slate-800/80 hover:border-slate-700 hover:bg-slate-800 transition cursor-pointer shadow-xs"
                                >
                                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 mb-0.5 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      {event.isAllDay ? 'Egész nap' : event.startTime}
                                    </span>
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shadow-xs"
                                      style={{ backgroundColor: cat.color }}
                                      title={cat.name}
                                    />
                                  </div>
                                  <div className="font-bold text-[11px] text-white line-clamp-2">
                                    {event.title}
                                  </div>
                                  {event.location && (
                                    <div className="text-[9px] text-slate-400 truncate mt-0.5 flex items-center gap-0.5">
                                      <MapPin className="w-2 h-2 text-slate-500" />
                                      {event.location}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
