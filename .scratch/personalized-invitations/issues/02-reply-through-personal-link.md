# 02: A Guest can reply through their Personal link

**What to build:** Every Guest gets an unguessable Personal link, and the Host can copy it from the Guests screen. A Guest who opens it is greeted by name, in their own language (Spanish Guests see Spanish, with the language toggle still available), sees the event details, and answers coming or not and, if coming, their Party size. The Reply is recorded for that Guest and shows in the dashboard as theirs. This is the first end-to-end path from Host to Guest and back.

**Blocked by:** 01 (Replies seam: move today's behavior behind a tested module)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] Existing and newly added Guests each have a Personal link without any manual step; two Guests never share one, and each is long enough to be unguessable (at least 128 bits of randomness).
- [ ] The Guests screen has a control to copy a Guest's Personal link.
- [ ] A valid link greets the Guest by name in the Guest's language; the toggle switches language.
- [ ] The Guest can send a Reply (coming or not; Party size when coming) and sees a thank-you; the Reply is recorded for that Guest and appears in the dashboard.
- [ ] An unknown or malformed link shows a friendly message and records nothing.
- [ ] Tests at the Replies seam cover a Reply through a valid link being recorded for the right Guest and an unknown code being rejected.
- [ ] Checked in a browser at phone width, in English and in Spanish.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-02 (6d9f5e0). Link path /i/<code>; archived link currently treated as unknown (ticket 06 refines).
