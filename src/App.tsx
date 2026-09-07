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
  Wand2,
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
  const [initialEventMemberId, setInitialEventMemberId] = useState<FamilyMemberId | undefined>(undefined);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(getTodayIso());
  const [initialShiftParent, setInitialShiftParent] = useState<'apa' | 'anya' | undefined>(undefined);
  const [initialShiftMode, setInitialShiftMode] = useState<'day' | 'week'>('day');

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
  const lastServerTimestampRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  // Custom Family Member Names state (in-place editable)
  const [memberNames, setMemberNames] = useState<Record<string, string>>(() => {
    return loadMemberNamesFromStorage();
  });

  // Deleted items tracking for reliable multi-device deletions
  const deletedEventIdsRef = useRef<Set<string>>(new Set());
  const deletedShiftIdsRef = useRef<Set<string>>(new Set());

  // Központi felhő-mentés és szinkronizáció – CSAK módosításkor fut le, nem pörög feleslegesen
  const triggerCloudSync = async (
    currentEvents: CalendarEvent[],
    currentShifts: ParentShift[],
    currentNames: Record<string, string>,
    delEvts?: string[],
    delShfts?: string[]
  ) => {
    if (!familyId || !isOnline || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const res = await pushFamilyData(
        familyId,
        currentEvents,
        currentShifts,
        lastServerTimestampRef.current,
        currentNames,
        undefined,
        delEvts,
        delShfts
      );
      if (res.success && res.updatedAt) {
        lastServerTimestampRef.current = res.updatedAt;
        setLastServerTimestamp(res.updatedAt);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('[Sync] Mentési figyelmeztetés:', err);
    } finally {
      isSyncingRef.current = false;
      setTimeout(() => {
        setSyncStatus('synced');
      }, 350);
    }
  };

  const handleUpdateMemberName = (memberId: string, newName: string) => {
    const updated = {
      ...memberNames,
      [memberId]: newName,
    };
    setMemberNames(updated);
    saveMemberNamesToStorage(updated);
    triggerCloudSync(events, shifts, updated);
  };

  // Kezdeti szinkronizáció és helyi adatok betöltése
  useEffect(() => {
    let isMounted = true;
    const activeId = familyId || DEFAULT_FAMILY_ID;

    const doInitialSync = async () => {
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

          if (serverEvents.length === 0 && serverShifts.length === 0 && (localEvts.length > 0 || localShfts.length > 0)) {
            const pushRes = await pushFamilyData(activeId, localEvts, localShfts, undefined, res.memberNames || localNames);
            if (pushRes.success && pushRes.updatedAt) {
              lastServerTimestampRef.current = pushRes.updatedAt;
              setLastServerTimestamp(pushRes.updatedAt);
            }
          } else if (serverEvents.length > 0 || serverShifts.length > 0) {
            const mergedE = mergeEvents(localEvts, serverEvents);
            const mergedS = mergeShifts(localShfts, serverShifts);

            setEvents(mergedE);
            setShifts(mergedS);
            lastServerTimestampRef.current = serverUpdatedAt || Date.now();
            setLastServerTimestamp(serverUpdatedAt || Date.now());

            if (mergedE.length > serverEvents.length || mergedS.length > serverShifts.length) {
              await pushFamilyData(activeId, mergedE, mergedS, undefined, res.memberNames || localNames);
            }
          }
        }
      } catch (err) {
        console.error('[Sync] Kezdeti betöltési hiba:', err);
      } finally {
        if (isMounted) {
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }
      }
    };

    doInitialSync();

    return () => {
      isMounted = false;
    };
  }, [familyId]);

  // 10 másodperces diszkrét automatikus háttér-frissítés (felhasználói kérés szerint)
  useEffect(() => {
    if (!familyId || !isOnline) return;

    const intervalId = setInterval(async () => {
      if (isSyncingRef.current) return;
      try {
        const res = await fetchFamilyData(familyId);
        if (res.success && res.updatedAt && res.updatedAt > lastServerTimestampRef.current) {
          lastServerTimestampRef.current = res.updatedAt;
          setLastServerTimestamp(res.updatedAt);
          if (res.events) {
            setEvents(res.events);
            saveEventsToStorage(res.events);
          }
          if (res.shifts) {
            setShifts(res.shifts);
            saveShiftsToStorage(res.shifts);
          }
          if (res.memberNames && Object.keys(res.memberNames).length > 0) {
            setMemberNames(res.memberNames);
            saveMemberNamesToStorage(res.memberNames);
          }
          setLastSyncTime(new Date());
        }
      } catch {
        // Csendes háttér-frissítés
      }
    }, 10000); // Pontosan 10 másodpercenként

    return () => clearInterval(intervalId);
  }, [familyId, isOnline]);

  // Kézi frissítés gomb (azonnali szinkronizáció)
  const handleManualSync = async () => {
    if (!familyId || !isOnline || isSyncingRef.current) return;
    setSyncStatus('syncing');
    isSyncingRef.current = true;
    try {
      const res = await fetchFamilyData(familyId);
      if (res.success) {
        if (res.events?.length || res.shifts?.length) {
          setEvents(res.events || []);
          setShifts(res.shifts || []);
          saveEventsToStorage(res.events || []);
          saveShiftsToStorage(res.shifts || []);
        } else if (events.length > 0 || shifts.length > 0) {
          await pushFamilyData(familyId, events, shifts, undefined, memberNames);
        }
        if (res.memberNames && Object.keys(res.memberNames).length > 0) {
          setMemberNames(res.memberNames);
          saveMemberNamesToStorage(res.memberNames);
        }
        const freshTimestamp = res.updatedAt || Date.now();
        lastServerTimestampRef.current = freshTimestamp;
        setLastServerTimestamp(freshTimestamp);
        setLastSyncTime(new Date());
      }
    } catch {
      // Kezelve
    } finally {
      isSyncingRef.current = false;
      setTimeout(() => {
        setSyncStatus('synced');
      }, 400);
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
    triggerCloudSync(imported.events, imported.shifts, memberNames);
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
  const handleOpenNewEventModal = (date?: string, memberId?: FamilyMemberId) => {
    setSelectedEventDate(date || getTodayIso());
    setEditingEvent(null);
    setInitialEventMemberId(memberId);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (date: string, event?: CalendarEvent, memberId?: FamilyMemberId) => {
    setSelectedEventDate(date);
    setEditingEvent(event || null);
    setInitialEventMemberId(memberId || (event ? event.memberId : undefined));
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    deletedEventIdsRef.current.delete(savedEvent.id);
    let updatedList: CalendarEvent[] = [];
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === savedEvent.id);
      updatedList = exists
        ? prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
        : [savedEvent, ...prev];
      saveEventsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(updatedList, shifts, memberNames);
  };

  const handleSaveBatchEvents = (savedEvents: CalendarEvent[]) => {
    if (!savedEvents || savedEvents.length === 0) return;
    savedEvents.forEach((e) => deletedEventIdsRef.current.delete(e.id));
    let updatedList: CalendarEvent[] = [];
    setEvents((prev) => {
      const ids = new Set(savedEvents.map((e) => e.id));
      const rest = prev.filter((e) => !ids.has(e.id));
      updatedList = [...savedEvents, ...rest];
      saveEventsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(updatedList, shifts, memberNames);
  };

  const handleDeleteEvent = (eventId: string) => {
    deletedEventIdsRef.current.add(eventId);
    let updatedList: CalendarEvent[] = [];
    setEvents((prev) => {
      updatedList = prev.filter((e) => e.id !== eventId);
      saveEventsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(updatedList, shifts, memberNames, [eventId], undefined);
  };

  const handleToggleEventCompleted = (eventId: string) => {
    let updatedList: CalendarEvent[] = [];
    setEvents((prev) => {
      updatedList = prev.map((e) =>
        e.id === eventId ? { ...e, isCompleted: !e.isCompleted } : e
      );
      saveEventsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(updatedList, shifts, memberNames);
  };

  // Handlers for Shifts
  const handleOpenShiftModal = (
    date?: string,
    parent?: 'apa' | 'anya',
    mode: 'day' | 'week' = 'day'
  ) => {
    setSelectedShiftDate(date || getTodayIso());
    setInitialShiftParent(parent);
    setInitialShiftMode(mode);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (newShift: ParentShift) => {
    deletedShiftIdsRef.current.delete(newShift.id);
    let updatedList: ParentShift[] = [];
    setShifts((prev) => {
      const filtered = prev.filter((s) => s.id !== newShift.id);
      updatedList = [...filtered, newShift];
      saveShiftsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(events, updatedList, memberNames);
  };

  const handleDeleteShift = (shiftId: string) => {
    deletedShiftIdsRef.current.add(shiftId);
    let updatedList: ParentShift[] = [];
    setShifts((prev) => {
      updatedList = prev.filter((s) => s.id !== shiftId);
      saveShiftsToStorage(updatedList);
      return updatedList;
    });
    triggerCloudSync(events, updatedList, memberNames, undefined, [shiftId]);
  };

  const handleBatchApplyShifts = (newShifts: ParentShift[], removeShiftIds?: string[]) => {
    // 1. Unmark newly applied shifts from deleted cache
    newShifts.forEach((s) => {
      deletedShiftIdsRef.current.delete(s.id);
      deletedShiftIdsRef.current.delete(`${s.memberId}_${s.date}`);
    });

    // 2. Track real removals
    const newKeys = new Set(newShifts.map((s) => `${s.memberId}_${s.date}`));
    const newIds = new Set(newShifts.map((s) => s.id));
    if (removeShiftIds && removeShiftIds.length > 0) {
      removeShiftIds.forEach((id) => {
        if (!newIds.has(id)) {
          deletedShiftIdsRef.current.add(id);
        }
      });
    }

    let updatedList: ParentShift[] = [];
    setShifts((prev) => {
      const idsToRemove = new Set(removeShiftIds || []);
      // Replace existing shifts for the same person and date, or with the same id
      const remaining = prev.filter(
        (s) => !newKeys.has(`${s.memberId}_${s.date}`) && !newIds.has(s.id) && !idsToRemove.has(s.id)
      );
      updatedList = [...remaining, ...newShifts];
      saveShiftsToStorage(updatedList);
      return updatedList;
    });

    // Immediate background push to cloud Firestore & server to guarantee persistence
    triggerCloudSync(
      events,
      updatedList,
      memberNames,
      Array.from(deletedEventIdsRef.current),
      Array.from(deletedShiftIdsRef.current)
    );
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
        const newEvents = Array.isArray(parsed.events) ? parsed.events : events;
        const newShifts = Array.isArray(parsed.shifts) ? parsed.shifts : shifts;
        setEvents(newEvents);
        setShifts(newShifts);
        saveEventsToStorage(newEvents);
        saveShiftsToStorage(newShifts);
        triggerCloudSync(newEvents, newShifts, memberNames);
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
              onClick={() => handleOpenNewEventModal()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition cursor-pointer"
              title="Új családi esemény vagy program hozzáadása"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">+ Új esemény</span>
            </button>
            <button
              onClick={() => handleOpenShiftModal(undefined, undefined, 'week')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/50 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs active:scale-95"
              title="Szülői munkaidő gyors heti kitöltése (Apa: 07-15, Anya: 06-18)"
            >
              <Wand2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">⚡ Heti gyorskitöltés</span>
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
        onClose={() => {
          setIsEventModalOpen(false);
          setInitialEventMemberId(undefined);
        }}
        selectedDate={selectedEventDate}
        initialMemberId={initialEventMemberId}
        editEvent={editingEvent}
        memberNames={memberNames}
        onSaveEvent={handleSaveEvent}
        onSaveBatchEvents={handleSaveBatchEvents}
        onDeleteEvent={handleDeleteEvent}
        onSaveShift={handleSaveShift}
        onOpenShiftModal={(date, parent) => {
          setIsEventModalOpen(false);
          handleOpenShiftModal(date, parent);
        }}
      />

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setInitialShiftParent(undefined);
          setInitialShiftMode('day');
        }}
        selectedDate={selectedShiftDate}
        initialParent={initialShiftParent}
        initialMode={initialShiftMode}
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
