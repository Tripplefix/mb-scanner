import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'events.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    location    TEXT,
    venue       TEXT,
    valid_from  TEXT,
    valid_to    TEXT,
    match_location INTEGER NOT NULL DEFAULT 1,
    match_venue    INTEGER NOT NULL DEFAULT 0,
    match_dates    INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const serialize = (row) => ({
  id: row.id,
  name: row.name,
  location: row.location,
  venue: row.venue,
  validFrom: row.valid_from,
  validTo: row.valid_to,
  matchLocation: !!row.match_location,
  matchVenue: !!row.match_venue,
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
    INSERT INTO events (name, location, venue, valid_from, valid_to, match_location, match_venue, match_dates)
    VALUES (@name, @location, @venue, @validFrom, @validTo, @matchLocation, @matchVenue, @matchDates)
  `);
  const info = stmt.run(normalize(e));
  return getEvent(info.lastInsertRowid);
};

export const updateEvent = (id, e) => {
  const stmt = db.prepare(`
    UPDATE events SET
      name = @name, location = @location, venue = @venue,
      valid_from = @validFrom, valid_to = @validTo,
      match_location = @matchLocation, match_venue = @matchVenue, match_dates = @matchDates
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
  validFrom: e.validFrom ?? null,
  validTo: e.validTo ?? null,
  matchLocation: e.matchLocation === false ? 0 : 1,
  matchVenue: e.matchVenue === true ? 1 : 0,
  matchDates: e.matchDates === false ? 0 : 1,
});

export default db;
