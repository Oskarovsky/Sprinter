# 10x Astro Starter

![](./public/template.png)

A modern, opinionated starter template for building fast, accessible web applications.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<same anon key>
```

For browser Realtime subscriptions (F-02), `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` mirror the server values. The anon key is designed to be public; RLS enforces data access.

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

Domain tables for planning poker live in `supabase/migrations/`. After pulling schema changes, apply them locally:

```bash
npx supabase db reset
```

Or push to a linked cloud project:

```bash
npx supabase db push
```

Tables: `planning_sessions` (single default room), `profiles`, `tasks`, `votes`, plus the `vote_participation` view for blind voting.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable                  | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`            | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY`            | `anon` public key from Supabase dashboard → Settings → API |
| `PUBLIC_SUPABASE_URL`     | Same as `SUPABASE_URL` (browser Realtime)                  |
| `PUBLIC_SUPABASE_ANON_KEY`| Same as `SUPABASE_KEY` (browser Realtime)                  |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in + Google OAuth                                   |
| `/auth/signup`        | Email/password sign-up + Google OAuth                                   |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/api/auth/google`    | Starts Google OAuth (redirects to Google)                               |
| `/api/auth/callback`  | OAuth callback — exchanges code for session                             |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |
| `/session`              | Planning poker room (protected)                                           |

### Session API routes

| Route                                      | Method | Description                                      |
| ------------------------------------------ | ------ | ------------------------------------------------ |
| `/api/session/state`                       | GET    | Latest or specified task + masked participation  |
| `/api/session/participation?taskId=`       | GET    | Masked participation for a task                  |
| `/api/session/profile`                     | GET    | Current user display name                        |
| `/api/session/profile`                     | PATCH  | Set display name (`{ displayName }`)             |
| `/api/session/tasks`                       | POST   | Create task (`{ title, description?, affectedPaths? }`) |
| `/api/session/tasks/:taskId/start-voting`  | POST   | Move task to voting (creator only)               |
| `/api/session/vote`                        | POST   | Cast/change vote (`{ taskId, storyPoints }`)     |
| `/api/session/reveal`                      | POST   | Reveal votes (`{ taskId }`, creator only)        |

### Repository & Sprinter Analyst API routes

Requires authentication. OAuth tokens and PAT values are stored server-side only (`SUPABASE_SERVICE_ROLE_KEY`).

| Route                                      | Method | Description                                                                 |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------- |
| `/api/repo/connections`                    | GET    | Facilitator repo library + active session connection id                     |
| `/api/repo/session`                        | GET    | Active repo summary for the default planning session                        |
| `/api/repo/link`                           | POST   | Link repo to session (`{ provider, repoUrl, accessMode, gitlabBaseUrl?, accessToken? }`) |
| `/api/repo/link`                           | DELETE | Disconnect session link (`{ removeFromLibrary?, connectionId? }`)           |
| `/api/repo/oauth/github/start`             | GET    | Start GitHub OAuth for private repos (redirect)                             |
| `/api/repo/oauth/github/callback`          | GET    | GitHub OAuth callback                                                       |
| `/api/repo/oauth/gitlab/start`             | GET    | Start GitLab OAuth for private repos (redirect)                             |
| `/api/repo/oauth/gitlab/callback`          | GET    | GitLab OAuth callback                                                       |

`GET /api/session/state` includes `analyst: { storyPoints, rationale, label } | null` after reveal when Sprinter Analyst finished successfully.

#### Repository OAuth environment variables

Add to `.env` and `.dev.vars` (restart dev server after changes):

| Variable                     | Description                                                                 |
| ---------------------------- | --------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server-only — stores repo tokens in `repo_oauth_tokens` (never expose)    |
| `GITHUB_CLIENT_ID`           | GitHub OAuth app client id (private GitHub repos)                           |
| `GITHUB_CLIENT_SECRET`       | GitHub OAuth secret + OAuth state signing                                   |
| `GITLAB_CLIENT_ID`           | GitLab OAuth application id (private GitLab repos)                          |
| `GITLAB_CLIENT_SECRET`       | GitLab OAuth secret                                                         |
| `OPENROUTER_API_KEY`         | Optional — Sprinter Analyst AI estimates (omit → Analyst status `failed`)   |

#### OAuth app registration

**GitHub** (github.com private repos): Settings → Developer settings → OAuth apps → New OAuth app.

- Authorization callback URL (local): `http://127.0.0.1:4321/api/repo/oauth/github/callback`
- Production: `https://<your-worker-domain>/api/repo/oauth/github/callback`

**GitLab.com**: User Settings → Applications (or Admin → Applications for groups).

- Redirect URI (local): `http://127.0.0.1:4321/api/repo/oauth/gitlab/callback`
- Scopes: `read_api`, `read_repository`

**Self-hosted GitLab** (e.g. `gitlab.vodeno.net`): register the OAuth application **on that instance** with the same redirect URI pattern. Users supply the instance base URL when linking. Private repos can also use a personal access token (PAT) via `POST /api/repo/link` instead of OAuth.

Local OAuth smoke test:

```bash
npm run dev
npm run smoke:gitlab-oauth
# complete OAuth in browser, then:
npm run smoke:gitlab-oauth:verify
```

### AI API routes

| Route                | Method | Description                                                                 |
| -------------------- | ------ | --------------------------------------------------------------------------- |
| `/api/ai/draft`      | POST   | Generate task drafts from notes (`{ notes }`) — auth required               |
| `/api/ai/coach`      | POST   | Discussion prompts for divergent votes (`{ taskTitle, taskDescription?, votes }`) — auth required |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

### Google OAuth (FR-012)

Required for sign-in and sign-up with Google.

**Cloud Supabase project**

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create **OAuth client ID** (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (from Supabase → Authentication → Providers → Google).
3. Supabase dashboard → **Authentication → Providers → Google** → enable, paste Client ID and Client Secret.
4. Supabase → **Authentication → URL Configuration** → add your app callback(s), e.g. `http://localhost:4321/api/auth/callback` and your production URL.

**Local Supabase (`supabase start`)**

1. Create the same Google OAuth client; add redirect URI `http://127.0.0.1:54321/auth/v1/callback`.
2. Add to `.env` (used by the Supabase CLI stack):

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client-id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client-secret>
```

3. Restart local Supabase: `npx supabase stop && npx supabase start`.

Google sign-in uses the **Continue with Google** button on `/auth/signin` and `/auth/signup`.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/).

1. Build the project:

```bash
npm run build
```

2. Deploy with Wrangler:

```bash
npx wrangler deploy
```

Set `SUPABASE_URL` and `SUPABASE_KEY` as secrets in your Cloudflare dashboard or via `npx wrangler secret put`. For browser Realtime, also set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (same values as the server anon credentials).

## CI

GitHub Actions runs lint + build on every push and PR to `master`. Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets in GitHub for the build step.

## License

MIT
