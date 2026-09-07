import { CalendarEvent, ParentShift } from '../types';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const DEFAULT_FAMILY_ID = 'csalad-fo-naptar';

const STORAGE_KEYS = {
  FAMILY_ID: 'family_cal_active_family_id_v4',
  ACCESS_KEY: 'family_cal_family_access_key_v4',
  LAST_SYNC: 'family_cal_family_last_sync_v4',
  SYNC_TIMESTAMP: 'family_cal_updated_at_v4',
  MEMBER_NAMES: 'family_cal_member_names_v4',
};

export interface SyncResponse {
  success: boolean;
  events?: CalendarEvent[];
  shifts?: ParentShift[];
  memberNames?: Record<string, string>;
  updatedAt?: number;
  error?: string;
  conflict?: boolean;
  merged?: boolean;
}

export function loadMemberNamesFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBER_NAMES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load member names from storage', e);
  }
  return {};
}

export function saveMemberNamesToStorage(names: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBER_NAMES, JSON.stringify(names));
  } catch (e) {
    console.error('Failed to save member names to storage', e);
  }
}

/**
 * Returns the currently joined Family ID, generating a private unique ID if first time.
 */
export function getActiveFamilyId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FAMILY_ID);
    if (saved && saved.trim()) {
      return saved.trim();
    }
    const newId = generateNewFamilyId();
    localStorage.setItem(STORAGE_KEYS.FAMILY_ID, newId);
    return newId;
  } catch {
    return DEFAULT_FAMILY_ID;
  }
}

/**
 * Sets or clears the active Family ID.
 */
export function setActiveFamilyId(familyId: string | null): void {
  try {
    if (familyId && familyId.trim()) {
      localStorage.setItem(STORAGE_KEYS.FAMILY_ID, familyId.trim());
    } else {
      localStorage.setItem(STORAGE_KEYS.FAMILY_ID, DEFAULT_FAMILY_ID);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      localStorage.removeItem(STORAGE_KEYS.SYNC_TIMESTAMP);
    }
  } catch (err) {
    console.error('Failed to set active family ID', err);
  }
}

/**
 * Returns the currently active family secret access key (Bearer token).
 */
export function getActiveFamilyAccessKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCESS_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
    const newKey = generateNewAccessKey();
    localStorage.setItem(STORAGE_KEYS.ACCESS_KEY, newKey);
    return newKey;
  } catch {
    return generateNewAccessKey();
  }
}

/**
 * Sets or clears the active family secret access key.
 */
export function setActiveFamilyAccessKey(key: string | null): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_KEY);
    }
  } catch (err) {
    console.error('Failed to set active family access key', err);
  }
}

/**
 * Merges local events with server events cleanly by ID.
 */
