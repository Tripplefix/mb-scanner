# Deploying MB Scanner to Fly.io

The app ships as a single Docker image: the React/PWA frontend is built and
served by the Express backend, with the SQLite database stored on a persistent
Fly volume mounted at `/data`.

## One-time setup

1. **Install the Fly CLI**
   ```bash
   # macOS
   brew install flyctl
   # Windows (PowerShell)
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Log in**
   ```bash
   fly auth login
   ```

3. **Launch the app** (run from the repo root). This reads `fly.toml`.
   ```bash
   fly launch --copy-config --no-deploy
   ```
   - When asked, **keep the existing `fly.toml`**.
   - If the name `mb-scanner` is taken, Fly will pick/ask for another — that's
     fine; it updates `app =` in `fly.toml`.
   - Decline adding databases (we use SQLite on a volume).

4. **Create the persistent volume** (matches `source = "mb_data"` in `fly.toml`).
   Use the same region as `primary_region`:
   ```bash
   fly volumes create mb_data --region zrh --size 1
   ```

## Deploy

```bash
fly deploy
```

When it finishes:
```bash
fly open          # opens https://<your-app>.fly.dev
```

Scanner at `/`, admin at `/admin`. HTTPS is automatic (needed for camera access).

## Deploying from GitHub (CI)

Since you connected Fly to GitHub, you can auto-deploy on push:

1. Create a deploy token:
   ```bash
   fly tokens create deploy -x 999999h
   ```
2. In your GitHub repo → **Settings → Secrets and variables → Actions**, add a
   secret named `FLY_API_TOKEN` with that value.
3. The workflow in `.github/workflows/fly-deploy.yml` deploys on every push to
   `main`.

## Notes & costs

- `min_machines_running = 0` lets the app **scale to zero** when idle, so you
  typically pay only for the volume (~$0.15/GB-mo → ~$0.15/mo for 1 GB). The
  first request after idle has a ~1–2s cold start.
- To keep it always warm, set `min_machines_running = 1` in `fly.toml`.
- Back up the database anytime:
  ```bash
  fly ssh console -C "cat /data/events.db" > backup-events.db
  ```
