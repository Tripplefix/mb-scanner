import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets the SQLite file live on a persistent volume (e.g. Fly.io /data).
// Falls back to the backend dir for local development.
const dataDir = process.env.DATA_DIR || __dirname;
const db = new Database(join(dataDir, 'events.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    location    TEXT,
    venue       TEXT,
    unit        TEXT,
    valid_from  TEXT,
    valid_to    TEXT,
    match_location INTEGER NOT NULL DEFAULT 1,
    match_venue    INTEGER NOT NULL DEFAULT 0,
    match_unit     INTEGER NOT NULL DEFAULT 0,
    match_dates    INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate existing databases that predate the unit columns.
const cols = db.prepare("PRAGMA table_info(events)").all().map((r) => r.name);
if (!cols.includes('unit'))       db.exec("ALTER TABLE events ADD COLUMN unit TEXT");
if (!cols.includes('match_unit')) db.exec("ALTER TABLE events ADD COLUMN match_unit INTEGER NOT NULL DEFAULT 0");

const serialize = (row) => ({
  id: row.id,
  name: row.name,
  location: row.location,
  venue: row.venue,
  unit: row.unit,
  validFrom: row.valid_from,
  validTo: row.valid_to,
  matchLocation: !!row.match_location,
  matchVenue: !!row.match_venue,
  matchUnit: !!row.match_unit,
  matchDates: !!row.match_dates,
  createdAt: row.created_at,
});

export const listEvents = () =>
  db.prepare('SELECT * FROM events ORDER BY created_at DESC').all().map(serialize);

export const getEvent = (id) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  return row ? serialize(row) : null;
};

export const createEvent = (e) => {
  const stmt = db.prepare(`
    INSERT INTO events (name, location, venue, unit, valid_from, valid_to, match_location, match_venue, match_unit, match_dates)
    VALUES (@name, @location, @venue, @unit, @validFrom, @validTo, @matchLocation, @matchVenue, @matchUnit, @matchDates)
  `);
  const info = stmt.run(normalize(e));
  return getEvent(info.lastInsertRowid);
};

export const updateEvent = (id, e) => {
  const stmt = db.prepare(`
    UPDATE events SET
      name = @name, location = @location, venue = @venue, unit = @unit,
      valid_from = @validFrom, valid_to = @validTo,
      match_location = @matchLocation, match_venue = @matchVenue,
      match_unit = @matchUnit, match_dates = @matchDates
    WHERE id = @id
  `);
  stmt.run({ ...normalize(e), id });
  return getEvent(id);
};

export const deleteEvent = (id) =>
  db.prepare('DELETE FROM events WHERE id = ?').run(id).changes > 0;

const normalize = (e) => ({
  name: e.name ?? '',
  location: e.location ?? null,
  venue: e.venue ?? null,
  unit: e.unit ?? null,
  validFrom: e.validFrom ?? null,
  validTo: e.validTo ?? null,
  matchLocation: e.matchLocation === false ? 0 : 1,
  matchVenue: e.matchVenue === true ? 1 : 0,
  matchUnit: e.matchUnit === true ? 1 : 0,
  matchDates: e.matchDates === false ? 0 : 1,
});

export default db;
