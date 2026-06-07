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

const norm = (s) => (s ?? '').toString().trim().toLowerCase();

/**
 * Validate a parsed QR against a selected event.
 * `now` defaults to current date (injectable for testing).
 * Returns { granted, reasons: [{ label, ok, detail }] }.
 */
export function validateAgainstEvent(parsed, event, now = new Date()) {
  const reasons = [];

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

  if (event.matchDates) {
    const ok = dateInRange(parsed, event, now);
    reasons.push({
      label: 'Date valid',
      ok,
      detail: dateRangeDetail(event),
    });
  }

  const granted = reasons.every((r) => r.ok);
  return { granted, reasons };
}

// The QR's event window [startDate, endDate] must overlap the configured
// event's [validFrom, validTo] window. This confirms the credential was
// issued for *this* event, independent of when the scan happens (so the
// door can be tested before the event and works throughout it).
function dateInRange(parsed, event, now) {
  const from = toDate((event.validFrom || '').replace(/-/g, '')) ?? null;
  const to = toDate((event.validTo || '').replace(/-/g, '')) ?? null;

  const qrStart = toDate(parsed.fields.startDate);
  const qrEnd = toDate(parsed.fields.endDate) ?? qrStart;

  // No configured range → nothing to enforce.
  if (!from && !to) return true;
  // QR carries no parseable dates → can't confirm.
  if (!qrStart && !qrEnd) return false;

  // Require the QR window to overlap the configured window.
  if (from && qrEnd && qrEnd < from) return false;
  if (to && qrStart && qrStart > to) return false;

  return true;
}

function dateRangeDetail(event) {
  if (event.validFrom && event.validTo) return `${event.validFrom} → ${event.validTo}`;
  if (event.validFrom) return `from ${event.validFrom}`;
  if (event.validTo) return `until ${event.validTo}`;
  return 'no date restriction';
}
