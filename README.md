# Party invitations

Send each guest a personalized invitation, collect their replies, and keep track of who is coming.

- **Personal links** identify the guest, so there is nothing to type. A **shared link** can be posted anywhere; replies sent through it are matched to the guest list with an AI model (TypeSafe Jev), with weak matches sent to the host for review.
- **Host admin** (`/admin`, password protected): guest list, invitation messages you copy or share one by one, replies, requests from people not on the list, linked partners and children, a reply deadline, event details and a calendar file.
- **Privacy:** the venue is hidden on the shared link until a confident match who is coming replies.
- English and Spanish.

Built with Next.js, libSQL (Turso, or a local SQLite file) and Tailwind.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_PASSWORD and TYPESAFE_API_KEY
npm run dev
```

Leave the Turso variables unset to use a throwaway local database. `npm test` runs the unit tests; `npm run test:e2e` runs the browser tests.

See `GLOSSARY.md` for the vocabulary and `docs/adr/` for design decisions.

## License

All rights reserved. The code is public for reading only; see `LICENSE`.
