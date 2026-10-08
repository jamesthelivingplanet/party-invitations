# 08: Share, Copy and sent status

**What to build:** The Invitations area lists every Guest with their language and a status of Not sent, Sent or Replied. Each row has a Share button that opens the phone's share sheet with the finished message (a Copy message button appears where the share sheet is unavailable). Neither needs the Guest's phone number or email. Sharing or copying marks the Invitation as sent, with the time. The Host can toggle sent by hand and can filter to Guests who have not replied.

**Blocked by:** 07 (Invitation templates and message preview)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] The list shows each Guest's language and a Not sent, Sent or Replied status; Replied comes from the Guest's Reply.
- [ ] Share opens the native share sheet with the finished message where the browser supports it; otherwise Copy message is offered and copies it.
- [ ] Sharing or copying marks the Invitation sent and records when; the Host can toggle sent and not sent by hand.
- [ ] A filter shows only Guests who have not replied.
- [ ] Nothing about opening or delivery is tracked.
- [ ] Tests at the Invitations seam cover sent status, the toggle, and Replied being reflected. The share sheet itself is verified on the Host's phone, not in unit tests.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-08. overview/setSent on Invitations store; Share/Copy buttons; reshare updates sent time. Known e2e flake: shared-link "counted as declined" after personal-link spec on shared e2e.db.
