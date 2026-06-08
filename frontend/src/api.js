// All event data lives in localStorage — no backend, no network required.

const KEY = 'mb-scanner.events';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

function save(events) {
  localStorage.setItem(KEY, JSON.stringify(events));
}

let _id = Math.max(0, ...load().map((e) => e.id)) + 1;

export function fetchEvents() {
  return Promise.resolve(load());
}

export function createEvent(data) {
  const events = load();
  const event = { ...normalize(data), id: _id++, createdAt: new Date().toISOString() };
  save([event, ...events]);
  return Promise.resolve(event);
}

export function updateEvent(id, data) {
  const events = load().map((e) => e.id === id ? { ...e, ...normalize(data) } : e);
  save(events);
  return Promise.resolve(events.find((e) => e.id === id));
}

export function deleteEvent(id) {
  save(load().filter((e) => e.id !== id));
  return Promise.resolve();
}

function normalize(d) {
  return {
    name: d.name ?? '',
    location: d.location ?? '',
    venue: d.venue ?? '',
    unit: d.unit ?? '',
    validFrom: d.validFrom ?? '',
    validTo: d.validTo ?? '',
    matchLocation: d.matchLocation !== false,
    matchVenue: !!d.matchVenue,
    matchUnit: !!d.matchUnit,
    matchDates: d.matchDates !== false,
  };
}

// --- Selected-event cache (for offline scanning) ---
const CACHE_KEY = 'mb-scanner.selected-event';

export function cacheSelectedEvent(event) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(event)); } catch { }
}

export function loadCachedEvent() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

export function clearCachedEvent() {
  localStorage.removeItem(CACHE_KEY);
}
