# 04: Companions: named people, adult or child

**What to build:** When a Guest says more than one person is coming, they must name each Companion and mark each as an adult or a child. This applies to every Reply, whether it arrives through a Personal link or the Shared link. The admin shows Companions with their labels and the counts of adults and children.

**Blocked by:** 03 (A Guest can change their Reply through the link)

**Status:** resolved

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] A Party size above one requires exactly Party size minus one Companions, each with a name and an adult or child label; fewer or more is refused with a clear message.
- [ ] A Reply that says not coming takes no Companions, and the form hides those questions.
- [ ] Changing the Party size on the form adds or removes Companion fields to match.
- [ ] Both the Personal-link form and the Shared-link form follow the same rule.
- [ ] The admin lists each Reply's Companions with their labels and shows total adults and children; the headcount still equals the sum of Party sizes.
- [ ] Tests at the Replies seam cover the exact-count rule, the not-coming case and the label requirement.
- [ ] Existing Replies (which have no Companions) keep working.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.

## Answer

Done on ticket-04. Companions JSON column; errors companion_count/companion_incomplete; shared form fields in app/companion-fields.tsx.
