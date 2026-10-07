# 06: Regenerate a Personal link, and handle archived Guests

**What to build:** The Host can regenerate a Guest's Personal link, which stops the old link working and gives a new one. If a Guest is archived, their Personal link shows a polite "this invitation is no longer available" and accepts no new Replies.

**Blocked by:** 02 (A Guest can reply through their Personal link)

**Status:** ready-for-agent

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] A Regenerate control on the Guests screen gives the Guest a new link and shows it; the old link then shows the friendly invalid-link message and records nothing.
- [ ] The Guest's existing Reply is kept when their link is regenerated.
- [ ] An archived Guest's link shows "no longer available" and accepts no Replies; restoring the Guest makes it work again.
- [ ] Tests at the Invitations and Replies seams cover regeneration, the old code being rejected, and archived Guests.
- [ ] Checked in a browser.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.
