# 13: "Not [name]?" on a Personal link

**What to build:** A Personal link greets the Guest by name and offers "Not [name]?". Someone who was sent a forwarded link can use it to say who they are. They go through the same Matching and the same three outcomes as the Shared link. If they Match another Guest, their Reply is recorded for that Guest and the Guest the link was made for keeps their own Reply unchanged. If there is no Match, they get the "leave your details" form and become a Request noting that it arrived through a forwarded link.

**Blocked by:** 02 (A Guest can reply through their Personal link), 11 (Shared-link outcomes and Requests)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] The "Not [name]?" option is on every Personal link, in the Guest's language.
- [ ] Identifying as another Guest records the Reply for that Guest and never changes the original Guest's Reply.
- [ ] An unsure Match goes to review; no Match produces a Request marked as arriving through a forwarded Personal link.
- [ ] The page never reveals who is on the Guest list.
- [ ] Tests at the Replies seam (Jev faked) cover the three outcomes and the original Guest's Reply staying untouched.
- [ ] Checked in a browser at phone width.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-13. submitFromPersonalLink; Not [name]? button; Request source personal_forward.
