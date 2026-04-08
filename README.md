# ░ Pixel Blog

A minimal, pixel-themed blog with admin dashboard. Built with Next.js 14, Tailwind CSS, shadcn/ui.

## Stack

- **Frontend**: Next.js 14 App Router + Tailwind CSS + Pixel theme (black/white/gray)
- **Auth**: NextAuth.js with GitHub OAuth
- **Content**: Markdown stored in GitHub repo
- **Database**: PostgreSQL (via Prisma)
- **Cache**: Upstash Redis
- **Notifications**: Webhook + Email (SMTP)

## Quick Start

### 1. Create GitHub OAuth App
Go to https://github.com/settings/apps → New GitHub App
- Callback URL: `https://your-domain.com/api/auth/callback/github`
- Copy Client ID and Client Secret

### 2. Create a GitHub Content Repo
Create a new repo for blog content (e.g., `your-username/blog-content`).
Create a `posts/` directory. Generate a Personal Access Token with repo write access.

### 3. Set up PostgreSQL
Use any PostgreSQL provider (Neon, Supabase, Vercel Postgres, etc.)

### 4. Set up Upstash Redis
Go to https://upstash.com → Create Redis database → Copy REST URL and Token

### 5. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values.

### 6. Deploy to Vercel

```bash
# Install
npm install

# Push database schema
npx prisma db push

# Dev
npm run dev
```

Or deploy directly:
1. Push to GitHub
2. Import in Vercel
3. Add all env vars from `.env.example`
4. Deploy

### 7. Set Admin Access
Set `ADMIN_GITHUB_USERNAMES` to your GitHub username(s).
Visit `/admin` to access the dashboard.

## Pages

| Route | Description |
|-------|-------------|
| `/blogs` | Blog post list (chapter-style) |
| `/blogs/:slug` | Post detail + comments |
| `/projects` | Open source project cards |
| `/about` | About the author |
| `/admin` | Admin dashboard |

## Admin Features

- **Overview**: Stats dashboard (views, shares, comments)
- **Content**: Create/edit/delete posts with live Markdown preview
- **Comments**: Manage comments grouped by post
- **About Page**: Configure author info
- **Projects**: Manage open source project cards
- **Settings**: Webhook and email notification config

## Theme

Black/white/gray pixel aesthetic with:
- `Press Start 2P` for headings (pixel font)
- `IBM Plex Mono` for body text
- Light/dark mode toggle
- 2px hard borders (no border-radius)
