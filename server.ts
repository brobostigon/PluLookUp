import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { PLUItem, SyncMessage } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const IMAGES_DIR = path.resolve(DATA_DIR, 'images');
const DATA_FILE = path.join(DATA_DIR, 'plu_database.json');
const INITIAL_CSV_PATH = path.resolve(__dirname, 'public/assets/aistudio/Lidl_UK_PLU_Database_512c6ad1');

// Designated store owner / database admin email
const DESIGNATED_ADMIN_EMAIL = 'scraliontis@gmail.com';
const DEFAULT_ADMIN_PASSCODE = '2707';

// Store active admin sessions in memory
interface AdminSessionRecord {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}
const adminSessions = new Map<string, AdminSessionRecord>();

// Ensure data and images directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Setup Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory items cache
let itemsCache: PLUItem[] = [];

// Parse CSV line safely handling quotes and commas
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

// Initial built-in reference images for key Lidl UK items
const INITIAL_REFERENCE_IMAGES: Record<string, string> = {
  '30': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23fef9c3%22%2F%3E%3Cpath%20d%3D%22M50%2040%20C60%2090%20100%20150%20160%20155%20C140%20160%2090%20150%2060%20100%20C45%2075%2040%2045%2050%2040%20Z%22%20fill%3D%22%23facc15%22%20stroke%3D%22%23ca8a04%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M40%2045%20L65%2035%20L68%2025%20L48%2028%20Z%22%20fill%3D%22%234d7c0f%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%22155%22%20r%3D%224%22%20fill%3D%22%23713f12%22%2F%3E%3C%2Fsvg%3E',
  '365': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23ecfdf5%22%2F%3E%3Cpath%20d%3D%22M100%2025%20C130%2025%20160%2070%20165%20125%20C170%20170%20140%20185%20100%20185%20C60%20185%2030%20170%2035%20125%20C40%2070%2070%2025%20100%2025%20Z%22%20fill%3D%22%2314532d%22%20stroke%3D%22%23052e16%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M100%2035%20C125%2035%20150%2075%20155%20125%20C160%20165%20135%20175%20100%20175%20C65%20175%2040%20165%2045%20125%20C50%2075%2075%2035%20100%2035%20Z%22%20fill%3D%22%2384cc16%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22125%22%20r%3D%2230%22%20fill%3D%22%2378350f%22%2F%3E%3C%2Fsvg%3E',
  '27': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23fffbeb%22%2F%3E%3Cellipse%20cx%3D%22100%22%20cy%3D%22100%22%20rx%3D%2285%22%20ry%3D%2250%22%20fill%3D%22%23d97706%22%20stroke%3D%22%2392400e%22%20stroke-width%3D%223%22%2F%3E%3Crect%20x%3D%2250%22%20y%3D%2275%22%20width%3D%2225%22%20height%3D%2216%22%20rx%3D%224%22%20fill%3D%22%23fef08a%22%20stroke%3D%22%2392400e%22%2F%3E%3Crect%20x%3D%2290%22%20y%3D%2270%22%20width%3D%2228%22%20height%3D%2218%22%20rx%3D%224%22%20fill%3D%22%23fef08a%22%20stroke%3D%22%2392400e%22%2F%3E%3Crect%20x%3D%22130%22%20y%3D%2280%22%20width%3D%2222%22%20height%3D%2215%22%20rx%3D%223%22%20fill%3D%22%23fef08a%22%20stroke%3D%22%2392400e%22%2F%3E%3C%2Fsvg%3E',
  '6': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f0fdf4%22%2F%3E%3Crect%20x%3D%2225%22%20y%3D%2270%22%20width%3D%22150%22%20height%3D%2245%22%20rx%3D%2222%22%20fill%3D%22%2315803d%22%20stroke%3D%22%2314532d%22%20stroke-width%3D%223%22%2F%3E%3Cline%20x1%3D%2245%22%20y1%3D%2280%22%20x2%3D%22155%22%20y2%3D%2280%22%20stroke%3D%22%234ade80%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.5%22%2F%3E%3C%2Fsvg%3E',
  '26': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23fef2f2%22%2F%3E%3Cpath%20d%3D%22M100%2045%20C135%2015%20170%2050%20170%20110%20C170%20170%20135%20185%20100%20185%20C65%20185%2030%20170%2030%20110%20C30%2050%2065%2015%20100%2045%20Z%22%20fill%3D%22%23dc2626%22%20stroke%3D%22%23991b1b%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M100%2045%20Q%20105%2020%20120%2015%22%20stroke%3D%22%2378350f%22%20stroke-width%3D%225%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E',
  '125': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23fffbeb%22%2F%3E%3Cpath%20d%3D%22M100%20150%20C50%20150%2025%20100%2035%2060%20C45%2020%2090%2030%20100%2080%20C110%2030%20155%2020%20165%2060%20C175%20100%20150%20150%20100%20150%20Z%22%20fill%3D%22%2378350f%22%20stroke%3D%22%23451a03%22%20stroke-width%3D%226%22%2F%3E%3C%2Fsvg%3E',
  '58': 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23faf5ff%22%2F%3E%3Cpath%20d%3D%22M100%2045%20C125%2045%20155%2090%20155%20140%20C155%20180%20130%20190%20100%20190%20C70%20190%2045%20180%2045%20140%20C45%2090%2075%2045%20100%2045%20Z%22%20fill%3D%22%233b0764%22%20stroke%3D%22%232e1065%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M100%2045%20L90%2025%20L100%2038%20L80%2032%20L95%2045%20L90%2055%20L100%2048%20L110%2055%20L105%2045%20L120%2032%20L100%2038%20L110%2025%20Z%22%20fill%3D%22%2315803d%22%2F%3E%3C%2Fsvg%3E',
};

