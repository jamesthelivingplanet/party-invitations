# 10: Send-next mode

**What to build:** A focused view that shows one unsent Guest at a time with their message and a large Share button, then moves to the next unsent Guest after the Host sends, so working through about 100 Guests on a phone is quick.

**Blocked by:** 08 (Share, Copy and sent status)

**Status:** ready-for-agent

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] The view shows the next unsent Guest, their language and their message, with a large Share (or Copy) button.
- [ ] After sharing or copying, the Guest is marked sent and the view advances to the next unsent Guest; when none are left it says so.
- [ ] The Host can skip a Guest and return to them later.
- [ ] Usable one-handed at phone width, checked in a browser; the share sheet itself is verified on the Host's phone.
- [ ] Typecheck, lint and the full test suite pass.
