---
status: accepted (revisit after Alex's party)
---

# The app models a single event; there is no Event concept yet

The longer-term idea is a tool for personalized invitations to any event, but it's unproven. For Alex's party the Guest list, event settings, templates and Replies all belong to one implicit event, with one set of settings. We'll look at how the party goes before deciding how to grow it, and accept that adding many events later means reworking the data (adding an event to Guests, Replies and settings, and backfilling).

## Consequences

- Event settings live in one place, so a later Event concept can be introduced by giving that one place an identity and attaching existing data to it.
- No accounts, multiple Hosts or per-Host data.
