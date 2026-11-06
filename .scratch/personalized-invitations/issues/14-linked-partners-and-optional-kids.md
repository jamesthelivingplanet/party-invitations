# 14: Linked partners and optional children

**What to build:** Partners are separate Guests, each with their own Personal link, but the Host can link two Guests as partners (a household of two; linking is mutual) and mark a Guest as having children. On the Invitation page, a Guest who says Yes and has an active linked partner is asked "Are you coming with <partner's first name>?"; if yes, the partner gets a "coming" Reply recorded for them, shown on the dashboard as "Answered by <Guest>". The partner can open their own link, see it and change it (latest Reply wins per person). If the household has children, the Guest is also asked "And your children?" and, if yes, how many; their names and adult/child labels are optional (a relaxation of the Companion rule for this flow only). Children are counted once per household. The Host sets the partner and "has children" on the Guests screen (add and edit), sees the link on the Guest row, and can unlink.

**Blocked by:** 04 (Companions), 05 (Reply deadline), 06 (archived Guests)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] A Guest can be linked to one other active Guest; the link is mutual, linking to someone new clears the old link on both sides, and unlinking works. A Guest cannot be linked to themselves or to an archived or unknown Guest. A Guest can be marked as having children.
- [ ] Existing databases upgrade in place (new nullable columns only); existing Guests have no partner and no children, and existing Replies keep their meaning.
- [ ] After Yes, a Guest with an active linked partner is asked "Are you coming with <first name>?" (EN and ES). Yes records a "coming" Reply for the partner unless the partner's current Reply already says coming; No records nothing for the partner.
- [ ] After No, none of the household questions appear and nothing is recorded for the partner. An archived partner is never offered or recorded. A Guest with no partner sees no partner question.
- [ ] If the Guest or their partner is marked as having children, the Guest is asked "And your children?"; Yes asks for the number of children, with optional names and optional adult/child labels.
- [ ] Children are counted once per household: of the two partners' current Replies that say coming and answer the children question, the newest one's answer counts (a "no" answer counts as zero); the other partner's children are not counted. The headcount still equals the sum of the Party sizes shown on the dashboard.
- [ ] The Reply deadline and archived-Guest rules apply to the whole household Reply.
- [ ] The dashboard tags a partner's Reply recorded this way "Answered by <Guest name>"; a partner who replies directly shows as a normal Reply.
- [ ] The Guests screen's add and edit forms have a partner picker (other active, unlinked Guests, plus "No partner") and a "Has children" checkbox; the Guest row shows the partner.
- [ ] Tests at the Replies and Guest list seams; browser behaviour in the Playwright suite at phone width.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on personalized-invitations. Guests: partner_id, has_children; setPartner (mutual, relinking clears old). Replies: rsvps.children (JSON, NULL = not asked) and answered_by_guest_id; withPartner records a coming Reply for an active partner who is not already coming; householdForPersonalLink feeds the page. Children counted once per household: of the two partners' current coming Replies that answered "And your children?", the newest (by row id) counts, an answer of none counts as zero; Entry.partySize includes them. Open questions for the Host: an answer for a partner overrides the partner's own earlier No and is not withdrawn when the Guest later says No or "without"; after unlinking, both parents' children answers count.

