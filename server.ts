import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  connectDB,
  createTask,
  deleteTask,
  listTasksByUser,
  updateTask,
  upsertUser,
} from './server/db.ts';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  type UserProfile,
} from './src/types/task.ts';

interface FirebaseClientConfig {
  apiKey: string;
  projectId: string;
}

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseClientConfig = JSON.parse(
  fs.readFileSync(firebaseConfigPath, 'utf8')
);

interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

interface CachedAuthEntry {
  profile: UserProfile;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedAuthEntry>();
const TOKEN_CACHE_TTL_MS = 4 * 60 * 1000;

function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

function isValidPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value);
}

function parseDueDate(value: unknown): { valid: boolean; value: string | null } {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: null };
  }
  if (typeof value !== 'string') {
    return { valid: false, value: null };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true, value: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, value: null };
  }
  const [year, month, day] = trimmed.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day;
  return isRealDate
    ? { valid: true, value: trimmed }
    : { valid: false, value: null };
}

function getJwtExpiryMs(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<UserProfile> {
  const tokenHash = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = tokenCache.get(tokenHash);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.profile;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    throw new Error('Invalid or expired Google authentication token');
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
    }>;
  };

  const account = data.users?.[0];
  if (!account?.localId) {
    throw new Error('Authentication account not found');
  }

  const email = account.email ?? '';
  const profile: UserProfile = {
    uid: account.localId,
    email,
    displayName: account.displayName || (email ? email.split('@')[0] : 'Google User'),
    photoUrl: account.photoUrl ?? '',
  };

  const jwtExp = getJwtExpiryMs(idToken);
  const expiresAt = jwtExp > now ? Math.min(jwtExp - 15_000, now + TOKEN_CACHE_TTL_MS) : now + TOKEN_CACHE_TTL_MS;
  if (expiresAt > now) {
    tokenCache.set(tokenHash, { profile, expiresAt });
  }

  if (tokenCache.size > 500) {
    for (const [key, entry] of tokenCache.entries()) {
      if (entry.expiresAt <= now) {
        tokenCache.delete(key);
      }
    }
  }

  return profile;
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in with Google.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const profile = await verifyFirebaseIdToken(token);
    try {
      await upsertUser(profile);
    } catch (dbErr) {
      console.error('Failed to sync user to database:', dbErr);
    }
    req.user = profile;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    res.status(401).json({ error: message });
  }
}

async function startServer(): Promise<void> {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '64kb' }));

  try {
    await connectDB();
  } catch (err) {
    console.warn('\n========================================');
    console.warn('⚠️  MONGODB ATLAS CONNECTION NOTICE:');
    console.warn(err instanceof Error ? err.message : String(err));
    console.warn('========================================\n');
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      let tasks = await listTasksByUser(userId);

      const statusParam = req.query.status;
      if (typeof statusParam === 'string' && statusParam !== 'All') {
        if (!isValidStatus(statusParam)) {
          res.status(400).json({ error: 'Invalid status filter.' });
          return;
        }
        tasks = tasks.filter((task) => task.status === statusParam);
      }

      const qParam = req.query.q;
      if (typeof qParam === 'string' && qParam.trim()) {
        const needle = qParam.trim().toLowerCase();
        tasks = tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(needle) ||
            task.description.toLowerCase().includes(needle)
        );
      }

      res.json({ tasks });
    } catch (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Failed to retrieve tasks.' });
    }
  });

  app.post('/api/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const rawDescription =
        typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      const rawStatus = req.body?.status ?? 'Planned';
      const rawPriority = req.body?.priority ?? 'Medium';
      const parsedDueDate = parseDueDate(req.body?.dueDate);

      if (!rawTitle) {
        res.status(400).json({ error: 'Task title is required.' });
        return;
      }
      if (rawTitle.length > 140) {
        res.status(400).json({ error: 'Task title must be 140 characters or fewer.' });
        return;
      }
      if (rawDescription.length > 1000) {
        res.status(400).json({ error: 'Description must be 1,000 characters or fewer.' });
        return;
      }
      if (!isValidStatus(rawStatus)) {
        res.status(400).json({
          error: 'Status must be one of: Planned, In Progress, Complete.',
        });
        return;
      }
      if (!isValidPriority(rawPriority)) {
        res.status(400).json({
          error: 'Priority must be one of: Low, Medium, High.',
        });
        return;
      }
      if (!parsedDueDate.valid) {
        res.status(400).json({
          error: 'Due date must be a valid date in YYYY-MM-DD format.',
        });
        return;
      }

      const task = await createTask(
        userId,
        rawTitle,
        rawDescription,
        rawStatus,
        rawPriority,
        parsedDueDate.value
      );
      res.status(201).json({ task });
    } catch (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ error: 'Failed to create task.' });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const taskId = String(req.params.id);
      if (!taskId) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }

      const updates: {
        title?: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        dueDate?: string | null;
      } = {};

      if (req.body?.title !== undefined) {
        if (typeof req.body.title !== 'string') {
          res.status(400).json({ error: 'Title must be a string.' });
          return;
        }
        const trimmedTitle = req.body.title.trim();
        if (!trimmedTitle) {
          res.status(400).json({ error: 'Task title cannot be empty.' });
          return;
        }
        if (trimmedTitle.length > 140) {
          res.status(400).json({ error: 'Task title must be 140 characters or fewer.' });
          return;
        }
        updates.title = trimmedTitle;
      }

      if (req.body?.description !== undefined) {
        if (typeof req.body.description !== 'string') {
          res.status(400).json({ error: 'Description must be a string.' });
          return;
        }
        const trimmedDescription = req.body.description.trim();
        if (trimmedDescription.length > 1000) {
          res.status(400).json({ error: 'Description must be 1,000 characters or fewer.' });
          return;
        }
        updates.description = trimmedDescription;
      }

      if (req.body?.status !== undefined) {
        if (!isValidStatus(req.body.status)) {
          res.status(400).json({
            error: 'Status must be one of: Planned, In Progress, Complete.',
          });
          return;
        }
        updates.status = req.body.status;
      }

      if (req.body?.priority !== undefined) {
        if (!isValidPriority(req.body.priority)) {
          res.status(400).json({
            error: 'Priority must be one of: Low, Medium, High.',
          });
          return;
        }
        updates.priority = req.body.priority;
      }

      if (req.body?.dueDate !== undefined) {
        const parsedDueDate = parseDueDate(req.body.dueDate);
        if (!parsedDueDate.valid) {
          res.status(400).json({
            error: 'Due date must be a valid date in YYYY-MM-DD format.',
          });
          return;
        }
        updates.dueDate = parsedDueDate.value;
      }

      if (
        updates.title === undefined &&
        updates.description === undefined &&
        updates.status === undefined &&
        updates.priority === undefined &&
        updates.dueDate === undefined
      ) {
        res.status(400).json({ error: 'No valid fields provided to update.' });
        return;
      }

      const updated = await updateTask(taskId, userId, updates);
      if (!updated) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      res.json({ task: updated });
    } catch (err) {
      console.error('Error updating task:', err);
      res.status(500).json({ error: 'Failed to update task.' });
    }
  });

  app.delete('/api/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const taskId = String(req.params.id);
      if (!taskId) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }

      const deleted = await deleteTask(taskId, userId);
      if (!deleted) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      res.json({ deleted: true, id: taskId });
    } catch (err) {
      console.error('Error deleting task:', err);
      res.status(500).json({ error: 'Failed to delete task.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`TaskFlow server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
