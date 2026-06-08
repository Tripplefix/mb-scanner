# MB Scanner

A simple offline web app to scan and verify personnel **MB2** QR codes for facility/event access.

**No backend, no database, no server.** Events are stored in the browser (`localStorage`) and the app works fully offline after the first load. Deploy it as a static site — it's just HTML/JS.

## How it works

1. **Admin** (`/admin`) — create events. Each event defines matching rules: location, venue, unit, valid date range. Stored locally in the browser.
2. **Scanner** (`/`) — select an event (cached in localStorage), then scan QR codes with the camera. Validation runs client-side; shows ✅ / ❌ with a beep.

## QR code format (MB2)

Semicolon-delimited fields, with a base64 signature after `|`:

```
MB2;<personId>;<lastName>;<firstName>;<dob>;<rank>;<unit>;<startDate>;<startTime>;<location>;<venue>;<endDate>;<endLocation>;<status>;<flag>;<issueDate>|<signature>
```

The signature is parsed and stored but not yet verified (public key from the issuer is needed; can't be recovered from signatures alone).

## Run locally

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

## Deploy to Vercel

1. Connect your GitHub repo in the Vercel dashboard — it will pick up `vercel.json` automatically.
2. Deploy. Done. Scanner at `/`, admin at `/admin`.

No environment variables needed.

## Generate test QR codes

```bash
cd tools/test-qr
npm install
node generate.mjs   # outputs PNGs + HTML contact sheet to out/
```
