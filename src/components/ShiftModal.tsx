import React, { useState } from 'react';
import { ParentShift } from '../types';
import { APA_SHIFT_PRESETS, ANYA_SHIFT_PRESETS, formatIsoDate, getMemberName, getMemberInitial } from '../data/defaultData';
import { formatToHungarianDate } from '../utils/dateUtils';
import { Clock, Briefcase, Calendar, X, Check, Trash2, Wand2, ShieldAlert } from 'lucide-react';

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
}) => {
  const [selectedParent, setSelectedParent] = useState<'apa' | 'anya'>(initialParent || 'apa');
  const [date, setDate] = useState<string>(selectedDate || formatIsoDate(new Date()));
  const [presetIndex, setPresetIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  const apaName = getMemberName('apa', memberNames, true);
  const anyaName = getMemberName('anya', memberNames, true);
  const apaInitial = getMemberInitial('apa', memberNames);
  const anyaInitial = getMemberInitial('anya', memberNames);

  // Sync parent when modal opens or initialParent prop changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialParent) {
        setSelectedParent(initialParent);
      }
    }
  }, [isOpen, initialParent]);

  // Sync date when selectedDate changes
  React.useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);

  // Synchronize hours and presets whenever parent, date or shifts change
  React.useEffect(() => {
    const currentPresets = selectedParent === 'apa' ? APA_SHIFT_PRESETS : ANYA_SHIFT_PRESETS;
    const existing = currentShifts.find((s) => s.date === date && s.memberId === selectedParent);

    if (existing) {
      // Look for a matching preset
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
      // Default to first preset for this parent (Apa: 07:00-15:00, Anya: 06:00-18:00)
      setPresetIndex(0);
      const defaultP = currentPresets[0];
      setIsOffDay(defaultP.isOffDay);
      setStartTime(defaultP.startTime || (selectedParent === 'apa' ? '07:00' : '06:00'));
      setEndTime(defaultP.endTime || (selectedParent === 'apa' ? '15:00' : '18:00'));
      setNote('');
      setIsManualEdit(false);
    }
  }, [selectedParent, date, currentShifts]);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const shiftType = isOffDay
      ? 'Szabadnap'
      : `${startTime} - ${endTime}`;

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

  const handleAutoFillWeek = (parent: 'apa' | 'anya') => {
    if (!onBatchApplyShifts) return;
    const base = new Date(date);
    const day = base.getDay();
    const mondayDiff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base.setDate(mondayDiff));

    const newShifts: ParentShift[] = [];
    const removeShiftIds: string[] = [];
    const isApa = parent === 'apa';
    const standardStart = isApa ? '07:00' : '06:00';
    const standardEnd = isApa ? '15:00' : '18:00';
    const shiftLabel = isApa ? '07:00 - 15:00' : '06:00 - 18:00';

    // Hétfőtől Péntekig (0-4): Kizárólag hétköznapokra tölti ki a munkaidőt
    for (let i = 0; i < 5; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const iso = formatIsoDate(cur);

      newShifts.push({
        id: `${parent}-${iso}`,
        memberId: parent,
        date: iso,
        shiftType: shiftLabel,
        startTime: standardStart,
        endTime: standardEnd,
        isOffDay: false,
        note: 'Munkanap',
      });
    }

    // Hétvége (Szombat i=5, Vasárnap i=6): Pihenőidő, nem munkanap!
    // A korábban esetleg tévesen rögzített hétvégi műszakokat eltávolítjuk
    for (let i = 5; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const iso = formatIsoDate(cur);
      removeShiftIds.push(`${parent}-${iso}`);
      const existing = currentShifts.find((s) => s.date === iso && s.memberId === parent);
      if (existing) removeShiftIds.push(existing.id);
    }

    onBatchApplyShifts(newShifts, removeShiftIds);
    onClose();
  };

  const existingShift = currentShifts.find((s) => s.date === date && s.memberId === selectedParent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/80 flex items-center justify-center font-bold shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Szülői Munkaidő & Beosztás
              </h2>
              <p className="text-xs text-slate-400">
                {apaName} (07:00 - 15:00) és {anyaName} (06:00 - 18:00) munkanapjainak beállítása
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

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Parent selector tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
            <button
              type="button"
              id="shift-select-apa"
              onClick={() => setSelectedParent('apa')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition cursor-pointer ${
                selectedParent === 'apa'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              <div className="w-5 h-5 rounded-lg bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                {apaInitial}
              </div>
              <span>{apaName} (07:00 - 15:00)</span>
            </button>

            <button
              type="button"
              id="shift-select-anya"
              onClick={() => setSelectedParent('anya')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm transition cursor-pointer ${
                selectedParent === 'anya'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
              }`}
            >
              <div className="w-5 h-5 rounded-lg bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                {anyaInitial}
              </div>
              <span>{anyaName} (06:00 - 18:00)</span>
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

          {/* Dropdown Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Előre beállított munkaidő
              </span>
              <button
                type="button"
                onClick={() => setIsManualEdit(!isManualEdit)}
                className="text-[11px] text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {isManualEdit ? 'Váltás sablonra' : 'Manuális munkaidő megadása'}
              </button>
            </label>

            {!isManualEdit ? (
              <select
                value={presetIndex}
                onChange={(e) => handlePresetChange(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {presets.map((preset, idx) => (
                  <option key={idx} value={idx}>
                    {preset.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
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
              placeholder={selectedParent === 'anya' ? 'Pl. Munkanap 06-18' : 'Pl. Normál munkanap'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Quick Helper for Apa / Anya */}
          {onBatchApplyShifts && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
              selectedParent === 'apa'
                ? 'bg-sky-950/60 border-sky-800/80'
                : 'bg-rose-950/60 border-rose-800/80'
            }`}>
              <div className={`text-xs ${selectedParent === 'apa' ? 'text-sky-200' : 'text-rose-200'}`}>
                <span className="font-bold">Gyors művelet:</span>{' '}
                {selectedParent === 'apa'
                  ? 'Hétköznapok kitöltése (H-P: 07-15, Szo-V: pihenő)'
                  : 'Hétköznapok kitöltése (H-P: 06-18, Szo-V: pihenő)'}
              </div>
              <button
                type="button"
                onClick={() => handleAutoFillWeek(selectedParent)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs transition cursor-pointer ${
                  selectedParent === 'apa'
                    ? 'bg-sky-600 hover:bg-sky-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Heti kitöltés
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
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
                <span>Műszak törlése</span>
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
