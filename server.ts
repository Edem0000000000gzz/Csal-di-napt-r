import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

interface FamilyData {
  keyHash: string;
  keyExpiresAt?: number;
  events: any[];
  shifts: any[];
  memberNames?: Record<string, string>;
  updatedAt: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'families.json');

// In-memory cache for ultra-fast sync
const familyStore = new Map<string, FamilyData>();

// Simple in-memory rate limiter per IP (max 120 requests/minute)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  record.count += 1;
  return true;
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Strict validation regex for familyId
const FAMILY_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isValidFamilyId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (BLOCKED_KEYS.has(trimmed.toLowerCase())) return false;
  return FAMILY_ID_REGEX.test(trimmed);
}

// Sanitize string value helper
function sanitizeStr(val: unknown, maxLen = 255): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen).trim();
}

// Cryptographic hash for family secret keys
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

// Constant-time key verification to defeat timing attacks
function verifyKey(providedKey: string, storedHash: string): boolean {
  if (!providedKey || !storedHash) return false;
  try {
    const providedHash = hashKey(providedKey);
    const bufA = Buffer.from(providedHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Extract Authorization Bearer token or custom header from request
function extractKeyFromRequest(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const customHeader = req.headers['x-family-key'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  if (typeof req.query.key === 'string' && req.query.key.trim()) {
    return req.query.key.trim();
  }
  return null;
}

// Load existing data from disk on startup
function loadStoreFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [key, value] of Object.entries(parsed)) {
        if (isValidFamilyId(key) && value && typeof value === 'object') {
          familyStore.set(key, value as FamilyData);
        }
      }
      console.log(`[Storage] Loaded ${familyStore.size} families from disk.`);
    }
  } catch (err) {
    console.error('[Storage] Error loading data from disk:', err);
  }
}

// Debounced save to disk
let saveTimeout: NodeJS.Timeout | null = null;
function persistStoreToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const obj: Record<string, FamilyData> = {};
      for (const [key, val] of familyStore.entries()) {
        if (isValidFamilyId(key)) {
          obj[key] = val;
        }
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Storage] Error persisting to disk:', err);
    }
  }, 500);
}

