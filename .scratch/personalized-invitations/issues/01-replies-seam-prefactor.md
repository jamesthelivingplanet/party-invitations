# 01: Replies seam: move today's behavior behind a tested module

**What to build:** Move the app's existing handling of Replies behind one tested Replies module, with no change visible to Guests or the Host (a prefactor: make the change easy, then make the easy change). The module owns: recording a Reply sent through the Shared link and the Match outcome (confirmed, needs review, or no match); deciding which Reply counts for each Guest (the latest wins); ignoring Replies that belong to archived Guests; and the Host's review actions (confirm as a Guest, assign to a Guest, not invited, undo). The admin dashboard and the Shared-link submission both go through it. The Jev matching model and the clock are supplied from outside so tests can script them.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] Tests at the Replies seam cover: a confident Match is confirmed; a middling Match goes to review with a suggested Guest; a "nobody" answer with a plausible runner-up goes to review; a "nobody" answer otherwise is no match; archived Guests are never offered as Matches.
- [ ] Tests cover the latest Reply winning per Guest, archived Guests' Replies being left out of the counts and returning when the Guest is restored, and every review action including undo.
- [ ] The dashboard's numbers (coming, declined, not replied, needs review, headcount) are produced by the module, not computed inline in the page.
- [ ] Replies already in the live database, including the test Replies, still show with the same status and the same counts.
- [ ] A Guest using the Shared link sees exactly what they saw before, and the admin review flow (two-step confirm, undo) still works when checked in a browser.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.
