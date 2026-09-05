import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarEvent,
  ParentShift,
  FamilyMemberId,
  CalendarViewMode,
} from './types';
import {
  loadEventsFromStorage,
  saveEventsToStorage,
  loadShiftsFromStorage,
  saveShiftsToStorage,
  loadThemePreference,
  saveThemePreference,
  exportFamilyDataJson,
  clearAllCalendarData,
} from './utils/storage';
import {
  getActiveFamilyId,
  setActiveFamilyId,
  generateNewFamilyId,
  extractFamilyCredentialsFromUrl,
  getActiveFamilyAccessKey,
  setActiveFamilyAccessKey,
  generateNewAccessKey,
  fetchFamilyData,
  pushFamilyData,
  DEFAULT_FAMILY_ID,
  mergeEvents,
  mergeShifts,
  loadMemberNamesFromStorage,
  saveMemberNamesToStorage,
} from './utils/syncService';
import {
  getMondayOfCurrentWeek,
  getTodayIso,
  formatIso,
} from './utils/dateUtils';
import { Header } from './components/Header';
import { WeeklyView } from './components/WeeklyView';
import { MonthlyView } from './components/MonthlyView';
import { FamilyMatrixTable } from './components/FamilyMatrixTable';
import { AgendaView } from './components/AgendaView';
import { EventModal } from './components/EventModal';
import { ShiftModal } from './components/ShiftModal';
import { PdfExportModal } from './components/PdfExportModal';
import { ReminderCenter } from './components/ReminderCenter';
import { StoragePrivacyModal } from './components/StoragePrivacyModal';
import { InviteFamilyModal } from './components/InviteFamilyModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  WifiOff,
  Briefcase,
  FileDown,
  Download,
  Upload,
  Heart,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Users,
  Link2,
  X,
  Plus,
  Calendar,
  Table as TableIcon,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return loadThemePreference() === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      saveThemePreference('dark');
    } else {
      root.classList.remove('dark');
      saveThemePreference('light');
    }
  }, [darkMode]);

  // Online status state
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Main calendar state
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEventsFromStorage());
  const [shifts, setShifts] = useState<ParentShift[]>(() => loadShiftsFromStorage());
  const [selectedMember, setSelectedMember] = useState<FamilyMemberId>('all');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Dates
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMondayOfCurrentWeek(new Date())
  );
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState<string>(getTodayIso());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(getTodayIso());

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isReminderCenterOpen, setIsReminderCenterOpen] = useState(false);
  const [isStoragePrivacyOpen, setIsStoragePrivacyOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Private Family Sharing & Sync State (Protected by Object-Level Authorization)
  const [familyId, setFamilyId] = useState<string>(() => {
    const creds = extractFamilyCredentialsFromUrl();
    if (creds) {
      setActiveFamilyId(creds.familyId);
      if (creds.accessKey) {
        setActiveFamilyAccessKey(creds.accessKey);
      }
      return creds.familyId;
    }
    return getActiveFamilyId();
  });

  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [lastServerTimestamp, setLastServerTimestamp] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Custom Family Member Names state (in-place editable)
  const [memberNames, setMemberNames] = useState<Record<string, string>>(() => {
    return loadMemberNamesFromStorage();
  });

  const handleUpdateMemberName = (memberId: string, newName: string) => {
    const updated = {
      ...memberNames,
      [memberId]: newName,
    };
    setMemberNames(updated);
    saveMemberNamesToStorage(updated);

    if (familyId && isOnline) {
      pushFamilyData(familyId, events, shifts, lastServerTimestamp, updated).then((res) => {
        if (res.success && res.updatedAt) {
          setLastServerTimestamp(res.updatedAt);
        }
      });
    }
  };

  // Initial Sync & Smart Merge on Mount
  useEffect(() => {
    let isMounted = true;
    const activeId = familyId || DEFAULT_FAMILY_ID;

    const doInitialSync = async () => {
      setSyncStatus('syncing');
      try {
        const localEvts = loadEventsFromStorage();
        const localShfts = loadShiftsFromStorage();
        const localNames = loadMemberNamesFromStorage();

        const creds = extractFamilyCredentialsFromUrl();
        if (creds) {
          setJoinNotification('Csatlakoztál a privát családi naptárhoz! Jogosultsági kulcs hitelesítve.');
          setTimeout(() => setJoinNotification(null), 8000);
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        const res = await fetchFamilyData(activeId);
        if (!isMounted) return;

        if (res.success) {
          const serverEvents = res.events || [];
          const serverShifts = res.shifts || [];
          const serverUpdatedAt = res.updatedAt || 0;

          if (res.memberNames && Object.keys(res.memberNames).length > 0) {
            setMemberNames(res.memberNames);
            saveMemberNamesToStorage(res.memberNames);
          } else if (Object.keys(localNames).length > 0) {
            await pushFamilyData(activeId, localEvts, localShfts, undefined, localNames);
          }

          // Case 1: Server has no data yet, but this device already has local data
          if (serverEvents.length === 0 && serverShifts.length === 0 && (localEvts.length > 0 || localShfts.length > 0)) {
            const pushRes = await pushFamilyData(activeId, localEvts, localShfts, undefined, res.memberNames || localNames);
            if (pushRes.success) {
              setLastServerTimestamp(pushRes.updatedAt || Date.now());
              setSyncStatus('synced');
              setLastSyncTime(new Date());
            }
          }
          // Case 2: Both server and local have data -> smart merge to ensure neither device's data is lost
          else if (serverEvents.length > 0 || serverShifts.length > 0) {
            const mergedE = mergeEvents(localEvts, serverEvents);
            const mergedS = mergeShifts(localShfts, serverShifts);

            setEvents(mergedE);
            setShifts(mergedS);
            setLastServerTimestamp(serverUpdatedAt || Date.now());
            setSyncStatus('synced');
            setLastSyncTime(new Date());

            // If local had new items not yet on the server, upload the merged set
            if (mergedE.length > serverEvents.length || mergedS.length > serverShifts.length) {
              await pushFamilyData(activeId, mergedE, mergedS, undefined, res.memberNames || localNames);
            }
          } else {
            setSyncStatus('synced');
            setLastSyncTime(new Date());
          }
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error('[Sync] Initial sync error:', err);
        setSyncStatus('error');
      }
    };

    doInitialSync();

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  // Periodic polling & focus sync for live multi-device updates (Laptop <-> Phone)
  useEffect(() => {
    if (!familyId || !isOnline) return;

    let isCancelled = false;

    const performSync = async () => {
      try {
        const res = await fetchFamilyData(familyId);
        if (isCancelled) return;

        if (res.success && res.updatedAt && res.updatedAt > lastServerTimestamp) {
          setEvents(res.events || []);
          setShifts(res.shifts || []);
          if (res.memberNames) {
            setMemberNames(res.memberNames);
            saveMemberNamesToStorage(res.memberNames);
          }
          setLastServerTimestamp(res.updatedAt);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.error('[Sync] Polling error:', err);
      }
    };

    const interval = setInterval(performSync, 3500);
    const handleFocus = () => performSync();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [familyId, isOnline, lastServerTimestamp]);

  // Deleted items tracking for reliable multi-device deletions
  const deletedEventIdsRef = useRef<Set<string>>(new Set());
  const deletedShiftIdsRef = useRef<Set<string>>(new Set());

  // Debounced push to server when events or shifts change
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!familyId || !isOnline) return;

    setSyncStatus('syncing');
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      const deletedEvts: string[] = Array.from(deletedEventIdsRef.current);
      const deletedShfts: string[] = Array.from(deletedShiftIdsRef.current);

      const res = await pushFamilyData(
        familyId,
        events,
        shifts,
        lastServerTimestamp,
        memberNames,
        undefined,
        deletedEvts,
        deletedShfts
      );
      if (res.success) {
        deletedEventIdsRef.current.clear();
        deletedShiftIdsRef.current.clear();
        if (res.updatedAt) setLastServerTimestamp(res.updatedAt);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        if (res.events) {
          setEvents(res.events);
        }
        if (res.shifts) {
          setShifts(res.shifts);
        }
      } else {
        setSyncStatus('error');
      }
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [events, shifts, familyId, isOnline, memberNames]);

  // Manual trigger to refresh from cloud immediately
  const handleManualSync = async () => {
    if (!familyId) return;
    setSyncStatus('syncing');
    try {
      const res = await fetchFamilyData(familyId);
      if (res.success) {
        if (res.events?.length || res.shifts?.length) {
          setEvents(res.events || []);
          setShifts(res.shifts || []);
        } else if (events.length > 0 || shifts.length > 0) {
          await pushFamilyData(familyId, events, shifts, undefined, memberNames);
        }
        if (res.memberNames) {
          setMemberNames(res.memberNames);
          saveMemberNamesToStorage(res.memberNames);
        }
        setLastServerTimestamp(res.updatedAt || Date.now());
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // Handler: Join or switch to an existing family ID (e.g. wife entering husband's family code)
  const handleJoinFamily = async (newFamilyId: string) => {
    const trimmed = newFamilyId.trim();
    if (!trimmed) return;
    setFamilyId(trimmed);
    setActiveFamilyId(trimmed);
    setSyncStatus('syncing');
    try {
      const res = await fetchFamilyData(trimmed);
      if (res.success) {
        if (res.events) setEvents(res.events);
        if (res.shifts) setShifts(res.shifts);
        if (res.memberNames) {
          setMemberNames(res.memberNames);
          saveMemberNamesToStorage(res.memberNames);
        }
        setLastServerTimestamp(res.updatedAt || Date.now());
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        setJoinNotification(`Sikeresen összekapcsolva a "${trimmed}" családi naptárral!`);
        setTimeout(() => setJoinNotification(null), 7000);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  // Handler: Generate new private family room with cryptographic access key
  const handleGenerateNewFamily = async () => {
    const newId = generateNewFamilyId();
    const newKey = generateNewAccessKey();
    setFamilyId(newId);
    setActiveFamilyId(newId);
    setActiveFamilyAccessKey(newKey);
    setSyncStatus('syncing');
    const res = await pushFamilyData(newId, events, shifts, undefined, memberNames, newKey);
    if (res.success && res.updatedAt) {
      setLastServerTimestamp(res.updatedAt);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    }
  };

  // Handler: Leave family room (generates a fresh private room)
  const handleLeaveFamily = () => {
    const newId = generateNewFamilyId();
    const newKey = generateNewAccessKey();
    setFamilyId(newId);
    setActiveFamilyId(newId);
    setActiveFamilyAccessKey(newKey);
    setEvents([]);
    setShifts([]);
    clearAllCalendarData();
    setSyncStatus('synced');
  };

  // Clear all data handler
  const handleClearAllCalendarData = () => {
    setEvents([]);
    setShifts([]);
    clearAllCalendarData();
  };

  // Import data handler
  const handleImportCalendarData = (imported: { events: CalendarEvent[]; shifts: ParentShift[] }) => {
    setEvents(imported.events);
    setShifts(imported.shifts);
    saveEventsToStorage(imported.events);
    saveShiftsToStorage(imported.shifts);
  };

  // Auto-save events
  useEffect(() => {
    saveEventsToStorage(events);
  }, [events]);

  // Auto-save shifts
  useEffect(() => {
    saveShiftsToStorage(shifts);
  }, [shifts]);

  // Event counts for member filter badges
  const eventCounts = useMemo(() => {
    const counts: Record<FamilyMemberId, number> = {
      all: events.filter((e) => !e.isCompleted).length,
      apa: events.filter((e) => e.memberId === 'apa' && !e.isCompleted).length,
      anya: events.filter((e) => e.memberId === 'anya' && !e.isCompleted).length,
      amira: events.filter((e) => e.memberId === 'amira' && !e.isCompleted).length,
      donat: events.filter((e) => e.memberId === 'donat' && !e.isCompleted).length,
      hella: events.filter((e) => e.memberId === 'hella' && !e.isCompleted).length,
    };
    return counts;
  }, [events]);

  // Active reminders count
  const activeRemindersCount = useMemo(() => {
    return events.filter(
      (e) => e.reminder && e.reminder !== 'none' && !e.isCompleted
    ).length;
  }, [events]);

  // Handlers for Events
  const handleOpenNewEventModal = (date?: string) => {
    setSelectedEventDate(date || getTodayIso());
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (date: string, event?: CalendarEvent) => {
    setSelectedEventDate(date);
    setEditingEvent(event || null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === savedEvent.id);
      if (exists) {
        return prev.map((e) => (e.id === savedEvent.id ? savedEvent : e));
      }
      return [savedEvent, ...prev];
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    deletedEventIdsRef.current.add(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleToggleEventCompleted = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, isCompleted: !e.isCompleted } : e
      )
    );
  };

  // Handlers for Shifts
  const handleOpenShiftModal = (date?: string) => {
    setSelectedShiftDate(date || getTodayIso());
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (newShift: ParentShift) => {
    setShifts((prev) => {
      const filtered = prev.filter((s) => s.id !== newShift.id);
      return [...filtered, newShift];
    });
  };

  const handleDeleteShift = (shiftId: string) => {
    deletedShiftIdsRef.current.add(shiftId);
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
  };

  const handleBatchApplyShifts = (newShifts: ParentShift[]) => {
    setShifts((prev) => {
      const idsToReplace = new Set(newShifts.map((s) => s.id));
      const remaining = prev.filter((s) => !idsToReplace.has(s.id));
      return [...remaining, ...newShifts];
    });
  };

  // Navigation helpers
  const handleJumpToToday = () => {
    setCurrentMonday(getMondayOfCurrentWeek(new Date()));
    setCurrentMonthDate(new Date());
  };

  // JSON Import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed.events)) {
          setEvents(parsed.events);
        }
        if (Array.isArray(parsed.shifts)) {
          setShifts(parsed.shifts);
        }
      } catch (err) {
        console.error('Import failed', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <Header
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenReminderCenter={() => setIsReminderCenterOpen(true)}
        onOpenStoragePrivacyModal={() => setIsStoragePrivacyOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        familyId={familyId}
        activeRemindersCount={activeRemindersCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        isOnline={isOnline}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Offline Toast Banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <WifiOff className="w-4 h-4" />
          <span>Offline mód aktív. Minden adat helyben a készülékeden tárolódik és elérhető.</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 pb-8">
        {/* Join Notification Banner */}
        {joinNotification && (
          <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold leading-relaxed">{joinNotification}</span>
            </div>
            <button
              onClick={() => setJoinNotification(null)}
              className="p-1 rounded-lg hover:bg-emerald-900/60 text-emerald-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Action Bar & View Switcher (Havi nézet & Táblázatos mátrix) */}
        <div className="mb-4 p-2.5 sm:p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shadow-md">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenShiftModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-indigo-900/60 font-semibold text-xs sm:text-sm transition cursor-pointer shadow-xs"
              title="Szülői munkaidő gyors kitöltése heti vagy havi szinten"
            >
              <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="whitespace-nowrap">Munkaidő kitöltése</span>
            </button>
            <button
              onClick={() => handleOpenNewEventModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition cursor-pointer"
              title="Új családi esemény vagy program hozzáadása"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">+ Új esemény</span>
            </button>
          </div>

          {/* View switcher: Havi nézet vs Táblázatos mátrix (Mobilon és asztali nézetben is elérhető) */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Havi nézet</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Táblázatos nézet</span>
            </button>
          </div>
        </div>

        {viewMode === 'week' && (
          <WeeklyView
            currentMonday={currentMonday}
            onChangeWeek={setCurrentMonday}
            onJumpToToday={handleJumpToToday}
            events={events}
            shifts={shifts}
            memberNames={memberNames}
            selectedMember={selectedMember}
            onOpenEventModal={handleOpenEditEventModal}
            onOpenShiftModal={handleOpenShiftModal}
            onToggleEventCompleted={handleToggleEventCompleted}
          />
        )}

        {viewMode === 'month' && (
          <MonthlyView
            currentDate={currentMonthDate}
            onChangeMonth={setCurrentMonthDate}
            onJumpToToday={handleJumpToToday}
            events={events}
            shifts={shifts}
            memberNames={memberNames}
            onUpdateMemberName={handleUpdateMemberName}
            selectedMember={selectedMember}
            onOpenEventModal={handleOpenEditEventModal}
            onOpenShiftModal={handleOpenShiftModal}
            onDeleteEvent={handleDeleteEvent}
            onToggleEventCompleted={handleToggleEventCompleted}
          />
        )}

        {viewMode === 'matrix' && (
          <FamilyMatrixTable
            currentMonday={currentMonday}
            onChangeWeek={setCurrentMonday}
            onJumpToToday={handleJumpToToday}
            events={events}
            shifts={shifts}
            memberNames={memberNames}
            onOpenEventModal={handleOpenEditEventModal}
            onOpenShiftModal={handleOpenShiftModal}
          />
        )}

        {viewMode === 'agenda' && (
          <AgendaView
            events={events}
            selectedMember={selectedMember}
            memberNames={memberNames}
            onOpenEventModal={handleOpenEditEventModal}
            onToggleEventCompleted={handleToggleEventCompleted}
          />
        )}
      </main>

      {/* Footer info & Backup buttons */}
      <footer className="hidden md:block border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Családi Naptár & Beosztás Kezelő</span>
            <span>•</span>
            <PWAInstallButton />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => exportFamilyDataJson(events, shifts)}
              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              title="Adatok exportálása biztonsági mentésként"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Biztonsági mentés (JSON)</span>
            </button>

            <label className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Visszaállítás</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        selectedDate={selectedEventDate}
        editEvent={editingEvent}
        memberNames={memberNames}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
      />

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        selectedDate={selectedShiftDate}
        currentShifts={shifts}
        memberNames={memberNames}
        onSaveShift={handleSaveShift}
        onDeleteShift={handleDeleteShift}
        onBatchApplyShifts={handleBatchApplyShifts}
      />

      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        currentMonday={currentMonday}
        currentMonthDate={currentMonthDate}
        events={events}
        shifts={shifts}
      />

      <ReminderCenter
        isOpen={isReminderCenterOpen}
        onClose={() => setIsReminderCenterOpen(false)}
        events={events}
        onOpenEventModal={handleOpenEditEventModal}
      />

      <StoragePrivacyModal
        isOpen={isStoragePrivacyOpen}
        onClose={() => setIsStoragePrivacyOpen(false)}
        events={events}
        shifts={shifts}
        onClearAll={handleClearAllCalendarData}
        onImportData={handleImportCalendarData}
      />

      <ErrorBoundary fallbackTitle="Hiba történt a meghívó megnyitásakor">
        <InviteFamilyModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          familyId={familyId}
          onGenerateNewFamily={handleGenerateNewFamily}
          onLeaveFamily={handleLeaveFamily}
          onJoinFamily={handleJoinFamily}
          eventsCount={events.length}
          shiftsCount={shifts.length}
        />
      </ErrorBoundary>
    </div>
  );
}
