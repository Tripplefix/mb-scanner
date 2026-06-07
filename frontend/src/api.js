// Tiny API client + offline cache helper for events.

const CACHE_KEY = 'mb-scanner.events';

export async function fetchEvents() {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error('Failed to load events');
  return res.json();
}

export async function createEvent(data) {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
  return res.json();
}

export async function updateEvent(id, data) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function deleteEvent(id) {
  const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

// --- Offline cache for the selected event ---
// Once an event is loaded into the scanner, its config is persisted so the
// scanner keeps working with no network connection.

export function cacheSelectedEvent(event) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(event));
  } catch { /* ignore quota errors */ }
}

export function loadCachedEvent() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCachedEvent() {
  localStorage.removeItem(CACHE_KEY);
}
