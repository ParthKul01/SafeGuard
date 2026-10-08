import 'dotenv/config';
import { openDb } from '../database/db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:promote -- user@example.com');
  process.exitCode = 1;
} else {
  const db = openDb();
  const result = db.prepare("UPDATE users SET role='ADMIN',is_active=1 WHERE email=?").run(email);
  if (!result.changes) {
    console.error('No account found for ' + email + '. Register that account first, then run this command.');
    process.exitCode = 1;
  } else {
    console.log('Administrator access enabled for ' + email + '. Sign out and sign in again to refresh the session.');
  }
  db.close();
}
