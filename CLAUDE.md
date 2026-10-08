@AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Deploying and testing

### Where it runs
- **Hosting:** Vercel project `party-invitations` (team `example-team`), production at https://party-invitations.vercel.app. There is no git remote, so nothing deploys automatically.
- **Dev (Vercel Preview):** https://party-invitations-dev.vercel.app, behind Vercel login. It has its own Turso database `party-invitations-dev`, and the Preview environment variables are separate from Production's, so dev never touches production data.
- **Database (prod):** Turso (libSQL) database `party-invitations`. Locally, leave the Turso variables unset and the app uses a throwaway SQLite file, `local.db` (git-ignored).
- **Settings:** the variable names are in `.env.example`: `TYPESAFE_API_KEY` (Jev matching), `ADMIN_PASSWORD` (admin login), `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Real values live in `.env.local` locally and in Vercel's Production environment. Never commit or print them.
- **Admin:** `/admin` asks for `ADMIN_PASSWORD` and then keeps a session cookie.

### Everyday commands
- `npm run dev` runs the app locally.
- `npm test` runs the Vitest suite. Tests use a real in-memory database; only the Jev model and the clock are faked.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` runs the Playwright browser tests (phone width) on a throwaway `e2e.db` with a stub in place of Jev. It starts its own server on port 3100.
- `npx tsc --noEmit` typechecks, `npm run lint` lints, and `npm run build` builds.
- **Dev deploys:** after every commit, deploy it to dev with `vercel deploy --yes`, then point the dev address at it with `vercel alias set <deployment-url> party-invitations-dev.vercel.app` (the deployment URL is the one `vercel ls` shows as Preview). Do this automatically, without asking.
- **Prod deploys:** only when the user explicitly says to push to prod. Then run `vercel deploy --prod --yes`. Never deploy to production on your own, and never promote a commit to prod just because it went to dev.
- `vercel deploy --prod --yes` deploys to production. If it prints `"status": "error"` right away, run it again and check `vercel ls` for the real status.
- The Turso CLI is at `~/.turso/turso` (for example `~/.turso/turso db shell party-invitations "select * from guests"`).

### Working rules learned the hard way
- Database tables create and migrate themselves on first use, so a deploy upgrades the live database. Look at production data before deploying a schema change.
- After the dev server, a build or a test run, delete any `local.db*` files and any screenshots or scripts you made in the scratchpad.
- Stop the dev server by its PID. Do not use `pkill -f`; it can kill your own shell.
- Admin screens, page layout and the Share button are checked by hand in a real browser (phone width as well as desktop), not by unit tests.
- Use the real guest list and event details only in the database. `guests.json` is just the seed for the very first, placeholder guest list.