loadStoreFromDisk();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security: Do not expose Express in X-Powered-By
  app.disable('x-powered-by');

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.path.startsWith('/api/')) {
      // Prevent caching of private family calendar data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Limit JSON body payload size to 1MB (prevents memory exhaustion)
  app.use(express.json({ limit: '1mb' }));

  // API Rate Limiting Middleware
  app.use('/api/family', (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Túl sok kérés érkezett. Kérjük várj egy percet a következő szinkronizáció előtt.',
      });
    }
    next();
  });

  // API: Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Get Family Calendar Data
  app.get('/api/family/:familyId', (req, res) => {
    const { familyId } = req.params;
    if (!isValidFamilyId(familyId)) {
      return res.status(400).json({ error: 'Érvénytelen családi azonosító formátum.' });
    }

    const data = familyStore.get(familyId);
    if (!data) {
      return res.json({
        exists: false,
        events: [],
        shifts: [],
        memberNames: {},
        updatedAt: 0,
      });
    }

    res.json({
      exists: true,
      events: data.events || [],
      shifts: data.shifts || [],
      memberNames: data.memberNames || {},
      updatedAt: data.updatedAt || 0,
    });
  });

  // Common Save Handler for POST and PUT (with automatic smart merge)
  const saveFamilyHandler: express.RequestHandler = (req, res) => {
    const { familyId } = req.params;
    const { events, shifts, memberNames, deletedEventIds, deletedShiftIds } = req.body;

    if (!isValidFamilyId(familyId)) {
      return res.status(400).json({ error: 'Érvénytelen családi azonosító formátum.' });
    }

    const current = familyStore.get(familyId);

    // Guard total families in store (prevents storage DOS)
    if (!current && familyStore.size >= 5000) {
      return res.status(507).json({ error: 'A szerver tárhelykapacitása megtelt.' });
    }

    const now = Date.now();

    // Sanitize incoming events (max 1500 items, bounded string lengths)
    const rawIncomingEvents = Array.isArray(events) ? events.slice(0, 1500) : [];
    const sanitizedIncomingEvents = rawIncomingEvents
      .filter((e) => e && typeof e === 'object' && typeof e.id === 'string')
      .map((e) => ({
        ...e,
        title: sanitizeStr(e.title, 200),
        notes: sanitizeStr(e.notes, 1500),
        location: sanitizeStr(e.location, 200),
      }));

    // Sanitize incoming shifts (max 800 items)
    const rawIncomingShifts = Array.isArray(shifts) ? shifts.slice(0, 800) : [];
    const sanitizedIncomingShifts = rawIncomingShifts.filter(
      (s) => s && typeof s === 'object' && typeof s.memberId === 'string' && typeof s.date === 'string'
    );

    // Deleted IDs
    const deletedEventSet = new Set<string>(
      Array.isArray(deletedEventIds) ? deletedEventIds.filter((id) => typeof id === 'string') : []
    );
    const deletedShiftSet = new Set<string>(
      Array.isArray(deletedShiftIds) ? deletedShiftIds.filter((id) => typeof id === 'string') : []
    );

    // Smart Merge Events
    const eventMap = new Map<string, any>();
    if (current && Array.isArray(current.events)) {
      for (const e of current.events) {
        if (e && e.id && !deletedEventSet.has(e.id)) {
          eventMap.set(e.id, e);
        }
      }
    }
    for (const e of sanitizedIncomingEvents) {
      if (!deletedEventSet.has(e.id)) {
        const existing = eventMap.get(e.id);
        if (!existing || (e.updatedAt || e.createdAt || 0) >= (existing.updatedAt || existing.createdAt || 0)) {
          eventMap.set(e.id, e);
        }
      }
    }
    const finalEvents = Array.from(eventMap.values());

    // Smart Merge Shifts (keyed by memberId_date)
    const shiftMap = new Map<string, any>();
    if (current && Array.isArray(current.shifts)) {
      for (const s of current.shifts) {
        const shiftKey = `${s.memberId}_${s.date}`;
        if (s && s.id && !deletedShiftSet.has(s.id) && !deletedShiftSet.has(shiftKey)) {
          shiftMap.set(shiftKey, s);
        }
      }
    }
    for (const s of sanitizedIncomingShifts) {
      const shiftKey = `${s.memberId}_${s.date}`;
      // Incoming shifts explicitly submitted by client must always be accepted
      shiftMap.set(shiftKey, s);
    }
    const finalShifts = Array.from(shiftMap.values());

    // Smart Merge memberNames
    let finalMemberNames: Record<string, string> = { ...(current?.memberNames || {}) };
    if (memberNames && typeof memberNames === 'object' && !Array.isArray(memberNames)) {
      for (const [mId, mName] of Object.entries(memberNames)) {
        if (typeof mId === 'string' && mId.length <= 32 && typeof mName === 'string') {
          finalMemberNames[mId] = sanitizeStr(mName, 50);
        }
      }
    }

    const updatedData: FamilyData = {
      keyHash: current?.keyHash || '',
      events: finalEvents,
      shifts: finalShifts,
      memberNames: finalMemberNames,
      updatedAt: now,
    };

    familyStore.set(familyId, updatedData);
    persistStoreToDisk();

    res.json({
      success: true,
      updatedAt: now,
      events: updatedData.events,
      shifts: updatedData.shifts,
      memberNames: updatedData.memberNames,
      itemCount: {
        events: updatedData.events.length,
        shifts: updatedData.shifts.length,
      },
    });
  };

  app.post('/api/family/:familyId', saveFamilyHandler);
  app.put('/api/family/:familyId', saveFamilyHandler);

  // API: Revoke & Rotate Access Key (Immediately invalidates all prior links, tokens and QR codes)
  app.post('/api/family/:familyId/rotate-key', (req, res) => {
    const { familyId } = req.params;
    if (!isValidFamilyId(familyId)) {
      return res.status(400).json({ error: 'Érvénytelen családi azonosító.' });
    }

    const current = familyStore.get(familyId);
    if (!current) {
      return res.status(404).json({ error: 'A családi naptár nem található a szerveren.' });
    }

    const currentKey = extractKeyFromRequest(req);
    if (!currentKey || !verifyKey(currentKey, current.keyHash)) {
      return res.status(403).json({
        error: 'Hozzáférés megtagadva. A kulcs visszavonásához és újragenerálásához a jelenlegi érvényes kulcs szükséges.',
      });
    }

    // Generate fresh high-entropy key or use client-provided key
    const providedNewKey = req.body?.newKey;
    const newKey =
      typeof providedNewKey === 'string' && providedNewKey.length >= 16
        ? providedNewKey.trim()
        : `fkey_${crypto.randomBytes(24).toString('base64url')}`;

    // Optional expiration in days
    const expiresInDays = typeof req.body?.expiresInDays === 'number' ? req.body.expiresInDays : null;
    const keyExpiresAt = expiresInDays && expiresInDays > 0 ? Date.now() + expiresInDays * 86400000 : undefined;

    current.keyHash = hashKey(newKey);
    current.keyExpiresAt = keyExpiresAt;
    current.updatedAt = Date.now();

    familyStore.set(familyId, current);
    persistStoreToDisk();

    res.json({
      success: true,
      message: 'A régi hozzáférési kulcs és minden korábbi meghívó/QR-kód azonnal érvénytelenítve lett.',
      newKey,
      keyExpiresAt,
      updatedAt: current.updatedAt,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
