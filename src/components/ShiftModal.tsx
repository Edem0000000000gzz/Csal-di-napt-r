import React, { useState, useEffect, useRef } from 'react';
import { ParentShift } from '../types';
import { APA_SHIFT_PRESETS, ANYA_SHIFT_PRESETS, formatIsoDate, getMemberName, getMemberInitial } from '../data/defaultData';
import {
  formatToHungarianDate,
  parseIsoDate,
  getMondayOfCurrentWeek,
  getWeekDays,
  getTodayIso,
} from '../utils/dateUtils';
import {
  Clock,
  Briefcase,
  Calendar,
  X,
  Check,
  Trash2,
  Wand2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
} from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  currentShifts: ParentShift[];
  onSaveShift: (shift: ParentShift) => void;
  onDeleteShift?: (shiftId: string) => void;
  onBatchApplyShifts?: (newShifts: ParentShift[], removeShiftIds?: string[]) => void;
  memberNames?: Record<string, string>;
  initialParent?: 'apa' | 'anya';
  initialMode?: 'day' | 'week';
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  currentShifts,
  onSaveShift,
  onDeleteShift,
  onBatchApplyShifts,
  memberNames,
  initialParent,
  initialMode = 'day',
}) => {
  // Modal Mode: 'day' (single day) vs 'week' (weekly quick-fill)
  const [modalMode, setModalMode] = useState<'day' | 'week'>(initialMode);

  // Single-day state
  const [selectedParent, setSelectedParent] = useState<'apa' | 'anya'>(initialParent || 'apa');
  const [date, setDate] = useState<string>(selectedDate || getTodayIso());
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Weekly quick-fill state
  const [weekReferenceDate, setWeekReferenceDate] = useState<string>(selectedDate || getTodayIso());
  const [weeklyTarget, setWeeklyTarget] = useState<'both' | 'apa' | 'anya'>('both');
  const [selectedDayIndices, setSelectedDayIndices] = useState<number[]>([0, 1, 2, 3, 4]); // 0=H, 1=K, 2=Sze, 3=Cs, 4=P
  const [customHoursMode, setCustomHoursMode] = useState<boolean>(false);
  const [customWeeklyStart, setCustomWeeklyStart] = useState<string>('07:00');
  const [customWeeklyEnd, setCustomWeeklyEnd] = useState<string>('15:00');
  const [customWeeklyParent, setCustomWeeklyParent] = useState<'apa' | 'anya'>('apa');
  const [markWeekendAsOff, setMarkWeekendAsOff] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const apaName = getMemberName('apa', memberNames, true);
  const anyaName = getMemberName('anya', memberNames, true);
  const apaInitial = getMemberInitial('apa', memberNames);
  const anyaInitial = getMemberInitial('anya', memberNames);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      if (initialParent) setSelectedParent(initialParent);
      if (initialMode) setModalMode(initialMode);
      setFeedback(null);
    }
  }, [isOpen, initialParent, initialMode]);

  // Sync date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
      setWeekReferenceDate(selectedDate);
    }
  }, [selectedDate]);

  // Sync day shift inputs when parent or date changes
  const lastInitKeyRef = useRef<string>('');
  useEffect(() => {
    if (!isOpen) {
      lastInitKeyRef.current = '';
      return;
    }

    const currentKey = `${selectedParent}-${date}`;
    if (lastInitKeyRef.current === currentKey) return;
    lastInitKeyRef.current = currentKey;

    const currentPresets = selectedParent === 'apa' ? APA_SHIFT_PRESETS : ANYA_SHIFT_PRESETS;
    const existing = currentShifts.find((s) => s.date === date && s.memberId === selectedParent);

    if (existing) {
      const matchIdx = currentPresets.findIndex((p) => {
        if (existing.isOffDay) return p.isOffDay;
        return !p.isOffDay && p.startTime === existing.startTime && p.endTime === existing.endTime;
      });

      if (matchIdx !== -1) {
        setPresetIndex(matchIdx);
        setIsOffDay(!!existing.isOffDay);
        setStartTime(existing.startTime || currentPresets[matchIdx].startTime || (selectedParent === 'apa' ? '07:00' : '06:00'));
        setEndTime(existing.endTime || currentPresets[matchIdx].endTime || (selectedParent === 'apa' ? '15:00' : '18:00'));
        setIsManualEdit(false);
      } else {
        setPresetIndex(0);
        setIsOffDay(!!existing.isOffDay);
        setStartTime(existing.startTime || (selectedParent === 'apa' ? '07:00' : '06:00'));
        setEndTime(existing.endTime || (selectedParent === 'apa' ? '15:00' : '18:00'));
        setIsManualEdit(true);
      }
      setNote(existing.note || '');
    } else {
      setPresetIndex(0);
      const defaultP = currentPresets[0];
      setIsOffDay(defaultP.isOffDay);
      setStartTime(defaultP.startTime || (selectedParent === 'apa' ? '07:00' : '06:00'));
      setEndTime(defaultP.endTime || (selectedParent === 'apa' ? '15:00' : '18:00'));
      setNote('');
      setIsManualEdit(false);
    }
  }, [isOpen, selectedParent, date, currentShifts]);

  if (!isOpen) return null;

  const presets = selectedParent === 'apa' ? APA_SHIFT_PRESETS : ANYA_SHIFT_PRESETS;

  const handlePresetChange = (idx: number) => {
    setPresetIndex(idx);
    const selected = presets[idx];
    if (selected) {
      setIsOffDay(selected.isOffDay);
      if (!selected.isOffDay) {
        setStartTime(selected.startTime);
        setEndTime(selected.endTime);
      }
      setIsManualEdit(false);
    }
  };

  // Save single-day shift
  const handleSaveDayShift = (e: React.FormEvent) => {
    e.preventDefault();
    const shiftType = isOffDay ? 'Szabadnap' : `${startTime} - ${endTime}`;

    const shiftData: ParentShift = {
      id: `${selectedParent}-${date}`,
      memberId: selectedParent,
      date,
      shiftType,
      startTime: isOffDay ? undefined : startTime,
      endTime: isOffDay ? undefined : endTime,
      isOffDay,
      note: note.trim() || (isOffDay ? 'Pihenőnap' : 'Munkanap'),
      updatedAt: Date.now(),
    };

    onSaveShift(shiftData);
    onClose();
  };

  // Safe week calculation using parseIsoDate
  const currentWeekMonday = getMondayOfCurrentWeek(parseIsoDate(weekReferenceDate));
  const currentWeekDays = getWeekDays(currentWeekMonday);
  const weekRangeLabel = `${currentWeekDays[0].date.toLocaleDateString('hu-HU', {
    month: 'long',
    day: 'numeric',
  })} – ${currentWeekDays[6].date.toLocaleDateString('hu-HU', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(prev.getDate() - 7);
    setWeekReferenceDate(formatIsoDate(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(next.getDate() + 7);
    setWeekReferenceDate(formatIsoDate(next));
  };

  const handleJumpToCurrentWeek = () => {
    setWeekReferenceDate(getTodayIso());
  };

  const toggleDayIndex = (idx: number) => {
    setSelectedDayIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort()
    );
  };

  // Execute weekly quick-fill
  const handleExecuteWeeklyFill = () => {
    if (!onBatchApplyShifts) return;
    if (selectedDayIndices.length === 0) {
      setFeedback('⚠️ Válassz ki legalább egy munkanapot a heti kitöltéshez!');
      return;
    }

    const newShifts: ParentShift[] = [];
    const removeShiftIds: string[] = [];
    const now = Date.now();

    // Determine target parents
    const targetParents: ('apa' | 'anya')[] =
      weeklyTarget === 'both'
        ? ['apa', 'anya']
        : [weeklyTarget === 'anya' ? 'anya' : 'apa'];

    let countAdded = 0;

    for (const parent of targetParents) {
      const isApa = parent === 'apa';
      const defaultStart = isApa ? '07:00' : '06:00';
      const defaultEnd = isApa ? '15:00' : '18:00';

      const actualStart = customHoursMode
        ? (customWeeklyParent === parent ? customWeeklyStart : defaultStart)
        : defaultStart;
      const actualEnd = customHoursMode
        ? (customWeeklyParent === parent ? customWeeklyEnd : defaultEnd)
        : defaultEnd;

      const shiftLabel = `${actualStart} - ${actualEnd}`;

      currentWeekDays.forEach((dayInfo, dayIdx) => {
        const isSelected = selectedDayIndices.includes(dayIdx);
        const shiftId = `${parent}-${dayInfo.iso}`;

        if (isSelected) {
          newShifts.push({
            id: shiftId,
            memberId: parent,
            date: dayInfo.iso,
            shiftType: shiftLabel,
            startTime: actualStart,
            endTime: actualEnd,
            isOffDay: false,
            note: 'Munkanap',
            updatedAt: now,
          });
          countAdded++;
        } else {
          // Unselected days (e.g. weekend Saturday/Sunday)
          if (markWeekendAsOff) {
            newShifts.push({
              id: shiftId,
              memberId: parent,
              date: dayInfo.iso,
              shiftType: 'Szabadnap',
              isOffDay: true,
              note: 'Pihenőnap',
              updatedAt: now,
            });
          } else {
            removeShiftIds.push(shiftId);
            const existing = currentShifts.find(
              (s) => s.date === dayInfo.iso && s.memberId === parent
            );
            if (existing) removeShiftIds.push(existing.id);
          }
        }
      });
    }

    onBatchApplyShifts(newShifts, removeShiftIds);

    const targetLabel =
      weeklyTarget === 'both'
        ? 'Mindkét szülő (Apa & Anya)'
        : weeklyTarget === 'apa'
        ? apaName
        : anyaName;

    setFeedback(`✅ Sikeresen kitöltve! ${countAdded} munkanap rögzítve ${targetLabel} számára a hétre.`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const existingShift = currentShifts.find(
    (s) => s.date === date && s.memberId === selectedParent
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/80 flex items-center justify-center font-bold shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Szülői Munkaidő & Beosztás</span>
              </h2>
              <p className="text-xs text-slate-400">
                {apaName} (07:00 - 15:00) és {anyaName} (06:00 - 18:00)
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

        {/* Mode Selector Tabs: Napi munkaidő vs Heti gyorskitöltés */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/90 rounded-2xl border border-slate-750">
            <button
              type="button"
              onClick={() => {
                setModalMode('day');
                setFeedback(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                modalMode === 'day'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Napi beállítás</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModalMode('week');
                setFeedback(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                modalMode === 'week'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-slate-750'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>⚡ Heti gyorskitöltés</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Feedback banner if set */}
          {feedback && (
            <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: WEEKLY QUICK-FILL MODE (HETI GYORSKITÖLTÉS)                       */}
          {/* ========================================================================= */}
          {modalMode === 'week' && (
            <div className="space-y-4">
              {/* Week Navigator */}
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Kiválasztott hét
                  </span>
                  <button
                    type="button"
                    onClick={handleJumpToCurrentWeek}
                    className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Ugrás erre a hétre
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Előző hét"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-center font-bold text-sm text-white">
                    {weekRangeLabel}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Következő hét"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Target Parents Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Kinek a heti munkaidejét töltsük ki?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWeeklyTarget('both')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      weeklyTarget === 'both'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-500'
                        : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[13px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Mindkét szülő
                    </span>
                    <span className="text-[10px] opacity-80">Apa (07-15) + Anya (06-18)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeeklyTarget('apa')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      weeklyTarget === 'apa'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-200 shadow-md shadow-sky-500/20 ring-1 ring-sky-500'
                        : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[13px]">
                      <span className="w-4 h-4 rounded-md bg-sky-600 text-white flex items-center justify-center text-[9px]">
                        {apaInitial}
                      </span>
                      {apaName}
                    </span>
                    <span className="text-[10px] opacity-80">07:00 - 15:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWeeklyTarget('anya')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      weeklyTarget === 'anya'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-md shadow-rose-500/20 ring-1 ring-rose-500'
                        : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[13px]">
                      <span className="w-4 h-4 rounded-md bg-rose-600 text-white flex items-center justify-center text-[9px]">
                        {anyaInitial}
                      </span>
                      {anyaName}
                    </span>
                    <span className="text-[10px] opacity-80">06:00 - 18:00</span>
                  </button>
                </div>
              </div>

              {/* Days selection chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Munkanapok kiválasztása ({selectedDayIndices.length} nap):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDayIndices([0, 1, 2, 3, 4])}
                      className="text-[10px] text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      H – P (hétköznapok)
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDayIndices([0, 1, 2, 3, 4, 5, 6])}
                      className="text-[10px] text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      Minden nap
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {currentWeekDays.map((day, idx) => {
                    const isSelected = selectedDayIndices.includes(idx);
                    const isWeekend = idx >= 5;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => toggleDayIndex(idx)}
                        className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-xs'
                            : isWeekend
                            ? 'bg-slate-850/60 border-slate-800 text-slate-500 hover:bg-slate-800'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold">
                          {day.dayName.slice(0, 3)}
                        </span>
                        <span className="text-xs font-semibold mt-0.5">
                          {day.dayNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekend option */}
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-750 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Hétvége kezelése
                  </div>
                  <div className="text-[11px] text-slate-400">
                    A be nem pipált napok pihenőnapként/szabadnapként kerüljenek rögzítésre
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markWeekendAsOff}
                    onChange={(e) => setMarkWeekendAsOff(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Custom Hours Expandable */}
              <div className="p-3 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    Egyedi munkaidő beállítása a hétre
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customHoursMode}
                      onChange={(e) => setCustomHoursMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {customHoursMode && (
                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomWeeklyParent('apa')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border ${
                          customWeeklyParent === 'apa'
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {apaName} számára
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomWeeklyParent('anya')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border ${
                          customWeeklyParent === 'anya'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {anyaName} számára
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1 font-medium">
                          Kezdés
                        </span>
                        <input
                          type="time"
                          value={customWeeklyStart}
                          onChange={(e) => setCustomWeeklyStart(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1 font-medium">
                          Befejezés
                        </span>
                        <input
                          type="time"
                          value={customWeeklyEnd}
                          onChange={(e) => setCustomWeeklyEnd(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SINGLE-DAY SHIFT MODE (NAPI BEÁLLÍTÁS)                             */}
          {/* ========================================================================= */}
          {modalMode === 'day' && (
            <form onSubmit={handleSaveDayShift} id="day-shift-form" className="space-y-4">
              {/* Parent selector tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-800/80 border border-slate-750 rounded-2xl">
                <button
                  type="button"
                  id="shift-select-apa"
                  onClick={() => setSelectedParent('apa')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-xs sm:text-sm transition cursor-pointer ${
                    selectedParent === 'apa'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <div className="w-5 h-5 rounded-lg bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                    {apaInitial}
                  </div>
                  <span>{apaName} (07-15)</span>
                </button>

                <button
                  type="button"
                  id="shift-select-anya"
                  onClick={() => setSelectedParent('anya')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-xs sm:text-sm transition cursor-pointer ${
                    selectedParent === 'anya'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <div className="w-5 h-5 rounded-lg bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                    {anyaInitial}
                  </div>
                  <span>{anyaName} (06-18)</span>
                </button>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Dátum
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  {formatToHungarianDate(date)}
                </p>
              </div>

              {/* Presets vs Manual Mode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Munkaidő megadása
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-2xl border border-slate-700/80 mb-3">
                  <button
                    type="button"
                    onClick={() => setIsManualEdit(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                      !isManualEdit
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Sablon választása</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManualEdit(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                      isManualEdit
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Kézi megadás</span>
                  </button>
                </div>

                {!isManualEdit ? (
                  <div className="space-y-2">
                    <select
                      value={presetIndex}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'manual') {
                          setIsManualEdit(true);
                        } else {
                          handlePresetChange(Number(val));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {presets.map((preset, idx) => (
                        <option key={idx} value={idx}>
                          {preset.label}
                        </option>
                      ))}
                      <option value="manual">✏️ Egyedi munkaidő kézi beírása...</option>
                    </select>

                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Kiválasztott munkaidő:</span>
                        <strong className="text-white font-bold">
                          {isOffDay ? 'Szabadnap' : `${startTime} - ${endTime}`}
                        </strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-850 border border-slate-750">
                      <span className="text-xs font-semibold text-slate-200">
                        Szabadnap / Nem dolgozik:
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOffDay}
                          onChange={(e) => setIsOffDay(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {!isOffDay && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Munkaidő kezdete
                          </span>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm"
                            required={!isOffDay}
                          />
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Munkaidő vége
                          </span>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm"
                            required={!isOffDay}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Megjegyzés */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Megjegyzés a munkanaphoz (opcionális)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    selectedParent === 'anya'
                      ? 'Pl. Munkanap 06-18'
                      : 'Pl. Normál munkanap'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Shortcut to switch to Weekly Quick-Fill */}
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                <div className="text-xs text-amber-200">
                  <span className="font-bold">Egész hétre rögzítenéd?</span> Gyorsan kitöltheted az összes hétköznapot.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWeekReferenceDate(date);
                    setModalMode('week');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Heti kitöltés &rarr;</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-850 shrink-0 flex items-center justify-between gap-3">
          {modalMode === 'day' ? (
            <>
              {existingShift && onDeleteShift ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteShift(existingShift.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-rose-800/60 text-xs font-semibold transition cursor-pointer active:scale-95"
                  title="Műszak törlése"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Törlés</span>
                </button>
              ) : (
                <div />
              )}

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
                  form="day-shift-form"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Mentés</span>
                </button>
              </div>
            </>
          ) : (
            /* Weekly mode footer actions */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-semibold transition cursor-pointer"
              >
                Mégse
              </button>

              <button
                type="button"
                onClick={handleExecuteWeeklyFill}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer active:scale-95"
              >
                <Wand2 className="w-4 h-4" />
                <span>⚡ Heti gyorskitöltés mentése</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
