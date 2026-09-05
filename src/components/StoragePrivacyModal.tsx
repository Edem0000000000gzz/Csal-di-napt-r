import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Trash2,
  Download,
  Upload,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { CalendarEvent, ParentShift } from '../types';
import { exportFamilyDataJson, importFamilyDataJson } from '../utils/storage';

interface StoragePrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  shifts: ParentShift[];
  onClearAll: () => void;
  onImportData: (imported: { events: CalendarEvent[]; shifts: ParentShift[] }) => void;
}

export const StoragePrivacyModal: React.FC<StoragePrivacyModalProps> = ({
  isOpen,
  onClose,
  events,
  shifts,
  onClearAll,
  onImportData,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const data = await importFamilyDataJson(file);
      onImportData(data);
      setStatusMessage(`Sikeres betöltés! (${data.events.length} esemény, ${data.shifts.length} munkaidő)`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Hiba történt a fájl betöltése közben.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      e.target.value = '';
    }
  };

  const executeClear = () => {
    onClearAll();
    setConfirmClear(false);
    setStatusMessage('A naptár sikeresen kiürítve! Most teljesen tiszta az alkalmazás.');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Tárhely & Adatbiztonság
              </h3>
              <p className="text-[11px] text-slate-400">
                100% helyi, eszközfüggetlen privát működés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Privacy Explanation Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Hogyan működik a naptárad védelme?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Minden bejegyzett esemény, szülői munkaidő és teendő <strong className="text-white">kizárólag a te saját eszközödön és böngésződben</strong> kerül elmentésre (helyi offline tárhely).
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Különálló, tiszta letöltés:</strong> Ha bárki más letölti vagy megnyitja ezt az alkalmazást egy másik telefonon vagy gépen, neki is egy <strong className="text-slate-200">teljesen üres applikáció</strong> nyílik meg, és soha nem férhet hozzá a te személyes adataidhoz!
              </span>
            </div>
          </div>

          {/* Current Stored Data Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Aktuálisan tárolt adatok ezen az eszközön:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold">
                {events.length} esemény
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold">
                {shifts.length} munkaidő
              </span>
            </div>
          </div>

          {/* Wipe / Clear Calendar Data Section */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Naptár ürítése (Újrakezdés üres lappal)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Minden esemény és munkaidő azonnali törlése az eszközről, így a naptár újra teljesen üres állapotba kerül.
                </p>
              </div>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-800/80 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                >
                  Naptár ürítése
                </button>
              ) : null}
            </div>

            {confirmClear && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Biztosan törölni szeretnéd az összes naptári adatot?</span>
                </div>
                <p className="text-[11px] text-rose-300/80">
                  Ez a művelet visszaállítja a naptárat a teljesen tiszta, üres állapotra.
                </p>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Mégse
                  </button>
                  <button
                    type="button"
                    onClick={executeClear}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
                  >
                    Igen, törlés és ürítés
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Backup / Export / Import */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Saját biztonsági mentés kezelése
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => exportFamilyDataJson(events, shifts)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mentés letöltése (.json)</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mentés betöltése fájlból</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Rendben, bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
