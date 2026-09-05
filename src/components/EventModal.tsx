import React, { useState } from 'react';
import { CalendarEvent, EventCategory, FamilyMemberId, ReminderTime } from '../types';
import { FAMILY_MEMBERS, CATEGORIES, CATEGORIES_LIST, formatIsoDate, getMemberName, getMemberInitial } from '../data/defaultData';
import { formatToHungarianDate } from '../utils/dateUtils';
import {
  X,
  Check,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Bell,
  Tag,
  Users,
  CheckSquare,
} from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  editEvent?: CalendarEvent | null;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  memberNames?: Record<string, string>;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  editEvent,
  onSaveEvent,
  onDeleteEvent,
  memberNames,
}) => {
  const [title, setTitle] = useState('');
  const [memberId, setMemberId] = useState<FamilyMemberId>('all');
  const [category, setCategory] = useState<EventCategory>('family');
  const [date, setDate] = useState(selectedDate || formatIsoDate(new Date()));
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState<ReminderTime>('none');
  const [customReminderDateTime, setCustomReminderDateTime] = useState('');

  React.useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setMemberId(editEvent.memberId);
      setCategory(editEvent.category);
      setDate(editEvent.date);
      setIsAllDay(!!editEvent.isAllDay);
      setStartTime(editEvent.startTime || '16:00');
      setEndTime(editEvent.endTime || '17:00');
      setLocation(editEvent.location || '');
      setNotes(editEvent.notes || '');
      setReminder(editEvent.reminder || 'none');
      setCustomReminderDateTime(editEvent.customReminderDateTime || '');
    } else {
      setTitle('');
      setMemberId('all');
      setCategory('family');
      setDate(selectedDate || formatIsoDate(new Date()));
      setIsAllDay(false);
      setStartTime('16:00');
      setEndTime('17:00');
      setLocation('');
      setNotes('');
      setReminder('none');
      setCustomReminderDateTime('');
    }
  }, [editEvent, selectedDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const eventData: CalendarEvent = {
      id: editEvent ? editEvent.id : `ev-${Date.now()}`,
      title: title.trim(),
      memberId,
      category,
      date,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      isAllDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      reminder,
      customReminderDateTime: reminder === 'custom' ? customReminderDateTime : undefined,
      createdAt: editEvent ? editEvent.createdAt : Date.now(),
      updatedAt: Date.now(),
      isCompleted: editEvent?.isCompleted || false,
    };

    onSaveEvent(eventData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/80 flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editEvent ? 'Bejegyzés szerkesztése' : 'Új családi esemény / teendő'}
              </h2>
              <p className="text-xs text-slate-400">
                {formatToHungarianDate(date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Megnevezés / Teendő *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pl. Edzés, Orvosi vizsgálat, Családi program, Bevásárlás..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              autoFocus
            />
          </div>

          {/* Family Member Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Kihez tartozik a bejegyzés? (Színkódolt családtag)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setMemberId('all')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  memberId === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center mb-1 text-[11px] font-bold">
                  👨‍👩‍👧‍👦
                </div>
                <span className="truncate">{getMemberName('all', memberNames)}</span>
              </button>

              {FAMILY_MEMBERS.map((m) => {
                const isSelected = memberId === m.id;
                const memberName = getMemberName(m.id, memberNames, true);
                const initial = getMemberInitial(m.id, memberNames);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemberId(m.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      isSelected
                        ? 'text-white shadow-md ring-2 ring-white/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                    style={{
                      backgroundColor: isSelected ? m.color : undefined,
                      borderColor: isSelected ? m.color : undefined,
                    }}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center mb-1 text-[10px] font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'text-white'
                      }`}
                      style={{ backgroundColor: !isSelected ? m.color : undefined }}
                    >
                      {initial}
                    </div>
                    <span className="truncate">{memberName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Kategória (Típus szerinti színkód)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES_LIST.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                      isSelected
                        ? `${cat.badgeClass} ring-2 ring-indigo-500/50 font-bold border-transparent`
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dátum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm"
                required
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-300">
                  Egész napos esemény
                </span>
              </label>
            </div>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kezdés ideje
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm"
                  required={!isAllDay}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Befejezés ideje
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm"
                  required={!isAllDay}
                />
              </div>
            </div>
          )}

          {/* Reminder / Emlékeztető */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              Egyedi emlékeztető beállítása
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={reminder}
                onChange={(e) => setReminder(e.target.value as ReminderTime)}
                className="w-full px-3 py-2 rounded-xl border border-amber-800/80 bg-slate-900 text-white text-xs font-medium cursor-pointer"
              >
                <option value="none">Nincs emlékeztető</option>
                <option value="at_time">Az esemény kezdetekor</option>
                <option value="15_min">15 perccel előtte</option>
                <option value="30_min">30 perccel előtte</option>
                <option value="1_hour">1 órával előtte</option>
                <option value="2_hours">2 órával előtte</option>
                <option value="1_day">1 nappal előtte</option>
                <option value="custom">Egyedi időpont megadása...</option>
              </select>

              {reminder === 'custom' && (
                <input
                  type="datetime-local"
                  value={customReminderDateTime}
                  onChange={(e) => setCustomReminderDateTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-amber-800/80 bg-slate-900 text-white text-xs"
                  required={reminder === 'custom'}
                />
              )}
            </div>
          </div>

          {/* Location & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Helyszín (opcionális)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Pl. Iskola sportcsarnok, Rendelő, Otthon..."
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Jegyzetek & Fontos részletek (opcionális)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pl. Váltóruha, orvosi kiskönyv, uzsonna csomagolás..."
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 text-sm resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            {editEvent && onDeleteEvent ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteEvent(editEvent.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-xs font-semibold transition cursor-pointer active:scale-95"
                title="Tevékenység törlése"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Törlés</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-semibold transition cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Mentés
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
