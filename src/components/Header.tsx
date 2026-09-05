import React from 'react';
import { CalendarViewMode } from '../types';
import {
  CalendarDays,
  Calendar,
  Table as TableIcon,
  ListTodo,
  FileDown,
  Briefcase,
  Sun,
  Moon,
  Plus,
  Bell,
  Wifi,
  WifiOff,
  ShieldCheck,
  Users,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  onOpenPdfModal: () => void;
  onOpenReminderCenter: () => void;
  onOpenStoragePrivacyModal: () => void;
  onOpenInviteModal: () => void;
  familyId: string | null;
  activeRemindersCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPdfModal,
  onOpenReminderCenter,
  onOpenStoragePrivacyModal,
  onOpenInviteModal,
  familyId,
  activeRemindersCount,
  darkMode,
  onToggleDarkMode,
  isOnline,
  syncStatus = 'synced',
  onManualSync,
}) => {
  return (
    <header className="sticky top-0 z-30 transition-colors p-2 sm:p-3 pb-0">
      <div className="max-w-7xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl px-3.5 sm:px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight tracking-tight">
                  Családi Naptár
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  {isOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Élő kapcsolat
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" />
                      Offline mód
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Sync, Invite, PDF, Reminder, Storage, Dark Mode */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Cloud Sync & Refresh Button */}
            {onManualSync && (
              <button
                onClick={onManualSync}
                title={
                  syncStatus === 'syncing'
                    ? 'Szinkronizálás folyamatban...'
                    : syncStatus === 'error'
                    ? 'Szinkronizálási hiba – kattints az újrapróbálkozáshoz'
                    : 'Telefon és gép élő kapcsolatban – kattints az azonnali frissítéshez'
                }
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs border ${
                  syncStatus === 'syncing'
                    ? 'bg-indigo-950/80 border-indigo-500/80 text-indigo-200'
                    : syncStatus === 'error'
                    ? 'bg-rose-950/70 border-rose-750 text-rose-300'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-800/80 text-emerald-300'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus === 'syncing' ? 'animate-spin text-indigo-400' : 'text-emerald-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing'
                    ? 'Frissítés...'
                    : syncStatus === 'error'
                    ? 'Újra'
                    : 'Frissítés'}
                </span>
              </button>
            )}

            {/* Invite Family Private Link / QR Button */}
            <button
              onClick={onOpenInviteModal}
              title="Családtagok meghívása és QR-kód a mobilhoz"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs border bg-indigo-950/70 border-indigo-700/80 text-indigo-200 hover:bg-indigo-900/80 hover:border-indigo-500"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Megosztás & QR</span>
            </button>

            {/* PDF Export Button */}
            <button
              onClick={onOpenPdfModal}
              title="Naptár exportálása nyomtatható PDF-be"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Reminder Center Button */}
            <button
              onClick={onOpenReminderCenter}
              title="Emlékeztetők"
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer shadow-xs"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {activeRemindersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse shadow-sm">
                  {activeRemindersCount}
                </span>
              )}
            </button>

            {/* Tárhely, Adatvédelem & Ürítés */}
            <button
              onClick={onOpenStoragePrivacyModal}
              title="Tárhely & Adatbiztonság (100% privát, naptár ürítése)"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer shadow-xs hover:border-emerald-500/50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Váltás világos módra' : 'Váltás sötét módra'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer shadow-xs"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
