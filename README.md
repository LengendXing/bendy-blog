# ░ Bendy Blog

A minimal, pixel-themed blog with admin dashboard.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + pixel theme (black/white/gray) |
| Auth | NextAuth.js + GitHub OAuth |
| Content | Markdown in GitHub repo |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Upstash Redis |
| Image Storage | Dufs / GitHub repo / base64 fallback |
| Notifications | Webhook + Email (SMTP) |
| Deploy | Vercel |

## Quick Start

```bash
git clone https://github.com/your-username/bendy-blog.git
cd bendy-blog
cp .env.example .env.local
# Fill in .env.local with your values
npm install --legacy-peer-deps
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Deploy to Vercel

### 1. Push to GitHub

### 2. Import in Vercel
- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repo
- Framework: **Next.js** (auto-detected)

### 3. Add Environment Variables

In Vercel project → Settings → Environment Variables, add all variables from `.env.example`.

**Quick copy list** (paste into Vercel one by one):

```
GITHUB_ID=
GITHUB_SECRET=
GITHUB_CONTENT_REPO=
GITHUB_TOKEN=
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ADMIN_GITHUB_USERNAMES=
DUFS_ENABLED=false
DUFS_URL=
DUFS_USER=
DUFS_PASS=
GITHUB_IMAGE_REPO=
GITHUB_IMAGE_TOKEN=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

> **Note**: `NEXTAUTH_URL` must match your Vercel domain. After first deploy, update the GitHub OAuth callback URL to `https://your-domain.vercel.app/api/auth/callback/github`.

### 4. Deploy
Click Deploy. Vercel will run `prisma generate && next build` automatically.

### 5. Initialize Database
After first deploy, run in Vercel terminal or locally:
```bash
npx prisma db push
```

## Pages

| Route | Description |
|-------|-------------|
| `/blogs` | Blog list with column filter |
| `/blogs/:slug` | Post detail + threaded comments |
| `/projects` | Open source project cards |
| `/about` | About the author (multi-language) |
| `/admin` | Admin dashboard |

## Admin Features

- **Overview**: Stats + pixel calendar + daily timeline
- **Content**: CRUD with live Markdown preview + column tags
- **Comments**: Grouped by post, expand/collapse, edit/delete
- **About Page**: Multi-language config (zh/en/mn/ug/ar/ru/ja/ko)
- **Projects**: Full-width list management
- **Settings**: Site config, image storage (Dufs/GitHub), webhook & email notifications

## Image Storage Priority

1. **Dufs** — if enabled (env `DUFS_ENABLED=true` or admin toggle)
2. **GitHub Image Repo** — if configured (env or admin)
3. **Base64** — last resort fallback (not recommended for production)

Both Dufs and GitHub image settings can be configured via:
- `.env.local` / Vercel env vars (loaded at startup)
- Admin → Settings → Site Settings (runtime override)

## i18n

Supports: 中文, ᠮᠣᠩᠭᠣᠯ, ئۇيغۇرچە, English, العربية, Русский, 日本語, 한국어

UI labels + About page content switch per language. RTL supported for Arabic and Uyghur.
