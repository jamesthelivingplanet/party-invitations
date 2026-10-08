# 09: Personalize one Guest's message, and resend

**What to build:** Before sending, the Host can edit the message for a single Guest. The edit applies only to that Guest, is saved with their Invitation, and can be reset to the main template. Resending a Guest's Invitation shares the same saved message again.

**Blocked by:** 08 (Share, Copy and sent status)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] An edit on one Guest's message changes only that Guest's message and leaves the main template and other Guests alone.
- [ ] The edited message is saved and is what Share and Copy use next time, including a resend.
- [ ] A reset control restores the template-built message.
- [ ] A resend of an already-sent Invitation shares the same message and keeps or updates the sent time as the Host expects.
- [ ] Tests at the Invitations seam cover isolation of the edit, persistence across a restart, reset, and resend reusing the saved message.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-09. setMessage/resetMessage; messageFor returns saved message.