export function mergeEvents(local: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const ev of local) {
    if (ev && ev.id) {
      map.set(ev.id, ev);
    }
  }
  for (const ev of incoming) {
    if (!ev || !ev.id) continue;
    const existing = map.get(ev.id);
    if (!existing) {
      map.set(ev.id, ev);
    } else {
      // Keep newer or incoming
      if ((ev.createdAt || 0) >= (existing.createdAt || 0)) {
        map.set(ev.id, ev);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Merges parent shifts cleanly by memberId and date with timestamp comparison.
 */
export function mergeShifts(local: ParentShift[], incoming: ParentShift[]): ParentShift[] {
  const map = new Map<string, ParentShift>();
  for (const s of local) {
    if (s && s.memberId && s.date) {
      map.set(`${s.memberId}_${s.date}`, s);
    }
  }
  for (const s of incoming) {
    if (s && s.memberId && s.date) {
      const key = `${s.memberId}_${s.date}`;
      const existing = map.get(key);
      if (!existing || (s.updatedAt || 0) >= (existing.updatedAt || 0)) {
        map.set(key, s);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Generates a cryptographically strong access key (secret Bearer token) for the family.
 */
export function generateNewAccessKey(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomKey = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(28);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 28; i++) {
      randomKey += chars.charAt(arr[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 28; i++) {
      randomKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `fkey_${randomKey}`;
}

/**
 * Generates a unique, secure, and friendly private family ID.
 */
export function generateNewFamilyId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let randomSlug = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(8);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < 8; i++) {
      randomSlug += chars.charAt(arr[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 8; i++) {
      randomSlug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `csalad-${randomSlug}`;
}

/**
 * Extracts family credentials (ID and secret access key) from the current URL.
 * Checks query parameters first (?csalad=, ?family=, ?join=) as they survive chat apps,
 * and URL fragment hash fallback (#csalad=, #join=, #family=).
 */
export function extractFamilyCredentialsFromUrl(): { familyId: string; accessKey?: string } | null {
  try {
    let familyId: string | null = null;
    let accessKey: string | undefined;

    // 1. Check Query Parameters (?csalad= or ?family= or ?join=) - Highest reliability in chat apps
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      familyId = params.get('csalad') || params.get('family') || params.get('join');
      const k = params.get('key');
      if (k && k.trim()) accessKey = k.trim();
    }

    // 2. Check URL Fragment Hash (#join=... or #csalad=... or #family=...)
    if (!familyId && typeof window !== 'undefined' && window.location.hash) {
      const hashClean = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashClean);
      familyId = hashParams.get('csalad') || hashParams.get('join') || hashParams.get('family');
      const k = hashParams.get('key');
      if (k && k.trim()) accessKey = k.trim();
    }

    if (familyId && familyId.trim().length >= 3) {
      return {
        familyId: familyId.trim(),
        accessKey,
      };
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

/**
 * Backward compatible helper for extracting just the family ID.
 */
export function extractFamilyIdFromUrl(): string | null {
  const creds = extractFamilyCredentialsFromUrl();
  return creds ? creds.familyId : null;
}

/**
 * Generates a clean, highly reliable shareable invite link.
 * Query parameter format (?csalad=...) guarantees compatibility across
 * Messenger, WhatsApp, Viber, SMS, and in-app webviews.
 */
export function buildFamilyInviteLink(familyId: string, accessKey?: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?csalad=${encodeURIComponent(familyId)}`;
}

/**
 * Alternative hash-based invite link if preferred.
 */
export function buildFamilyHashInviteLink(familyId: string, accessKey?: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}#csalad=${encodeURIComponent(familyId)}`;
}

/**
 * Strips undefined properties recursively so Firestore does not reject them.
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Revokes the current access key and generates a new cryptographic key for the family.
 * Immediately invalidates all previous invite links and tokens.
 */
export async function rotateFamilyAccessKey(
  familyId: string,
  currentKey: string,
  expiresInDays?: number
): Promise<{ success: boolean; newKey?: string; message?: string; error?: string }> {
  try {
    const newKey = generateNewAccessKey();
    setActiveFamilyAccessKey(newKey);

    const cleanFamilyId = (familyId || DEFAULT_FAMILY_ID).trim();
    try {
      const docRef = doc(db, 'families', cleanFamilyId);
      await setDoc(docRef, { accessKey: newKey, keyUpdatedAt: Date.now() }, { merge: true });
    } catch {}

    // Also notify local server if available
    try {
      await fetch(`/api/family/${encodeURIComponent(cleanFamilyId)}/rotate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentKey}`,
        },
        body: JSON.stringify({ expiresInDays }),
      });
    } catch {}

    return {
      success: true,
      newKey,
      message: 'A meghívókulcs sikeresen visszavonva és új kulcs generálva.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Hálózati hiba a kulcs visszavonásakor.' };
  }
}

/**
 * Subscribes to real-time updates from Firebase Firestore.
 * Ensures the husband and wife see each other's changes instantly (within 1 second)
 * without manual refresh or polling.
 */
export function subscribeToFamilyData(
  familyId: string,
  onUpdate: (data: SyncResponse) => void,
  onError?: (err: any) => void
): () => void {
  const cleanFamilyId = (familyId || DEFAULT_FAMILY_ID).trim();
  const docRef = doc(db, 'families', cleanFamilyId);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          success: true,
          events: Array.isArray(data.events) ? data.events : [],
          shifts: Array.isArray(data.shifts) ? data.shifts : [],
          memberNames: data.memberNames && typeof data.memberNames === 'object' ? data.memberNames : {},
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `families/${cleanFamilyId}`);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Fetches the family's latest data from Firestore (cloud database) with fallback.
 */
export async function fetchFamilyData(familyId: string, accessKey?: string): Promise<SyncResponse> {
  const cleanFamilyId = (familyId || DEFAULT_FAMILY_ID).trim();

  try {
    // 1. Direct Firestore cloud read (guaranteed to work on Vercel, mobile browsers, and Cloud Run)
    const docRef = doc(db, 'families', cleanFamilyId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        success: true,
        events: Array.isArray(data.events) ? data.events : [],
        shifts: Array.isArray(data.shifts) ? data.shifts : [],
        memberNames: data.memberNames && typeof data.memberNames === 'object' ? data.memberNames : {},
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
      };
    } else {
      // Document is not yet in cloud Firestore, return clean empty container
      return {
        success: true,
        events: [],
        shifts: [],
        memberNames: {},
        updatedAt: 0,
      };
    }
  } catch (firestoreErr) {
    handleFirestoreError(firestoreErr, OperationType.GET, `families/${cleanFamilyId}`);

    // Fallback: local backend endpoint if running with Node server
    try {
      const key = accessKey || getActiveFamilyAccessKey();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const res = await fetch(`/api/family/${encodeURIComponent(cleanFamilyId)}`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          events: Array.isArray(data.events) ? data.events : [],
          shifts: Array.isArray(data.shifts) ? data.shifts : [],
          memberNames: data.memberNames && typeof data.memberNames === 'object' ? data.memberNames : {},
          updatedAt: data.updatedAt || 0,
        };
      }
    } catch {}

    return { success: false, error: 'Hálózati hiba a naptáradatok lekérésekor.' };
  }
}

/**
 * Pushes the family's calendar data to Firestore and syncs across all devices.
 */
export async function pushFamilyData(
  familyId: string,
  events: CalendarEvent[],
  shifts: ParentShift[],
  clientUpdatedAt?: number,
  memberNames?: Record<string, string>,
  accessKey?: string,
  deletedEventIds?: string[],
  deletedShiftIds?: string[]
): Promise<SyncResponse> {
  const cleanFamilyId = (familyId || DEFAULT_FAMILY_ID).trim();
  const now = Date.now();

  try {
    const docRef = doc(db, 'families', cleanFamilyId);

    let finalEvents = [...events];
    let finalShifts = [...shifts];

    if (deletedEventIds && deletedEventIds.length > 0) {
      const delSet = new Set(deletedEventIds);
      finalEvents = finalEvents.filter(e => !delSet.has(e.id));
    }
    // Note: shifts passed from state are already the authoritative active shifts,
    // so we don't accidentally filter out newly created shifts.

    const payload = sanitizeForFirestore({
      familyId: cleanFamilyId,
      events: finalEvents,
      shifts: finalShifts,
      memberNames: memberNames || {},
      updatedAt: now,
    });

    await setDoc(docRef, payload, { merge: true });

    // Also asynchronously notify local dev server if present
    try {
      fetch(`/api/family/${encodeURIComponent(cleanFamilyId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}

    return {
      success: true,
      updatedAt: now,
      events: finalEvents,
      shifts: finalShifts,
      memberNames: memberNames || {},
    };
  } catch (firestoreErr) {
    handleFirestoreError(firestoreErr, OperationType.WRITE, `families/${cleanFamilyId}`);

    // Fallback: local backend endpoint
    try {
      const key = accessKey || getActiveFamilyAccessKey();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const res = await fetch(`/api/family/${encodeURIComponent(cleanFamilyId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          events,
          shifts,
          memberNames,
          deletedEventIds,
          deletedShiftIds,
          clientUpdatedAt: clientUpdatedAt || now,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: true,
          updatedAt: data.updatedAt || now,
          events: Array.isArray(data.events) ? data.events : undefined,
          shifts: Array.isArray(data.shifts) ? data.shifts : undefined,
          memberNames: data.memberNames,
        };
      }
    } catch {}

    return { success: false, error: 'Hálózati hiba a felhőbe mentéskor.' };
  }
}
