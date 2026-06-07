import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../api.js';

const EMPTY = {
  name: '', location: '', venue: '', validFrom: '', validTo: '',
  matchLocation: true, matchVenue: false, matchDates: true,
};

export default function Admin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const reload = () => fetchEvents().then(setEvents).catch(() => setError('Failed to load events'));
  useEffect(() => { reload(); }, []);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) await updateEvent(editingId, form);
      else await createEvent(form);
      setForm(EMPTY);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (ev) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name || '', location: ev.location || '', venue: ev.venue || '',
      validFrom: ev.validFrom || '', validTo: ev.validTo || '',
      matchLocation: ev.matchLocation, matchVenue: ev.matchVenue, matchDates: ev.matchDates,
    });
  };

  const remove = async (id) => {
    if (!confirm('Delete this event?')) return;
    await deleteEvent(id);
    if (editingId === id) { setEditingId(null); setForm(EMPTY); }
    reload();
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>Events — Admin</h1>
        <Link to="/" className="link">Scanner</Link>
      </header>

      <form className="card" onSubmit={submit}>
        <h2>{editingId ? 'Edit event' : 'New event'}</h2>
        {error && <p className="warn">{error}</p>}
        <label>Name<input value={form.name} onChange={set('name')} required /></label>
        <label>Location<input value={form.location} onChange={set('location')} placeholder="e.g. Bonaduz" /></label>
        <label>Venue<input value={form.venue} onChange={set('venue')} placeholder="e.g. Hotel Post" /></label>
        <div className="row">
          <label>Valid from<input type="date" value={form.validFrom} onChange={set('validFrom')} /></label>
          <label>Valid to<input type="date" value={form.validTo} onChange={set('validTo')} /></label>
        </div>
        <fieldset className="checks">
          <legend>Matching rules</legend>
          <label className="check"><input type="checkbox" checked={form.matchLocation} onChange={set('matchLocation')} /> Location must match</label>
          <label className="check"><input type="checkbox" checked={form.matchVenue} onChange={set('matchVenue')} /> Venue must match</label>
          <label className="check"><input type="checkbox" checked={form.matchDates} onChange={set('matchDates')} /> Enforce date range</label>
        </fieldset>
        <div className="row">
          <button type="submit" className="btn primary">{editingId ? 'Save' : 'Create'}</button>
          {editingId && <button type="button" className="btn" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </form>

      <div className="card">
        <h2>Existing events</h2>
        {events.length === 0 && <p className="muted">None yet.</p>}
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id} className="event-row">
              <div>
                <strong>{e.name}</strong>
                <span className="muted small">
                  {[e.location, e.venue].filter(Boolean).join(' · ')}
                  {e.validFrom && ` · ${e.validFrom}${e.validTo ? `–${e.validTo}` : ''}`}
                </span>
              </div>
              <div className="row">
                <button className="btn small" onClick={() => edit(e)}>Edit</button>
                <button className="btn small danger" onClick={() => remove(e.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
