import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { FAMILY_MEMBERS } from '../data/defaultData';
import { formatToHungarianDate } from '../utils/dateUtils';
import { Bell, BellRing, Check, Clock, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReminderCenterProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onOpenEventModal: (date: string, event: CalendarEvent) => void;
}

export const ReminderCenter: React.FC<ReminderCenterProps> = ({
  isOpen,
  onClose,
  events,
  onOpenEventModal,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isOpen) return null;

  // Events with active reminders
  const reminderEvents = events
    .filter((e) => e.reminder && e.reminder !== 'none' && !e.isCompleted)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

  const getReminderLabel = (e: CalendarEvent) => {
    switch (e.reminder) {
      case 'at_time':
        return 'Kezdéskor';
      case '15_min':
        return '15 perccel előtte';
      case '30_min':
        return '30 perccel előtte';
      case '1_hour':
        return '1 órával előtte';
      case '2_hours':
        return '2 órával előtte';
      case '1_day':
        return '1 nappal előtte';
      case 'custom':
        return `Egyedi: ${e.customReminderDateTime?.replace('T', ' ') || ''}`;
      default:
        return 'Aktív';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-amber-950 text-amber-400 border border-amber-800/80 flex items-center justify-center font-bold shadow-xs">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Családi Emlékeztetők
              </h2>
              <p className="text-[11px] text-slate-400">
                {reminderEvents.length} aktív beállított figyelmeztetés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Notification Permission Banner */}
          {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
            <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-indigo-200">
                  Értesítések engedélyezése mobilon
                </p>
                <p className="text-[11px] text-indigo-300/80 mt-0.5">
                  Engedélyezd a böngészős értesítéseket, hogy időben jelezzünk a teendőkről!
                </p>
                <button
                  type="button"
                  onClick={requestPermission}
                  className="mt-2 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition shadow-xs"
                >
                  Engedélyezés
                </button>
              </div>
            </div>
          )}

          {/* List of Reminder Events */}
          {reminderEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">Nincsenek aktív emlékeztetők beállítva.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Új esemény létrehozásakor vagy szerkesztésekor beállíthatsz egyedi emlékeztetőt.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminderEvents.map((event) => {
                const member = FAMILY_MEMBERS.find((m) => m.id === event.memberId);

                return (
                  <div
                    key={event.id}
                    onClick={() => {
                      onOpenEventModal(event.date, event);
                      onClose();
                    }}
                    className="p-3 rounded-2xl border border-slate-800 bg-slate-800/80 hover:border-slate-700 hover:bg-slate-800 transition cursor-pointer shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        {event.memberId === 'all' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-700 text-slate-200 border border-slate-600">
                            Család
                          </span>
                        ) : member ? (
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: member.color }}
                          >
                            {member.name}
                          </span>
                        ) : null}

                        <span className="text-[11px] font-bold text-slate-400">
                          {event.date}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        {getReminderLabel(event)}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white">
                      {event.title}
                    </h4>

                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        {event.isAllDay ? 'Egész nap' : event.startTime}
                      </span>
                      {event.location && <span>• {event.location}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
