import { createHash } from 'node:crypto';

export function authMiddleware(db) {
  return (req, res, next) => {
    const authorization = req.get('authorization') ?? '';
    const match = /^Bearer\s+([A-Za-z0-9_-]{40,100})$/i.exec(authorization);
    if (!match) return res.status(401).json({ error: 'Please log in to continue.' });

    const tokenHash = createHash('sha256').update(match[1]).digest('hex');
    const user = db.prepare(
      'SELECT u.id, u.name, u.email, u.role, u.is_active AS isActive ' +
      'FROM auth_sessions s JOIN users u ON u.id = s.user_id ' +
      'WHERE s.token_hash = ? AND s.expires_at > ?'
    ).get(tokenHash, new Date().toISOString());
    if (!user || !user.isActive) return res.status(401).json({ error: 'Your session is unavailable. Please log in again.' });

    user.isActive = Boolean(user.isActive);
    req.authUser = user;
    req.authTokenHash = tokenHash;
    next();
  };
}
