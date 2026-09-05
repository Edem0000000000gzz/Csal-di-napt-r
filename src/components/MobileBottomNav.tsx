import React from 'react';
import { CalendarViewMode } from '../types';
import { CalendarDays, Calendar, Table as TableIcon, ListTodo, Briefcase, Plus } from 'lucide-react';

interface MobileBottomNavProps {
  viewMode: CalendarViewMode;
  onSelectViewMode: (mode: CalendarViewMode) => void;
  onOpenNewEventModal: () => void;
  onOpenShiftModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  onSelectViewMode,
  onOpenNewEventModal,
  onOpenShiftModal,
}) => {
  return (
    <div className="md:hidden fixed bottom-2 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-2 shadow-2xl safe-bottom">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onSelectViewMode('week')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            viewMode === 'week'
              ? 'text-indigo-400 bg-indigo-950/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span>Heti</span>
        </button>

        <button
          onClick={() => onSelectViewMode('month')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            viewMode === 'month'
              ? 'text-indigo-400 bg-indigo-950/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Havi</span>
        </button>

        {/* Center Floating Action Button (FAB) */}
        <button
          onClick={onOpenNewEventModal}
          className="-mt-6 w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transition transform active:scale-95 cursor-pointer ring-4 ring-slate-950 border border-indigo-400"
          title="Új esemény hozzáadása"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => onSelectViewMode('matrix')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            viewMode === 'matrix'
              ? 'text-indigo-400 bg-indigo-950/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableIcon className="w-5 h-5" />
          <span>Mátrix</span>
        </button>

        <button
          onClick={onOpenShiftModal}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <span>Munkaidő</span>
        </button>
      </div>
    </div>
  );
};