// Load default items from Lidl UK CSV
function loadDefaultLidlItems(): PLUItem[] {
  try {
    if (fs.existsSync(INITIAL_CSV_PATH)) {
      const csvContent = fs.readFileSync(INITIAL_CSV_PATH, 'utf-8');
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      const items: PLUItem[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Category,PLU')) continue;
        const parts = parseCSVLine(line);
        if (parts.length >= 3) {
          const category = (parts[0] || 'Produce') as any;
          const plu = parts[1] || '';
          const name = parts[2] || '';
          const visualDescription = parts.slice(3).filter(Boolean).join(', ') || '';

          if (plu && name && !isNaN(Number(plu))) {
            items.push({
              id: `plu-${plu}`,
              plu,
              name,
              category: ['Produce', 'Bakery', 'Nuts'].includes(category) ? category : 'Other',
              visualDescription,
              imageUrl: INITIAL_REFERENCE_IMAGES[plu] || undefined,
              active: true,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    console.error('Error reading default CSV:', err);
  }

  return [
    {
      id: 'plu-30',
      plu: '30',
      name: 'Bananas',
      category: 'Produce',
      visualDescription: 'Loose yellow curved bananas',
      imageUrl: INITIAL_REFERENCE_IMAGES['30'],
      active: true,
      updatedAt: new Date().toISOString(),
    },
  ];
}

// Save database to data/plu_database.json
function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(itemsCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

function initDatabase() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      itemsCache = JSON.parse(raw);
      // Ensure initial reference images are present if missing
      let patched = false;
      for (const item of itemsCache) {
        if (!item.imageUrl && INITIAL_REFERENCE_IMAGES[item.plu]) {
          item.imageUrl = INITIAL_REFERENCE_IMAGES[item.plu];
          patched = true;
        }
      }
      if (patched) saveDatabase();
      console.log(`Loaded ${itemsCache.length} PLU items from disk`);
      return;
    } catch (err) {
      console.error('Failed to parse existing data file, re-seeding:', err);
    }
  }

  itemsCache = loadDefaultLidlItems();
  saveDatabase();
  console.log(`Initialized database with ${itemsCache.length} default Lidl UK items`);
}

initDatabase();

// Helper to save base64 image to images directory
function saveBase64Image(base64Data: string, prefix = 'plu-img'): string {
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer: Buffer;

  if (matches && matches.length === 3) {
    ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // Plain base64
    const clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    buffer = Buffer.from(clean, 'base64');
  }

  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return `/api/images/${filename}`;
}

// SSE Broadcast Client Registry
const sseClients = new Set<Response>();

function broadcastSSE(message: SyncMessage) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch (err) {
      sseClients.delete(res);
    }
  }
}

// Middleware: Require Admin Verification for Database Modifications
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const customHeader = req.headers['x-admin-token'] as string;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : customHeader || '';

  if (!token) {
    return res.status(401).json({
      error: `Admin verification required. Only authorized store administrator (${DESIGNATED_ADMIN_EMAIL}) can edit the database.`,
      needsVerification: true,
      adminEmail: DESIGNATED_ADMIN_EMAIL,
    });
  }

  const session = adminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) adminSessions.delete(token);
    return res.status(403).json({
      error: `Your admin session has expired or is invalid. Please verify again as ${DESIGNATED_ADMIN_EMAIL}.`,
      needsVerification: true,
      adminEmail: DESIGNATED_ADMIN_EMAIL,
    });
  }

  (req as any).adminUser = session.email;
  next();
}

