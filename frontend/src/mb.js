// Parsing and validation for MB2 personnel QR codes.

const FIELD_NAMES = [
  'format',     // 0  MB2
  'personId',   // 1
  'lastName',   // 2
  'firstName',  // 3
  'dob',        // 4  YYYYMMDD
  'rank',       // 5
  'unit',       // 6
  'startDate',  // 7  YYYYMMDD
  'startTime',  // 8  HHMM
  'location',   // 9
  'venue',      // 10
  'endDate',    // 11 YYYYMMDD
  'endLocation',// 12 (data can be inconsistent)
  'status',     // 13
  'flag',       // 14
  'issueDate',  // 15 YYYYMMDD
];

/**
 * Parse a raw MB2 QR string into a structured object.
 * Returns { ok, person, signature, fields, raw } or { ok:false, error }.
 */
export function parseMB(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Empty QR content' };
  }
  const trimmed = raw.trim();
  const pipeIdx = trimmed.indexOf('|');
  const dataPart = pipeIdx >= 0 ? trimmed.slice(0, pipeIdx) : trimmed;
  const signature = pipeIdx >= 0 ? trimmed.slice(pipeIdx + 1) : null;

  const parts = dataPart.split(';');
  if (parts[0] !== 'MB2') {
    return { ok: false, error: `Unknown format "${parts[0] || '?'}" (expected MB2)` };
  }

  const fields = {};
  FIELD_NAMES.forEach((name, i) => { fields[name] = parts[i] ?? ''; });

  return {
    ok: true,
    raw: trimmed,
    signature,
    fields,
    person: {
      id: fields.personId,
      lastName: fields.lastName,
      firstName: fields.firstName,
      fullName: `${fields.firstName} ${fields.lastName}`.trim(),
      dob: formatDate(fields.dob),
      rank: fields.rank,
      unit: fields.unit,
    },
  };
}

// 'YYYYMMDD' -> 'YYYY-MM-DD' (returns original if not parseable)
function formatDate(s) {
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

// 'YYYYMMDD' -> Date at local midnight, or null
function toDate(s) {
  if (!/^\d{8}$/.test(s)) return null;
  return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
}

// 'YYYY-MM-DD' or 'YYYYMMDD' -> Date at local midnight, or null
function toDateFlexible(s) {
  if (!s) return null;
  return toDate(s.replace(/-/g, ''));
}

const norm = (s) => (s ?? '').toString().trim().toLowerCase();

/**
 * Validate a parsed QR against a selected event.
 * `now` defaults to current date (injectable for testing).
 * Returns { granted, reasons: [{ label, ok, detail }] }.
 */
export function validateAgainstEvent(parsed, event, now = new Date()) {
  const reasons = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  reasons.push({
    label: 'Format',
    ok: parsed.ok && parsed.fields.format === 'MB2',
    detail: 'MB2',
  });

  if (event.matchLocation && event.location) {
    const ok = norm(parsed.fields.location) === norm(event.location);
    reasons.push({
      label: 'Location',
      ok,
      detail: `${parsed.fields.location || '—'} vs ${event.location}`,
    });
  }

  if (event.matchVenue && event.venue) {
    const ok = norm(parsed.fields.venue) === norm(event.venue);
    reasons.push({
      label: 'Venue',
      ok,
      detail: `${parsed.fields.venue || '—'} vs ${event.venue}`,
    });
  }

  if (event.matchUnit && event.unit) {
    const ok = norm(parsed.fields.unit) === norm(event.unit);
    reasons.push({
      label: 'Unit',
      ok,
      detail: `${parsed.fields.unit || '—'} vs ${event.unit}`,
    });
  }

  if (event.matchDates) {
    const from = toDateFlexible(event.validFrom);
    const to = toDateFlexible(event.validTo);
    const qrStart = toDate(parsed.fields.startDate);
    const qrEnd = toDate(parsed.fields.endDate) ?? qrStart;

    // Check 1: the QR's event dates must overlap the configured event window
    // (confirms this credential belongs to this event).
    let qrMatchesEvent = true;
    if (from || to) {
      if (!qrStart && !qrEnd) {
        qrMatchesEvent = false;
      } else {
        if (from && qrEnd && qrEnd < from) qrMatchesEvent = false;
        if (to && qrStart && qrStart > to) qrMatchesEvent = false;
      }
    }

    // Check 2: today must fall within the event's valid date range
    // (the event must be currently running).
    let todayInRange = true;
    if (from && today < from) todayInRange = false;
    if (to && today > to) todayInRange = false;

    const ok = qrMatchesEvent && todayInRange;
    reasons.push({
      label: 'Event date',
      ok,
      detail: !qrMatchesEvent
        ? `QR dates don't match event (${event.validFrom} → ${event.validTo})`
        : !todayInRange
          ? `Event not active today (${event.validFrom} → ${event.validTo})`
          : dateRangeDetail(event),
    });
  }

  const granted = reasons.every((r) => r.ok);
  return { granted, reasons };
}

function dateRangeDetail(event) {
  if (event.validFrom && event.validTo) return `${event.validFrom} → ${event.validTo}`;
  if (event.validFrom) return `from ${event.validFrom}`;
  if (event.validTo) return `until ${event.validTo}`;
  return 'no date restriction';
}
