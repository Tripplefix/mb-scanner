import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { fetchEvents, loadCachedEvent, cacheSelectedEvent, clearCachedEvent } from '../api.js';
import { parseMB, validateAgainstEvent } from '../mb.js';
import { beep } from '../beep.js';

export default function Scanner() {
  const [events, setEvents] = useState([]);
  const [event, setEvent] = useState(() => loadCachedEvent());
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loadError, setLoadError] = useState(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => setLoadError('Could not reach server (offline?). Using cached event if available.'));
  }, []);

  const selectEvent = (e) => {
    setEvent(e);
    cacheSelectedEvent(e);
  };

  const changeEvent = () => {
    setEvent(null);
    clearCachedEvent();
  };

  if (!event && !debug) {
    return (
      <div className="page">
        <header className="topbar">
          <h1>MB Scanner</h1>
          <div className="topbar-actions">
            <button className="link" onClick={() => setDebug(true)}>Debug</button>
            <Link to="/admin" className="link">Admin</Link>
          </div>
        </header>
        <div className="card">
          <h2>Select an event</h2>
          <p className="muted">Load an event to scan against. It will be cached for offline use.</p>
          {loadError && <p className="warn">{loadError}</p>}
          {events.length === 0 && !loadError && <p className="muted">No events configured yet.</p>}
          <ul className="event-list">
            {events.map((e) => (
              <li key={e.id}>
                <button className="event-item" onClick={() => selectEvent(e)}>
                  <strong>{e.name}</strong>
                  <span className="muted">
                    {[e.location, e.venue, e.unit].filter(Boolean).join(' · ')}
                    {e.validFrom && ` · ${e.validFrom}${e.validTo ? `–${e.validTo}` : ''}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (debug) {
    return <DebugView onExit={() => setDebug(false)} offline={offline} />;
  }

  return <ScanView event={event} onChangeEvent={changeEvent} offline={offline} onDebug={() => setDebug(true)} />;
}

function DebugView({ onExit, offline }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastRef = useRef('');
  const [result, setResult] = useState(null);
  const [camError, setCamError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (res) => {
        if (cancelled || !res) return;
        const text = res.getText();
        if (text === lastRef.current) return;
        lastRef.current = text;
        setResult(parseMB(text));
        setTimeout(() => { lastRef.current = ''; }, 2500);
      })
      .then((controls) => { controlsRef.current = controls; })
      .catch((err) => setCamError(err?.message || 'Camera unavailable'));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  const FIELD_LABELS = [
    ['format', 'Format'], ['personId', 'Person ID'], ['lastName', 'Last name'],
    ['firstName', 'First name'], ['dob', 'Date of birth'], ['rank', 'Rank'],
    ['unit', 'Unit'], ['startDate', 'Start date'], ['startTime', 'Start time'],
    ['location', 'Location'], ['venue', 'Venue'], ['endDate', 'End date'],
    ['endLocation', 'End location'], ['status', 'Status'], ['flag', 'Flag'],
    ['issueDate', 'Issue date'],
  ];

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Debug scanner</h1>
          <span className="muted small">raw QR values only — no validation{offline && <span className="badge">offline</span>}</span>
        </div>
        <button className="link" onClick={onExit}>Exit debug</button>
      </header>

      <div className="scanner-wrap">
        <video ref={videoRef} className="video" muted playsInline />
        <div className="reticle" />
      </div>

      {camError && <p className="warn">Camera error: {camError}</p>}

      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          {!result.ok
            ? <p className="warn">Parse error: {result.error}</p>
            : <>
                <table className="debug-table">
                  <tbody>
                    {FIELD_LABELS.map(([key, label]) => (
                      <tr key={key}>
                        <td className="muted small">{label}</td>
                        <td>{result.fields[key] || <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="muted small">Signature</td>
                      <td className="sig">{result.signature || <span className="muted">—</span>}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted small" style={{ marginTop: 8 }}>Tap anywhere to clear</p>
              </>
          }
        </div>
      )}
    </div>
  );
}

function ScanView({ event, onChangeEvent, offline, onDebug }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastRef = useRef('');
  const [result, setResult] = useState(null);
  const [camError, setCamError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (res) => {
        if (cancelled || !res) return;
        const text = res.getText();
        if (text === lastRef.current) return;
        lastRef.current = text;
        handleScan(text);
        setTimeout(() => { lastRef.current = ''; }, 2500);
      })
      .then((controls) => { controlsRef.current = controls; })
      .catch((err) => setCamError(err?.message || 'Camera unavailable'));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleScan = (text) => {
    const parsed = parseMB(text);
    if (!parsed.ok) {
      beep(false);
      setResult({ granted: false, error: parsed.error, parsed: null, reasons: [] });
      return;
    }
    const { granted, reasons } = validateAgainstEvent(parsed, event);
    beep(granted);
    setResult({ granted, parsed, reasons });
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>{event.name}</h1>
          <span className="muted small">
            {[event.location, event.venue, event.unit].filter(Boolean).join(' · ')}
            {offline && <span className="badge">offline</span>}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="link" onClick={onDebug}>Debug</button>
          <button className="link" onClick={onChangeEvent}>Change event</button>
        </div>
      </header>

      <div className="scanner-wrap">
        <video ref={videoRef} className="video" muted playsInline />
        <div className="reticle" />
      </div>

      {camError && <p className="warn">Camera error: {camError}</p>}

      {result && <ResultCard result={result} onDismiss={() => setResult(null)} />}
    </div>
  );
}

function ResultCard({ result, onDismiss }) {
  const { granted, parsed, reasons, error } = result;
  return (
    <div className={`result ${granted ? 'granted' : 'denied'}`} onClick={onDismiss}>
      <div className="result-head">
        <span className="result-icon">{granted ? '✅' : '❌'}</span>
        <span className="result-title">{granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</span>
      </div>
      {error && <p className="warn">{error}</p>}
      {parsed && (
        <div className="person">
          <div className="person-name">{parsed.person.fullName}</div>
          <div className="muted">
            {[parsed.person.rank, parsed.person.unit].filter(Boolean).join(' · ')}
          </div>
          <div className="muted small">
            ID {parsed.person.id} · DOB {parsed.person.dob}
          </div>
        </div>
      )}
      {reasons.length > 0 && (
        <ul className="reasons">
          {reasons.map((r, i) => (
            <li key={i} className={r.ok ? 'ok' : 'bad'}>
              <span>{r.ok ? '✓' : '✗'}</span> {r.label}
              {r.detail && <span className="muted small"> — {r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="muted small tap-hint">tap to dismiss</p>
    </div>
  );
}