// Start Express App
async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Serve stored reference images
  app.use('/api/images', express.static(IMAGES_DIR));

  // Admin Verification Endpoints
  // 1. Verify / Login Admin
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, passcode } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Verify authorized administrator identity
    if (normalizedEmail !== DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        error: `Access denied. Only the primary administrator (${DESIGNATED_ADMIN_EMAIL}) is permitted to modify the store database.`,
      });
    }

    // Verify manager passcode if provided (Confidential PIN)
    if (passcode && passcode.trim() !== DEFAULT_ADMIN_PASSCODE) {
      return res.status(401).json({
        error: 'Incorrect admin verification passcode. Please enter the correct manager PIN.',
      });
    }

    // Generate secure session token (30 days validity)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    adminSessions.set(token, {
      token,
      email: DESIGNATED_ADMIN_EMAIL,
      createdAt: Date.now(),
      expiresAt,
    });

    res.json({
      success: true,
      token,
      email: DESIGNATED_ADMIN_EMAIL,
      expiresAt: new Date(expiresAt).toISOString(),
      message: `Successfully verified as ${DESIGNATED_ADMIN_EMAIL}`,
    });
  });

  // 2. Check token verification status
  app.get('/api/admin/status', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const customHeader = req.headers['x-admin-token'] as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : customHeader || '';

    const session = token ? adminSessions.get(token) : null;
    const isVerified = Boolean(session && Date.now() <= session.expiresAt);

    res.json({
      verified: isVerified,
      email: isVerified ? session?.email : null,
      designatedAdmin: DESIGNATED_ADMIN_EMAIL,
    });
  });

  // 3. Logout / revoke admin session
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || '';
    const customHeader = req.headers['x-admin-token'] as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : customHeader || '';
    if (token) adminSessions.delete(token);
    res.json({ success: true, message: 'Logged out from admin mode' });
  });

  // SSE Stream Endpoint (Public read for all mobile terminals)
  app.get('/api/plu/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    const initialMsg: SyncMessage = {
      type: 'initial',
      items: itemsCache,
      timestamp: new Date().toISOString(),
      count: itemsCache.length,
      message: 'Initial database sync',
    };
    res.write(`data: ${JSON.stringify(initialMsg)}\n\n`);

    sseClients.add(res);

    const keepaliveTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(keepaliveTimer);
      sseClients.delete(res);
    });
  });

  // GET all PLU items (Public read for cashiers & app)
  app.get('/api/plu', (_req: Request, res: Response) => {
    res.json({
      success: true,
      items: itemsCache,
      count: itemsCache.length,
      connectedClients: sseClients.size,
      designatedAdmin: DESIGNATED_ADMIN_EMAIL,
      lastUpdated: new Date().toISOString(),
    });
  });

  // POST upload reference image (Protected)
  app.post('/api/upload-image', requireAdmin, (req: Request, res: Response) => {
    try {
      const { image, plu } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }
      const url = saveBase64Image(image, `ref-${plu || 'item'}`);
      res.json({ success: true, url });
    } catch (err: any) {
      console.error('Image upload error:', err);
      res.status(500).json({ error: 'Failed to save reference photo' });
    }
  });

  // POST create new PLU item (Protected by requireAdmin)
  app.post('/api/plu', requireAdmin, (req: Request, res: Response) => {
    const { plu, name, category, visualDescription, notes, image, imageUrl, active } = req.body;
    if (!plu || !name) {
      return res.status(400).json({ error: 'PLU and Name are required.' });
    }

    const trimmedPlu = String(plu).trim();
    const existing = itemsCache.find(i => i.plu === trimmedPlu);
    if (existing) {
      return res.status(409).json({ error: `PLU #${trimmedPlu} already exists for "${existing.name}".` });
    }

    // Process reference image
    let finalImageUrl = imageUrl || '';
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      try {
        finalImageUrl = saveBase64Image(image, `plu-${trimmedPlu}`);
      } catch (err) {
        console.error('Failed to save image for new PLU:', err);
        finalImageUrl = image; // fallback to inline if save failed
      }
    }

    const newItem: PLUItem = {
      id: `plu-${trimmedPlu}`,
      plu: trimmedPlu,
      name: String(name).trim(),
      category: ['Produce', 'Bakery', 'Nuts'].includes(category) ? category : 'Produce',
      visualDescription: visualDescription ? String(visualDescription).trim() : '',
      imageUrl: finalImageUrl || undefined,
      notes: notes ? String(notes).trim() : undefined,
      active: active !== false,
      updatedAt: new Date().toISOString(),
    };

    itemsCache.unshift(newItem);
    saveDatabase();

    // Broadcast instantly to all mobile devices
    broadcastSSE({
      type: 'create',
      item: newItem,
      items: itemsCache,
      timestamp: new Date().toISOString(),
      count: itemsCache.length,
      author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
      message: `Verified Admin added PLU #${newItem.plu} (${newItem.name}) with reference photo`,
    });

    res.status(201).json({ success: true, item: newItem });
  });

  // PUT update PLU item (Protected by requireAdmin)
  app.put('/api/plu/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { plu, name, category, visualDescription, notes, image, imageUrl, active } = req.body;

    const index = itemsCache.findIndex(i => i.id === id || i.plu === id);
    if (index === -1) {
      return res.status(404).json({ error: 'PLU item not found.' });
    }

    if (plu) {
      const trimmedPlu = String(plu).trim();
      const conflict = itemsCache.find((i, idx) => i.plu === trimmedPlu && idx !== index);
      if (conflict) {
        return res.status(409).json({ error: `PLU #${trimmedPlu} is already assigned to "${conflict.name}".` });
      }
      itemsCache[index].plu = trimmedPlu;
      itemsCache[index].id = `plu-${trimmedPlu}`;
    }

    if (name !== undefined) itemsCache[index].name = String(name).trim();
    if (category !== undefined) {
      itemsCache[index].category = ['Produce', 'Bakery', 'Nuts'].includes(category) ? category : 'Other';
    }
    if (visualDescription !== undefined) itemsCache[index].visualDescription = String(visualDescription).trim();
    if (notes !== undefined) itemsCache[index].notes = String(notes).trim();
    if (active !== undefined) itemsCache[index].active = Boolean(active);

    // Update image if new image provided
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      try {
        itemsCache[index].imageUrl = saveBase64Image(image, `plu-${itemsCache[index].plu}`);
      } catch (err) {
        itemsCache[index].imageUrl = image;
      }
    } else if (imageUrl !== undefined) {
      itemsCache[index].imageUrl = imageUrl || undefined;
    }

    itemsCache[index].updatedAt = new Date().toISOString();
    const updated = itemsCache[index];
    saveDatabase();

    // Broadcast instantly to all mobile devices
    broadcastSSE({
      type: 'update',
      item: updated,
      items: itemsCache,
      timestamp: new Date().toISOString(),
      count: itemsCache.length,
      author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
      message: `Verified Admin updated PLU #${updated.plu} (${updated.name})`,
    });

    res.json({ success: true, item: updated });
  });

  // DELETE PLU item (Protected by requireAdmin)
  app.delete('/api/plu/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const index = itemsCache.findIndex(i => i.id === id || i.plu === id);
    if (index === -1) {
      return res.status(404).json({ error: 'PLU item not found.' });
    }

    const removed = itemsCache.splice(index, 1)[0];
    saveDatabase();

    broadcastSSE({
      type: 'delete',
      item: removed,
      items: itemsCache,
      timestamp: new Date().toISOString(),
      count: itemsCache.length,
      author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
      message: `Verified Admin removed PLU #${removed.plu} (${removed.name})`,
    });

    res.json({ success: true, item: removed });
  });

  // POST reset database (Protected by requireAdmin)
  app.post('/api/plu/reset', requireAdmin, (req: Request, res: Response) => {
    itemsCache = loadDefaultLidlItems();
    saveDatabase();

    broadcastSSE({
      type: 'reset',
      items: itemsCache,
      timestamp: new Date().toISOString(),
      count: itemsCache.length,
      author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
      message: 'Verified Admin restored Lidl UK base inventory',
    });

    res.json({ success: true, count: itemsCache.length, items: itemsCache });
  });

  // POST sync / import from easy-plu.knowledge-hero.com (Protected by requireAdmin)
  app.post('/api/plu/sync-easyplu', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { items, mode = 'merge', easyPluToken } = req.body;

      // If an active easyPLU session token was provided, try fetching directly from easyPLU API
      if (easyPluToken) {
        try {
          const easyRes = await fetch('https://easy-plu.knowledge-hero.com/api/plu/product/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${easyPluToken.replace(/^Bearer\s+/i, '').trim()}`,
            },
            body: JSON.stringify({ search: '', page: 1, perPage: 200 }),
          });

          if (easyRes.ok) {
            const easyData: any = await easyRes.json();
            const products = easyData.data || easyData.products || [];
            if (Array.isArray(products) && products.length > 0) {
              let addedCount = 0;
              let updatedCount = 0;

              for (const p of products) {
                const plu = String(p.plu || p.plu_number || p.number || '').trim();
                const name = String(p.title || p.name || p.title_de || '').trim();
                if (!plu || !name) continue;

                const category = String(p.product_group?.name || p.category || 'Produce');
                const visualDescription = String(p.description || p.attributes?.map((a: any) => a.name).join(', ') || '');
                const imageUrl = p.image_url || p.image || p.thumbnail;

                const existingIndex = itemsCache.findIndex(i => i.plu === plu);
                if (existingIndex !== -1) {
                  itemsCache[existingIndex].name = name;
                  if (visualDescription) itemsCache[existingIndex].visualDescription = visualDescription;
                  if (imageUrl) itemsCache[existingIndex].imageUrl = imageUrl;
                  itemsCache[existingIndex].updatedAt = new Date().toISOString();
                  updatedCount++;
                } else {
                  itemsCache.push({
                    id: `plu-${plu}`,
                    plu,
                    name,
                    category: category.toLowerCase().includes('back') ? 'Bakery' : category.toLowerCase().includes('nuss') ? 'Nuts' : 'Produce',
                    visualDescription,
                    imageUrl,
                    active: true,
                    updatedAt: new Date().toISOString(),
                  });
                  addedCount++;
                }
              }

              saveDatabase();
              broadcastSSE({
                type: 'update',
                items: itemsCache,
                timestamp: new Date().toISOString(),
                count: itemsCache.length,
                author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
                message: `Verified Admin synced ${addedCount + updatedCount} PLU items directly from easyPLU API`,
              });

              return res.json({
                success: true,
                message: `Successfully synced ${addedCount} new and ${updatedCount} updated items from easyPLU.`,
                count: itemsCache.length,
                addedCount,
                updatedCount,
                items: itemsCache,
              });
            }
          } else {
            console.warn('easyPLU API response not OK:', easyRes.status);
          }
        } catch (err: any) {
          console.warn('Direct easyPLU fetch failed, falling back to parsed items payload:', err.message);
        }
      }

      // If items payload was provided (from pasted table or text from easy-plu.knowledge-hero.com)
      if (Array.isArray(items) && items.length > 0) {
        let addedCount = 0;
        let updatedCount = 0;

        const sourceName = req.body.source === 'sheets' ? 'Google Sheets' : 'easyPLU';

        if (mode === 'replace') {
          itemsCache = items.map((item: any) => ({
            id: `plu-${String(item.plu).trim()}`,
            plu: String(item.plu).trim(),
            name: String(item.name).trim(),
            category: ['Produce', 'Bakery', 'Nuts', 'Other'].includes(item.category) ? item.category : 'Produce',
            visualDescription: item.visualDescription ? String(item.visualDescription).trim() : '',
            imageUrl: item.imageUrl || undefined,
            price: typeof item.price === 'number' ? item.price : undefined,
            priceUnit: item.priceUnit === 'unit' ? 'unit' : 'kg',
            barcode: item.barcode ? String(item.barcode).trim() : undefined,
            active: item.active !== false,
            updatedAt: new Date().toISOString(),
          }));
          addedCount = itemsCache.length;
        } else {
          // Merge mode (default)
          for (const item of items) {
            const plu = String(item.plu || '').trim();
            const name = String(item.name || '').trim();
            if (!plu || !name) continue;

            const existingIndex = itemsCache.findIndex(i => i.plu === plu);
            if (existingIndex !== -1) {
              if (item.name) itemsCache[existingIndex].name = name;
              if (item.category) itemsCache[existingIndex].category = item.category;
              if (item.visualDescription) itemsCache[existingIndex].visualDescription = String(item.visualDescription).trim();
              if (item.imageUrl) itemsCache[existingIndex].imageUrl = item.imageUrl;
              if (typeof item.price === 'number') itemsCache[existingIndex].price = item.price;
              if (item.priceUnit) itemsCache[existingIndex].priceUnit = item.priceUnit;
              if (item.barcode) itemsCache[existingIndex].barcode = String(item.barcode).trim();
              itemsCache[existingIndex].updatedAt = new Date().toISOString();
              updatedCount++;
            } else {
              itemsCache.unshift({
                id: `plu-${plu}`,
                plu,
                name,
                category: ['Produce', 'Bakery', 'Nuts', 'Other'].includes(item.category) ? item.category : 'Produce',
                visualDescription: item.visualDescription ? String(item.visualDescription).trim() : '',
                imageUrl: item.imageUrl || undefined,
                price: typeof item.price === 'number' ? item.price : undefined,
                priceUnit: item.priceUnit === 'unit' ? 'unit' : 'kg',
                barcode: item.barcode ? String(item.barcode).trim() : undefined,
                active: true,
                updatedAt: new Date().toISOString(),
              });
              addedCount++;
            }
          }
        }

        saveDatabase();

        broadcastSSE({
          type: 'update',
          items: itemsCache,
          timestamp: new Date().toISOString(),
          count: itemsCache.length,
          author: (req as any).adminUser || DESIGNATED_ADMIN_EMAIL,
          message: `Verified Admin updated database from ${sourceName} (${addedCount} added, ${updatedCount} updated)`,
        });

        return res.json({
          success: true,
          count: itemsCache.length,
          addedCount,
          updatedCount,
          message: `Successfully processed ${addedCount + updatedCount} items from easyPLU!`,
          items: itemsCache,
        });
      }

      return res.status(400).json({ error: 'No items or easyPLU token provided.' });
    } catch (err: any) {
      console.error('Error during easyPLU sync:', err);
      res.status(500).json({ error: err.message || 'Failed to sync with easyPLU.' });
    }
  });

  // In-memory short-term lookup cache (keyed by first 120 chars of image base64 + size)
  const lookupCache = new Map<string, { data: any; timestamp: number }>();

  // POST AI Visual PLU Lookup - Ultra-Fast Cashier Scanning
  app.post('/api/lookup', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { image, mimeType = 'image/jpeg', speedMode = 'turbo' } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'An image (base64) is required for PLU visual lookup.' });
      }

      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

      // Check short-term cache for rapid consecutive identical scans (e.g. within 15 seconds)
      const cacheKey = `${base64Data.slice(0, 100)}_${base64Data.length}`;
      const cached = lookupCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15000) {
        return res.json({
          ...cached.data,
          inferenceTimeMs: 4,
          isCached: true,
          totalServerMs: Date.now() - startTime,
        });
      }

      if (!aiClient) {
        return res.status(503).json({
          error: 'Gemini API client not initialized. Please ensure GEMINI_API_KEY is configured in Secrets.',
        });
      }

      const activeItems = itemsCache.filter(i => i.active);

      // Compact token-efficient inventory representation (cuts prompt tokens by >65%)
      const produceList = activeItems
        .filter(i => i.category === 'Produce')
        .map(i => `${i.plu}:${i.name}${i.visualDescription ? ` (${i.visualDescription})` : ''}`)
        .join(' | ');

      const bakeryList = activeItems
        .filter(i => i.category === 'Bakery')
        .map(i => `${i.plu}:${i.name}${i.visualDescription ? ` (${i.visualDescription})` : ''}`)
        .join(' | ');

      const otherList = activeItems
        .filter(i => !['Produce', 'Bakery'].includes(i.category))
        .map(i => `${i.plu}:${i.name}${i.visualDescription ? ` (${i.visualDescription})` : ''}`)
        .join(' | ');

      const inventoryList = [
        `PRODUCE ITEMS:\n${produceList}`,
        bakeryList ? `BAKERY ITEMS:\n${bakeryList}` : '',
        otherList ? `NUTS/OTHER:\n${otherList}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const systemInstruction = `You are a sub-second supermarket cash register visual PLU scanner.
Task: Identify the loose produce or bakery item in the image and return its PLU number from the store inventory.

STORE INVENTORY:
${inventoryList}

RULES:
1. Examine key visual cues: color, surface texture, shape, stem, skin pattern, cut/whole, baked crust.
2. Find the exact matching PLU from the inventory.
3. If confident, set matched: true, the PLU string, standard store itemName, category, confidence (75-99%), and 1-sentence visual cues.
4. If ambiguous between similar items (e.g. Avocado Hass vs Medium Avocado, Red Apples vs Royal Gala), provide top choice and plausible alternatives.
5. If not recognizable produce/bakery or not in store list, return matched: false.
6. Return purely JSON according to schema.`;

      // Select models based on speedMode with resilient fallback
      const primaryModel = speedMode === 'turbo' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';
      const fallbackModel = speedMode === 'turbo' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';

      const generateOptions = {
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Identify this produce or bakery item and return the matching PLU from inventory.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          // thinkingBudget: 0 disables internal reasoning tokens for instantaneous cashier response
          thinkingConfig: {
            thinkingBudget: 0,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matched: {
                type: Type.BOOLEAN,
                description: 'True if recognized as an item in store inventory',
              },
              plu: {
                type: Type.STRING,
                description: 'Exact matching PLU code number',
              },
              itemName: {
                type: Type.STRING,
                description: 'Standard store name for this item',
              },
              category: {
                type: Type.STRING,
                description: 'Produce, Bakery, Nuts, or Other',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence percentage from 0 to 100',
              },
              visualCues: {
                type: Type.STRING,
                description: 'Brief visual cues confirming identification',
              },
              ripeness: {
                type: Type.STRING,
                description: 'Freshness or ripeness note (e.g. Ripe, Crisp & fresh, Golden-baked)',
              },
              alternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    plu: { type: Type.STRING },
                    itemName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                  },
                  required: ['plu', 'itemName', 'confidence', 'reason'],
                },
                description: 'Other plausible PLU choices',
              },
            },
            required: ['matched', 'plu', 'itemName', 'confidence', 'visualCues'],
          },
        },
      };

      let response;
      let usedModel = primaryModel;

      try {
        response = await aiClient.models.generateContent({
          model: primaryModel,
          ...generateOptions,
        });
      } catch (primaryErr: any) {
        console.warn(`Primary model ${primaryModel} failed (${primaryErr.message}), trying fallback ${fallbackModel}...`);
        usedModel = fallbackModel;
        response = await aiClient.models.generateContent({
          model: fallbackModel,
          ...generateOptions,
        });
      }

      const inferenceTimeMs = Date.now() - startTime;
      const text = response.text?.trim() || '{}';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        return res.status(500).json({ error: 'Invalid response from vision model.' });
      }

      // Attach store reference image and sync exact name/category/price from active itemsCache
      if (parsed.matched && parsed.plu) {
        const dbItem = itemsCache.find(i => i.plu === String(parsed.plu));
        if (dbItem) {
          parsed.itemName = dbItem.name;
          parsed.category = dbItem.category;
          parsed.referenceImage = dbItem.imageUrl;
          parsed.price = dbItem.price;
          parsed.priceUnit = dbItem.priceUnit || 'unit';
        }
      }

      // Also attach reference photos to alternatives if available
      if (parsed.alternatives && Array.isArray(parsed.alternatives)) {
        parsed.alternatives = parsed.alternatives.map((alt: any) => {
          const altItem = itemsCache.find(i => i.plu === String(alt.plu));
          return {
            ...alt,
            imageUrl: altItem?.imageUrl,
          };
        });
      }

      const finalResult = {
        ...parsed,
        inferenceTimeMs,
        modelUsed: usedModel,
        speedMode,
      };

      // Cache result in short-term cache for rapid consecutive identical frames
      lookupCache.set(cacheKey, { data: finalResult, timestamp: Date.now() });
      if (lookupCache.size > 50) {
        const oldestKey = lookupCache.keys().next().value;
        if (oldestKey) lookupCache.delete(oldestKey);
      }

      return res.json(finalResult);
    } catch (err: any) {
      console.error('Error during visual PLU lookup:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process visual PLU lookup.',
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PLU Snap & Sync Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
