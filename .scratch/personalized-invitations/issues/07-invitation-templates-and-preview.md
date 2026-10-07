# 07: Invitation templates and message preview

**What to build:** A new Invitations area in the admin where the Host edits one main template per language (English and Spanish), using placeholders for the Guest's name, their Personal link, and the event's name, date, time, place and Reply deadline. Starting wording is provided in both languages for the Host to adjust. The Host can preview the finished message for any Guest, written in that Guest's language with every placeholder filled.

**Blocked by:** 02 (A Guest can reply through their Personal link)

**Status:** ready-for-agent

**Spec:** `.scratch/personalized-invitations/spec.md`

- [ ] The Invitations area shows both templates, which the Host can edit and save; saved wording persists.
- [ ] Starting English and Spanish wording exists, written for review by the Host and ideally a native Spanish speaker.
- [ ] A preview for a chosen Guest uses that Guest's language and fills the Guest's name, their own Personal link and the current event details.
- [ ] A placeholder whose value is not set yet (for example the time) is shown in a way that makes sense to the reader (for example "to be announced" / "por confirmar") and never leaves a blank or a raw placeholder.
- [ ] Editing the main template changes later previews.
- [ ] Tests at the Invitations seam cover message building per Guest and language, placeholder filling and the unset-value case.
- [ ] Written test-first (`/tdd`) at the seams agreed in the spec; no new seam is added without checking with the Host.
- [ ] Typecheck, lint and the full test suite pass.
