# 12: Accept or decline a Request

**What to build:** The Host can accept a Request, which makes that person a Guest on the list in a language the Host chooses, or decline it. Requests do not count toward the headcount until accepted. The old "not on my list, but welcome" action in the review flow becomes "Accept request", so the same idea has one name.

**Blocked by:** 11 (Shared-link outcomes and Requests)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] Accepting a Request creates a Guest (name from the Request, language chosen by the Host) and removes the Request from the list; the new Guest has a Personal link and appears in the Invitations list.
- [ ] The Reply that came with the Request (answer, Party size, Companions) is kept for the new Guest and now counts in the headcount.
- [ ] Declining removes the Request from the list without creating a Guest or counting anything.
- [ ] The review flow's "not on my list, but welcome" action is replaced by "Accept request", with its two-step confirmation kept.
- [ ] Tests at the Replies seam cover accept, decline and the headcount effect.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-12. acceptRequest/declineRequest; review "welcome" became Accept request (ADR 0003).
