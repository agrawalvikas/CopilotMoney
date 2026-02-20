# Production Deployment Checklist

This document covers everything needed to deploy CopilotMoney to production. The app is a monorepo with two deployable units:

- **API** — NestJS backend (`apps/api`) — requires a persistent server (Railway, Render, Fly.io, etc.)
- **Web** — Next.js frontend (`apps/web`) — can be deployed to Vercel or any Node host

---

## 1. Third-Party Accounts & Setup

### Clerk (Authentication)
- [ ] Create a production Clerk application at [clerk.com](https://clerk.com)
- [ ] Enable desired sign-in methods (email, Google, etc.)
- [ ] Add your production domain to **Allowed origins** in Clerk dashboard
- [ ] Copy **Publishable Key** and **Secret Key** from the API Keys page

### Teller (Bank connections — US)
- [ ] Upgrade Teller app from sandbox → development or production at [teller.io](https://teller.io)
- [ ] Download the production **certificate** and **private key** from the Teller dashboard
- [ ] Format both files for use as env vars: replace literal newlines with `\n` (a single long string)

### Plaid (Bank connections — US & Canada)
- [ ] Submit Plaid for production access at [plaid.com](https://plaid.com) (if using production data)
- [ ] Copy **Client ID** and **Secret** from the Plaid dashboard (use `production` secret, not `sandbox`)

### Database (PostgreSQL)
- [ ] Provision a managed PostgreSQL instance (Railway, Supabase, Neon, RDS, etc.)
- [ ] Copy the full connection string: `postgresql://user:password@host:5432/dbname?sslmode=require`

---

## 2. Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex string — encrypt Teller/Plaid access tokens. **Never change once set or all stored tokens break.** Generate with: `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret key (`sk_live_...`) |
| `TELLER_CERTIFICATE` | ✅ | PEM certificate as a single line with `\n` for newlines |
| `TELLER_PRIVATE_KEY` | ✅ | PEM private key as a single line with `\n` for newlines |
| `TELLER_ENV` | ✅ | `sandbox` \| `development` \| `production` |
| `PLAID_CLIENT_ID` | ✅ | Plaid client ID |
| `PLAID_SECRET` | ✅ | Plaid secret key (environment-specific) |
| `PLAID_ENV` | ✅ | `sandbox` \| `development` \| `production` |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins, e.g. `https://app.yourdomain.com` |
| `PORT` | optional | Port to listen on (defaults to `3001`) |
| `NODE_ENV` | optional | Set to `production` for production builds |

### Web (`apps/web/.env.local` or host environment)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret key (used by middleware) |
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | Full URL of the deployed API, e.g. `https://api.yourdomain.com` |
| `NEXT_PUBLIC_TELLER_APP_ID` | ✅ | Teller application ID |
| `NEXT_PUBLIC_TELLER_ENV` | ✅ | `sandbox` \| `development` \| `production` |

---

## 3. Database Setup

Run these commands once against the production database before the first deploy:

```bash
# From the monorepo root
cd apps/api

# Apply all migrations (safe, non-destructive)
DATABASE_URL="<your-prod-url>" npx prisma migrate deploy

# Seed default categories (safe to run once; uses upsert)
DATABASE_URL="<your-prod-url>" npx prisma db seed
```

> `migrate deploy` (not `migrate dev`) is the correct command for production — it applies pending migrations without generating new ones.

---

## 4. Deploying the API

```bash
# From the monorepo root
npm run build --workspace=apps/api

# Start in production mode
npm run start:prod --workspace=apps/api
```

### Teller certificate env var format

The Teller cert and key need to be stored as single-line strings. Convert with:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' teller.cert.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' teller.key.pem
```

Paste the output as the value of `TELLER_CERTIFICATE` / `TELLER_PRIVATE_KEY`.

---

## 5. Deploying the Web App

```bash
# From the monorepo root
npm run build --workspace=apps/web

# Serve (if self-hosting)
npm run start --workspace=apps/web
```

If deploying to **Vercel**:
- Set all `NEXT_PUBLIC_*` and server-side env vars in the Vercel project settings
- Set **Root Directory** to `apps/web`
- Framework preset: **Next.js**

---

## 6. Post-Deployment Verification

### API health checks
- [ ] `GET /api/v1/categories` returns 200 (auth-required; use a valid Clerk token)
- [ ] `GET /api/v1/plaid/link-token` returns a link token
- [ ] `POST /api/v1/connections` successfully creates a Teller connection (sandbox enrollment)

### Web checks
- [ ] Sign-in page loads at `/sign-in`
- [ ] Dashboard loads after sign-in with no console errors
- [ ] "Add Account" → Teller and Plaid buttons are both active (not grayed out)
- [ ] Syncing a connected account returns data

### CORS check
- [ ] Browser network tab shows no CORS errors when the web app calls the API
- [ ] Confirm `CORS_ORIGINS` matches the exact web app origin (no trailing slash)

---

## 7. Security Checklist

- [ ] `ENCRYPTION_KEY` is stored in a secret manager (not in source control)
- [ ] Teller cert/key are stored as secrets (not committed to the repo)
- [ ] `DATABASE_URL` includes `sslmode=require` for hosted databases
- [ ] Clerk webhook signing secret is configured if using webhooks
- [ ] API is not publicly accessible without a valid Clerk JWT
- [ ] `NODE_ENV=production` disables NestJS debug features
- [ ] No `.env` files are committed to git (check `.gitignore`)

---

## 8. Ongoing Maintenance

| Task | Frequency | How |
|---|---|---|
| Plaid cursor sync | On-demand | User clicks "Sync" in the UI or call `POST /api/v1/plaid/sync` |
| Teller data sync | On-demand | User clicks "Sync" in the UI or call `POST /api/v1/teller/sync` |
| Database backups | Daily | Managed by your DB provider (enable point-in-time recovery) |
| Teller cert renewal | Per Teller policy | Re-download from dashboard, update env var, redeploy API |
| Clerk key rotation | As needed | Update `CLERK_SECRET_KEY` in both API and Web, redeploy |
| Dependency updates | Monthly | `npm audit` + review changelogs for Plaid/Teller SDKs |

---

## 9. Known Limitations / Gotchas

- **`ENCRYPTION_KEY` is irreversible** — changing it after accounts are connected will make all stored access tokens unreadable. Back it up separately.
- **Plaid `transactions/refresh`** is not available in sandbox — the sync button will still work but the pre-refresh step is silently skipped.
- **Teller sandbox** returns synthetic data — switch `TELLER_ENV` and `NEXT_PUBLIC_TELLER_ENV` to `development` or `production` for real bank connections.
- **Plaid sandbox** requires using [Plaid sandbox credentials](https://plaid.com/docs/sandbox/) — switch `PLAID_ENV` to `production` and use the production secret for live data.
- **Monorepo workspace hoisting** — always install packages from the monorepo root (`npm install --workspace=apps/api <pkg>`), not inside a workspace directory directly.
