import React, { useState } from 'react';
import { CalendarEvent, EventCategory, FamilyMemberId, ReminderTime, ParentShift } from '../types';
import {
  FAMILY_MEMBERS,
  CATEGORIES,
  CATEGORIES_LIST,
  APA_SHIFT_PRESETS,
  ANYA_SHIFT_PRESETS,
  formatIsoDate,
  getMemberName,
  getMemberInitial,
} from '../data/defaultData';
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
  Briefcase,
  Sparkles,
} from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  editEvent?: CalendarEvent | null;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  memberNames?: Record<string, string>;
  onSaveShift?: (shift: ParentShift) => void;
  onOpenShiftModal?: (date?: string, parent?: 'apa' | 'anya') => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  editEvent,
  onSaveEvent,
  onDeleteEvent,
  memberNames,
  onSaveShift,
  onOpenShiftModal,
}) => {
  const [entryType, setEntryType] = useState<'event' | 'workday'>('event');
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
  const [syncToParentShift, setSyncToParentShift] = useState(true);

  const apaName = getMemberName('apa', memberNames, true);
  const anyaName = getMemberName('anya', memberNames, true);

  React.useEffect(() => {
    if (editEvent) {
      const isWork = editEvent.category === 'work';
      setEntryType(isWork ? 'workday' : 'event');
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
      setSyncToParentShift(true);
    } else {
      setEntryType('event');
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
      setSyncToParentShift(true);
    }
  }, [editEvent, selectedDate, isOpen]);

  if (!isOpen) return null;

  const currentWorkPresets = memberId === 'apa'
    ? APA_SHIFT_PRESETS
    : memberId === 'anya'
    ? ANYA_SHIFT_PRESETS
    : [
        { label: '08:00 - 16:00 Normál', startTime: '08:00', endTime: '16:00', isOffDay: false },
        { label: '07:00 - 15:00 Műszak', startTime: '07:00', endTime: '15:00', isOffDay: false },
        { label: '06:00 - 14:00 Délelőtt', startTime: '06:00', endTime: '14:00', isOffDay: false },
        { label: '14:00 - 22:00 Délután', startTime: '14:00', endTime: '22:00', isOffDay: false },
        { label: 'Szabadnap', isOffDay: true },
      ];

  const handleApplyWorkPreset = (preset: typeof currentWorkPresets[0]) => {
    if (preset.isOffDay) {
      setIsAllDay(true);
      setTitle(preset.label);
    } else {
      setIsAllDay(false);
      if (preset.startTime) setStartTime(preset.startTime);
      if (preset.endTime) setEndTime(preset.endTime);
      setTitle(`Munkanap (${preset.startTime} - ${preset.endTime})`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (entryType === 'workday' ? (isAllDay ? 'Pihenőnap' : 'Munkanap') : 'Esemény');

    const eventData: CalendarEvent = {
      id: editEvent ? editEvent.id : `ev-${Date.now()}`,
      title: finalTitle,
      memberId,
      category: entryType === 'workday' ? 'work' : category,
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

    // If setting a workday for Apa or Anya, also record it as official ParentShift
    if (
      (entryType === 'workday' || category === 'work' || syncToParentShift) &&
      (memberId === 'apa' || memberId === 'anya') &&
      onSaveShift
    ) {
      const shiftData: ParentShift = {
        id: `${memberId}-${date}`,
        memberId,
        date,
        shiftType: isAllDay ? 'Szabadnap' : `${startTime} - ${endTime}`,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        isOffDay: isAllDay,
        note: finalTitle,
        updatedAt: Date.now(),
      };
      onSaveShift(shiftData);
    }

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
          {/* Entry Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-2xl border border-slate-700/80">
            <button
              type="button"
              id="event-type-general-btn"
              onClick={() => {
                setEntryType('event');
                if (category === 'work') setCategory('family');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
                entryType === 'event'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Családi esemény / Teendő</span>
            </button>

            <button
              type="button"
              id="event-type-workday-btn"
              onClick={() => {
                setEntryType('workday');
                setCategory('work');
                if (memberId === 'all') setMemberId('apa');
                if (!title.trim() || title === 'Esemény' || title === 'Új esemény') {
                  setTitle('Munkanap');
                }
                if (startTime === '16:00') {
                  setStartTime(memberId === 'anya' ? '06:00' : '07:00');
                  setEndTime(memberId === 'anya' ? '18:00' : '15:00');
                }
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
                entryType === 'workday'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Munkanap / Műszak</span>
            </button>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{entryType === 'workday' ? 'Megnevezés / Műszak típusa *' : 'Megnevezés / Teendő *'}</span>
              {entryType === 'workday' && (
                <span className="text-[11px] text-sky-400 font-medium">Munkanap beállítás</span>
              )}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={entryType === 'workday' ? 'Pl. Munkanap, 12 órás műszak, Délelőtt...' : 'Pl. Edzés, Orvosi vizsgálat, Családi program, Bevásárlás...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder-slate-400 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              autoFocus
            />

            {/* Quick title chips when setting a workday */}
            {entryType === 'workday' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Munkanap', '12 órás műszak', 'Délelőttös', 'Délutános', 'Éjszakás', 'Szabadnap'].map((nameChip) => (
                  <button
                    key={nameChip}
                    type="button"
                    onClick={() => setTitle(nameChip)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 text-[11px] font-medium transition cursor-pointer"
                  >
                    {nameChip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Family Member Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {entryType === 'workday' ? 'Ki dolgozik ezen a napon?' : 'Kihez tartozik a bejegyzés? (Színkódolt családtag)'}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {entryType !== 'workday' && (
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
              )}

              {FAMILY_MEMBERS.map((m) => {
                const isSelected = memberId === m.id;
                const memberName = getMemberName(m.id, memberNames, true);
                const initial = getMemberInitial(m.id, memberNames);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMemberId(m.id);
                      if (entryType === 'workday') {
                        if (m.id === 'anya') {
                          setStartTime('06:00');
                          setEndTime('18:00');
                        } else if (m.id === 'apa') {
                          setStartTime('07:00');
                          setEndTime('15:00');
                        }
                      }
                    }}
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

          {/* Quick Workday Presets Bar (Shown in workday mode OR when category is work) */}
          {(entryType === 'workday' || category === 'work') && (
            <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  Gyors műszak sablonok ({getMemberName(memberId, memberNames, true)}):
                </span>
                {onOpenShiftModal && (memberId === 'apa' || memberId === 'anya') && (
                  <button
                    type="button"
                    onClick={() => onOpenShiftModal(date, memberId as 'apa' | 'anya')}
                    className="text-[11px] text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    Heti sablon &rarr;
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentWorkPresets.map((preset, idx) => {
                  const isActive =
                    (!preset.isOffDay && !isAllDay && startTime === preset.startTime && endTime === preset.endTime) ||
                    (preset.isOffDay && isAllDay);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyWorkPreset(preset)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30 font-bold'
                          : 'bg-slate-850 text-slate-200 border-slate-750 hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Sync to Parent Shift toggle for Apa or Anya */}
              {(memberId === 'apa' || memberId === 'anya') && (
                <label className="flex items-center gap-2 pt-1 text-xs text-sky-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncToParentShift}
                    onChange={(e) => setSyncToParentShift(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 bg-slate-900 border-slate-700"
                  />
                  <span>
                    Rögzítés kiemelt szülői műszakként is (A naptár felső beosztássávjában is megjelenik)
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Category Selector (Hidden in workday mode to keep UI ultra-clean, or visible in general event mode) */}
          {entryType !== 'workday' && (
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
                      onClick={() => {
                        setCategory(cat.id);
                        if (cat.id === 'work') {
                          if (memberId === 'all') setMemberId('apa');
                          if (!title.trim()) setTitle('Munkanap');
                        }
                      }}
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
          )}

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
