# 05: Reply deadline is enforced

**What to build:** After the Reply deadline (event date minus the deadline days, closing at the end of that day in the event's local time), Replies can no longer be sent or changed: a Personal link shows the Guest's Reply read-only, and the Shared link says that replies are closed. The Host's admin is not restricted. With no deadline set, replies stay open. The Invitation page shows the deadline date as "RSVP by".

**Blocked by:** 03 (A Guest can change their Reply through the link)

**Status:** ready-for-agent

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] A Reply or a change is accepted up to the end of the deadline day and refused after it, for both the Personal link and the Shared link; with no deadline set, it is always accepted.
- [ ] After the deadline a Personal link shows the Guest's Reply read-only, with a clear note that replies are closed.
- [ ] After the deadline the Shared link shows "Replies are closed" in the visitor's language.
- [ ] The Host can still change any Reply from the admin after the deadline.
- [ ] The event's time zone is defined. The simplest option is a time zone setting on the Event settings screen with a sensible default; confirm the choice with the Host if it is not obvious, and record it.
- [ ] Tests at the Replies seam use a fake clock around the boundary (the last moment of the deadline day, and the first moment after it).
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.
