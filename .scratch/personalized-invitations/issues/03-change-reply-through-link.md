# 03: A Guest can change their Reply through the link

**What to build:** A Guest who returns to their Personal link sees their current Reply already filled in, and can change it. The new Reply replaces the old one, so the Host always sees one current Reply per Guest.

**Blocked by:** 02 (A Guest can reply through their Personal link)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] Reopening the link shows the Guest's current answer, Party size and (once they exist) Companions.
- [ ] Changing the Reply replaces the earlier one; the dashboard counts the Guest once, with the latest answer.
- [ ] Changing from coming to not coming removes the Guest from the headcount.
- [ ] Tests at the Replies seam cover replacement and the effect on the counts.
- [ ] Checked in a browser at phone width.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-03. Replies.currentForPersonalLink; form pre-filled; companions to be pre-filled in ticket 04.
