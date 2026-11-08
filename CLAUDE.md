@AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Deploying and testing

Real hosting, database and account details are not kept in this repository. They live in a git-ignored `CLAUDE.local.md` (Claude Code loads it automatically), which holds the project/team names, URLs, database names and the deploy routine.

### Everyday commands
- `npm run dev` runs the app locally. Leave the Turso variables unset and it uses a throwaway SQLite file, `local.db` (git-ignored).
- `npm test` runs the Vitest suite. Tests use a real in-memory database; only the Jev model and the clock are faked.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` runs the Playwright browser tests (phone width) on a throwaway `e2e.db` with a stub in place of Jev. It starts its own server on port 3100.
- `npm run typecheck` typechecks (it generates the route types first, which a fresh clone lacks), `npm run lint` lints, and `npm run build` builds.
- Settings are environment variables; see `.env.example` for the names. Never commit or print real values.

### Working rules
- Database tables create and migrate themselves on first use, so a deploy upgrades the live database. Look at production data before deploying a schema change.
- After the dev server, a build or a test run, delete any `local.db*` files and any screenshots or scripts you made in the scratchpad.
- Stop the dev server by its PID. Do not use `pkill -f`; it can kill your own shell.
- Admin screens, page layout and the Share button are checked by hand in a real browser (phone width as well as desktop), not by unit tests.
- Keep personal data (real names, guest lists, venue, account details) out of the repository: it lives only in the database and in `CLAUDE.local.md`. `guests.json` is just a placeholder seed.
