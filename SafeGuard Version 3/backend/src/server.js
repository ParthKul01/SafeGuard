import 'dotenv/config';
import { createApp } from './app.js';
import { openDb } from './database/db.js';

const port = Number(process.env.PORT || 5000);
const db = openDb();
const server = createApp(db).listen(port, '127.0.0.1', () => {
  console.log('API running on http://127.0.0.1:' + port);
});

// Keep only current opt-in positions; never build a location history.
const locationCleanup = setInterval(() => {
  try { db.prepare("DELETE FROM user_live_locations WHERE updated_at < datetime('now','-90 seconds')").run(); }
  catch (error) { console.error('Location cleanup failed:', error); }
}, 15000);
locationCleanup.unref();

server.on('close', () => {
  clearInterval(locationCleanup);
  db.close();
});
server.on('error', (error) => {
  console.error('API failed to start on port ' + port + ': ' + error.message);
  process.exitCode = 1;
});
