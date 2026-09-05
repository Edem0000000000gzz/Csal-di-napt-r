import React, { useState } from 'react';
import { CalendarEvent, FamilyMemberId, EventCategory } from '../types';
import { FAMILY_MEMBERS, CATEGORIES, CATEGORIES_LIST, getMemberName } from '../data/defaultData';
import { formatToHungarianDate } from '../utils/dateUtils';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Search,
  Plus,
  Bell,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface AgendaViewProps {
  events: CalendarEvent[];
  selectedMember: FamilyMemberId;
  memberNames?: Record<string, string>;
  onOpenEventModal: (date: string, event?: CalendarEvent) => void;
  onToggleEventCompleted: (id: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  selectedMember,
  memberNames,
  onOpenEventModal,
  onToggleEventCompleted,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (selectedMember !== 'all' && e.memberId !== selectedMember && e.memberId !== 'all') {
      return false;
    }
    if (selectedCategory !== 'all' && e.category !== selectedCategory) {
      return false;
    }
    if (showOnlyIncomplete && e.isCompleted) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchLoc = e.location?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      return matchTitle || matchLoc || matchNotes;
    }
    return true;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
  });

  // Group by date
  const groups: { date: string; items: CalendarEvent[] }[] = [];
  filteredEvents.forEach((item) => {
    let group = groups.find((g) => g.date === item.date);
    if (!group) {
      group = { date: item.date, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-3 sm:p-4 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés az események és teendők között..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="all">Minden kategória</option>
              {CATEGORIES_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                showOnlyIncomplete
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Csak nyitott teendők
            </button>
          </div>
        </div>
      </div>

      {/* Events Grouped by Date */}
      {groups.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 shadow-2xl">
          <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="text-sm font-semibold">Nincs a szűrésnek megfelelő esemény.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.date}
              className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-extrabold text-white">
                  {formatToHungarianDate(group.date)}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {group.items.length} bejegyzés
                </span>
              </div>

              <div className="p-3 divide-y divide-slate-800/80 space-y-1">
                {group.items.map((event) => {
                  const member = FAMILY_MEMBERS.find((m) => m.id === event.memberId);
                  const cat = CATEGORIES[event.category] || CATEGORIES.other;

                  return (
                    <div
                      key={event.id}
                      onClick={() => onOpenEventModal(event.date, event)}
                      className="pt-2 pb-2 first:pt-0 last:pb-0 flex items-start gap-3 hover:bg-slate-800/60 p-2.5 rounded-2xl transition cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEventCompleted(event.id);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                      >
                        {event.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {event.memberId === 'all' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                              {getMemberName('all', memberNames)}
                            </span>
                          ) : member ? (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: member.color }}
                            >
                              {getMemberName(event.memberId, memberNames, true)}
                            </span>
                          ) : null}

                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${cat.badgeClass}`}>
                            {cat.name}
                          </span>

                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {event.isAllDay ? 'Egész nap' : `${event.startTime || ''} - ${event.endTime || ''}`}
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-bold ${
                            event.isCompleted
                              ? 'line-through text-slate-500'
                              : 'text-white'
                          }`}
                        >
                          {event.title}
                        </h4>

                        {event.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {event.location}
                          </p>
                        )}

                        {event.notes && (
                          <p className="text-xs text-slate-400 italic mt-0.5">
                            {event.notes}
                          </p>
                        )}
                      </div>

                      {event.reminder !== 'none' && (
                        <div className="text-amber-400 shrink-0" title="Emlékeztető aktív">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
