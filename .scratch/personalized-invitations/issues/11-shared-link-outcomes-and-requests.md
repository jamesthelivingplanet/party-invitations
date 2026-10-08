# 11: Shared-link outcomes and Requests

**What to build:** Someone using the Shared link now gets one of three clear outcomes. A confident Match says "You're confirmed". An unsure Match says the Reply was received and will be confirmed, and goes to the Host's review list. No Match shows a friendly form ("We'd love to have you at the party. Leave your details here so we can get back to you.") that requires a name and at least one way to reach them: phone, email, WhatsApp, Messenger, or another way they describe. The result is a Request, saved with their answer, Party size, Companions, how it arrived and their own words, and visible in an admin Requests list. The page never reveals who is on the Guest list.

**Blocked by:** 01 (Replies seam: move today's behavior behind a tested module), 04 (Companions: named people, adult or child)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] Each of the three outcomes shows its own message, in the visitor's language, and none of them names a Guest.
- [ ] A Request without a name, or without any contact method, is refused with a clear message.
- [ ] A Request keeps their coming answer, Party size, named Companions, the source (Shared link) and their own words.
- [ ] An admin Requests list shows each Request with its contact details; Requests are not counted in the headcount.
- [ ] Archived Guests are never matched.
- [ ] Tests at the Replies seam (Jev faked) cover each outcome and the Request validation rules.
- [ ] Checked in a browser at phone width, in English and in Spanish.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-11. requests table; submitRequest/listRequests with source shared|personal_forward; no-match no longer lands in review.
