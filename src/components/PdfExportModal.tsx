import React, { useState } from 'react';
import { CalendarEvent, ParentShift } from '../types';
import { exportWeeklyPdf, exportMonthlyPdf } from '../utils/pdfExport';
import { HUNGARIAN_MONTHS } from '../utils/dateUtils';
import { FileDown, FileText, Calendar, Check, X, Printer } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonday: Date;
  currentMonthDate: Date;
  events: CalendarEvent[];
  shifts: ParentShift[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  currentMonday,
  currentMonthDate,
  events,
  shifts,
}) => {
  const [exportType, setExportType] = useState<'week' | 'month'>('week');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (exportType === 'week') {
        exportWeeklyPdf(currentMonday, events, shifts);
      } else {
        exportMonthlyPdf(
          currentMonthDate.getFullYear(),
          currentMonthDate.getMonth(),
          events,
          shifts
        );
      }
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('PDF export failed', err);
      setIsExporting(false);
    }
  };

  const monthName = HUNGARIAN_MONTHS[currentMonthDate.getMonth()];
  const year = currentMonthDate.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-950 text-rose-400 border border-rose-800/80 flex items-center justify-center font-bold shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Naptár Exportálása PDF-be
              </h2>
              <p className="text-xs text-slate-400">
                Nyomtatható családi beosztás és programok
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

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Válaszd ki a letölteni kívánt formátumot. A PDF tartalmazza Apa és Anya munkabeosztását, valamint a család összes bejegyzését:
          </p>

          <div className="space-y-2.5">
            {/* Weekly Option */}
            <div
              onClick={() => setExportType('week')}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                exportType === 'week'
                  ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40'
                  : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    Heti Beosztás & Események PDF
                  </h4>
                  {exportType === 'week' && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Fekvő elrendezésű, táblázatos heti nézet az aktuális hét napjaira részletes eseményekkel.
                </p>
              </div>
            </div>

            {/* Monthly Option */}
            <div
              onClick={() => setExportType('month')}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                exportType === 'month'
                  ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40'
                  : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    Havi Teljes Összesítő PDF ({year}. {monthName})
                  </h4>
                  {exportType === 'month' && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Álló formátumú áttekintő táblázat az egész hónap műszakjaival és eseményeivel.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-[11px] text-slate-300 flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-400 shrink-0" />
            <span>A generált PDF fájl offline is elkészül a böngésződben és azonnal nyomtatható.</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Generálás...' : 'PDF Letöltése'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
