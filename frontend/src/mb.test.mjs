// Minimal test runner (no deps): `node src/mb.test.mjs`
import { parseMB, validateAgainstEvent } from './mb.js';
import assert from 'node:assert';

const samples = [
  'MB2;9256161413;Isler;Rolf;19950307;Hptm;Ter Div Stabskp 3;20260610;1730;Bonaduz;Hotel Post;20260612;Bonaduz;U;1;20260513|Akow+sig==',
  'MB2;9256161413;Isler;Rolf;19950307;Hptm;SK 2 Ter Div 3;20260605;0915;Andermatt;Kaserne Altkirch;20260605;Andermatt;U;1;20260513|Uv4Z+sig==',
];

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok - ${name}`); };

test('parses fields and person', () => {
  const p = parseMB(samples[0]);
  assert.equal(p.ok, true);
  assert.equal(p.fields.format, 'MB2');
  assert.equal(p.person.fullName, 'Rolf Isler');
  assert.equal(p.person.rank, 'Hptm');
  assert.equal(p.person.dob, '1995-03-07');
  assert.equal(p.fields.location, 'Bonaduz');
  assert.equal(p.signature, 'Akow+sig==');
});

test('rejects non-MB2', () => {
  assert.equal(parseMB('FOO;1;2').ok, false);
  assert.equal(parseMB('').ok, false);
});

test('grants when location + date match', () => {
  const p = parseMB(samples[0]);
  const ev = { matchLocation: true, location: 'Bonaduz', matchDates: true, validFrom: '2026-06-10', validTo: '2026-06-12' };
  const { granted } = validateAgainstEvent(p, ev, new Date(2026, 5, 11));
  assert.equal(granted, true);
});

test('denies wrong location', () => {
  const p = parseMB(samples[0]);
  const ev = { matchLocation: true, location: 'Andermatt', matchDates: false };
  assert.equal(validateAgainstEvent(p, ev, new Date(2026, 5, 11)).granted, false);
});

test('denies outside date range', () => {
  const p = parseMB(samples[0]);
  const ev = { matchLocation: false, matchDates: true, validFrom: '2026-06-10', validTo: '2026-06-12' };
  assert.equal(validateAgainstEvent(p, ev, new Date(2026, 5, 20)).granted, false);
});

test('case-insensitive venue match', () => {
  const p = parseMB(samples[1]);
  const ev = { matchVenue: true, venue: 'kaserne altkirch', matchLocation: false, matchDates: false };
  assert.equal(validateAgainstEvent(p, ev, new Date(2026, 5, 5)).granted, true);
});

console.log(`\n${passed} tests passed`);
