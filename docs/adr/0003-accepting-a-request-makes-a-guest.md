---
status: accepted
---

# Accepting a Request makes a real Guest; the review flow's "Accept request" does the same

A Request lives apart from Replies (own table) so it can never count. Accepting one creates a Guest (name from the Request, language chosen by the Host, notes empty, Personal link generated) and writes the Request's answer, Party size and Companions as that Guest's current Reply, then deletes the Request. A Request with no answer yields a Guest with no Reply. Declining deletes the Request and nothing else. Accepting claims the Request row first by deleting it, so a double submit cannot create two Guests.

The old review action "Not on my list, but welcome" counted a Reply under a free-text name without any Guest behind it. It is now "Accept request": it creates a real Guest the same way and assigns the Reply to them, keeping the two-step confirmation. A review item is a Reply, not a Request, so it is not deleted; it is decided like any other Reply. Review items from before this change that were "welcomed" by name keep working as they were.

## Consequences

- Every counted person is now a Guest with a Personal link, except old pre-change welcomed names.
- The Host picks a language when accepting (default English); it can be changed later on the Guests screen.
- Accept and decline of a Request are not undoable; decline asks for a second tap.
