import { Router } from 'express';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';

const PASSWORD_KEY_BYTES = 64;
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, PASSWORD_KEY_BYTES);
  return 'scrypt$' + salt.toString('base64url') + '$' + key.toString('base64url');
}

function passwordMatches(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, saltText, keyText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, 'base64url');
  const actual = scryptSync(password, Buffer.from(saltText, 'base64url'), PASSWORD_KEY_BYTES);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function issueSession(db, user) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now.toISOString());
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expiresAt);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role || 'USER' } };
}

function credentials(req) {
  return {
    name: typeof req.body?.name === 'string' ? req.body.name.trim() : '',
    email: typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '',
    password: typeof req.body?.password === 'string' ? req.body.password : '',
  };
}

export default function authRouter(db) {
  const router = Router();
  const requireAuth = authMiddleware(db);

  router.post('/register', (req, res, next) => {
    const { name, email, password } = credentials(req);
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter a name between 2 and 80 characters.' });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });

    try {
      const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hashPassword(password), 'USER');
      const user = { id: Number(result.lastInsertRowid), name, email, role: 'USER' };
      return res.status(201).json(issueSession(db, user));
    } catch (error) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'An account with that email already exists.' });
      return next(error);
    }
  });

  router.post('/login', (req, res, next) => {
    const { email, password } = credentials(req);
    if (email.length > 254 || !email || password.length > 128) return res.status(400).json({ error: 'Enter your email and password.' });
    try {
      const user = db.prepare('SELECT id, name, email, password_hash, role, is_active AS isActive FROM users WHERE email = ?').get(email);
      if (!user || !user.isActive || !passwordMatches(password, user.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
      return res.json(issueSession(db, user));
    } catch (error) { return next(error); }
  });

  router.get('/me', requireAuth, (req, res) => res.json({ user: req.authUser }));
  router.post('/logout', requireAuth, (req, res) => {
    db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(req.authTokenHash);
    db.prepare('UPDATE user_location_shares SET enabled=0, updated_at=datetime(\'now\') WHERE user_id=?').run(req.authUser.id);
    db.prepare('DELETE FROM user_live_locations WHERE user_id=?').run(req.authUser.id);
    res.json({ ok: true });
  });
  return router;
}
