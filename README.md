# MB Scanner

A simple web app to scan and verify personnel QR codes ("MB2" format) for facility/event access.

## What it does

- **Backend** (Node/Express + SQLite): admin API to create and manage *events*. Each event defines matching rules (location, venue, valid date range) that a scanned QR code must satisfy.
- **Frontend** (React PWA): the scanner selects an event, downloads its config, and then works **fully offline**. It scans QR codes with the device camera, parses the MB2 payload, and shows ✅ granted / ❌ denied.

## QR code format (`MB2`)

The payload is semicolon-delimited fields, followed by a `|` and a base64 signature:

```
MB2;<personId>;<lastName>;<firstName>;<dob>;<rank>;<unit>;<startDate>;<startTime>;<location>;<venue>;<endDate>;<endLocation>;<status>;<flag>;<issueDate>|<base64Signature>
```

| Idx | Field | Example | Meaning |
|-----|-------|---------|---------|
| 0 | format | `MB2` | format/version id |
| 1 | personId | `9256161413` | personnel id |
| 2 | lastName | `Isler` | last name |
| 3 | firstName | `Rolf` | first name |
| 4 | dob | `19950307` | date of birth |
| 5 | rank | `Hptm` | rank (Hauptmann) |
| 6 | unit | `Ter Div Stabskp 3` | unit |
| 7 | startDate | `20260610` | event start date |
| 8 | startTime | `1730` | event start time |
| 9 | location | `Bonaduz` | location |
| 10 | venue | `Hotel Post` | venue |
| 11 | endDate | `20260612` | event end date |
| 12 | endLocation | `Bonaduz` | end location (data can be inconsistent) |
| 13 | status | `U` | status flag |
| 14 | flag | `1` | flag |
| 15 | issueDate | `20260513` | issue date |

### About the signature

The part after `|` is a base64-encoded digital signature. Verifying it requires the **public key** of the issuing system. We don't have it yet, so the app currently validates the *payload fields* against the selected event (format, location/venue, date range) and stores the signature for future cryptographic verification. The public key cannot be recovered from signatures alone — it must be obtained from the issuer (or derived from their private key if available).

## Running locally

```bash
# Backend
cd backend
npm install
npm start          # serves API + built frontend on http://localhost:3000

# Frontend (dev mode, separate terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api to backend)
```

### Production build

```bash
cd frontend && npm install && npm run build   # outputs to backend/public
cd ../backend && npm install && npm start
```

Open http://localhost:3000 — admin panel at `/admin`, scanner at `/`.

## Notes

- Camera access (`getUserMedia`) requires HTTPS or `localhost`.
- After an event is loaded in the scanner, validation runs entirely client-side; no network needed.
