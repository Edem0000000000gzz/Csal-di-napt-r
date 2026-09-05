import { CalendarEvent, ParentShift } from '../types';

const STORAGE_KEYS = {
  EVENTS: 'family_cal_events_clean_v4',
  SHIFTS: 'family_cal_shifts_clean_v4',
  THEME: 'family_cal_theme',
};

// Legacy keys to clean up so existing browsers start completely fresh and empty
const LEGACY_STORAGE_KEYS = [
  'family_cal_events_v2',
  'family_cal_work_v3',
  'family_cal_shifts_v2',
  'family_cal_initialized_v2',
  'family_cal_initialized_v3',
];

export function loadEventsFromStorage(): CalendarEvent[] {
  try {
    // Clear legacy mock data if present
    LEGACY_STORAGE_KEYS.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });

    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load events from storage', err);
  }

  // Purely empty by default - no mock data
  return [];
}

export function saveEventsToStorage(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save events to storage', err);
  }
}

export function loadShiftsFromStorage(): ParentShift[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load shifts from storage', err);
  }

  // Purely empty by default - no mock shifts
  return [];
}

export function saveShiftsToStorage(shifts: ParentShift[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  } catch (err) {
    console.error('Failed to save shifts to storage', err);
  }
}

export function clearAllCalendarData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Failed to clear calendar storage', err);
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Check OS preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    // fallback
  }
  return 'light';
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (e) {}
}

export function exportFamilyDataJson(events: CalendarEvent[], shifts: ParentShift[]): void {
  const data = {
    appName: 'Családi Naptár & Beosztás',
    version: '4.0',
    exportedAt: new Date().toISOString(),
    note: 'Eszközfüggetlen, privát biztonsági mentés',
    events,
    shifts,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `csaladi_naptar_mentes_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFamilyDataJson(
  file: File
): Promise<{ events: CalendarEvent[]; shifts: ParentShift[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const events = Array.isArray(parsed.events) ? parsed.events : [];
        const shifts = Array.isArray(parsed.shifts) ? parsed.shifts : [];
        resolve({ events, shifts });
      } catch (err) {
        reject(new Error('Érvénytelen JSON fájlformátum.'));
      }
    };
    reader.onerror = () => reject(new Error('Fájlolvasási hiba történt.'));
    reader.readAsText(file);
  });
}

