# Personalized invitations

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md` (Host, Guest, Guest list, Invitation, Invitation page, Personal link, Shared link, Reply, Match, Party size, Companion, Request, Reply deadline). Decisions follow ADR 0001 (invitations go out through the phone's Share button) and ADR 0002 (single event, no Event concept yet).

This spec covers the work remaining after step 1 shipped (commit `712e8c7`: Guests in the database, event settings, admin login). Suggested order: (a) Personal links and the Invitation page, (b) the Invitations screen, (c) Requests and the Shared-link outcomes.

## Problem Statement

I am the Host of my son's birthday party and I have about 100 people to invite. Almost all of them are reachable on WhatsApp and Messenger, and about half read Spanish, not English. Today there is one public link: anyone who opens it types their name and who they are, and an AI model guesses which Guest they are. That works for people who find the link, but it is a poor way to invite people one by one:

- I cannot send each Guest something that is clearly for them, in their language, that greets them by name and needs no guessing about who they are.
- I have no record of who I have already sent an invitation to, so with 100 people I lose my place.
- A Guest who wants to bring family cannot say who is coming, only a number.
- Someone who is not on my list but opens the link gets nothing useful: I do not learn how to reach them.
- A Guest cannot change their answer later, and I cannot set a last day for answers.

## Solution

Every Guest gets a Personal link. I send each Guest an Invitation, a short message in their language containing their Personal link, using my phone's Share button (or Copy message on a computer). The app remembers which Invitations I have sent.

A Guest who opens their Personal link is greeted by name, sees the event details, and sends a Reply: coming or not, how many people, and the names (and adult or child) of anyone they bring. They can come back through the same link and change their Reply until the Reply deadline.

The Shared link keeps working for anyone I post it to. Jev tries to Match the person to my Guest list. A confident Match is confirmed quietly, an unsure Match waits for my review, and no Match shows a friendly form asking them to leave their details so I can get back to them. Those people become Requests that I can accept (they become Guests) or decline.

I edit one main Invitation template per language, can personalize the message for a single Guest before sending, and work through all 100 Guests quickly, one at a time, from my phone.

## User Stories

### Host: preparing the Guest list and the Invitations
1. As the Host, I want every Guest to have their own Personal link, so that an Invitation identifies who it is for without any guessing.
2. As the Host, I want Personal links to be long and unguessable, so that nobody can open another Guest's link by trying variations.
3. As the Host, I want to regenerate a Guest's Personal link, so that I can cut off a link that was forwarded or leaked.
4. As the Host, I want a regenerated Personal link to make the old one stop working, so that a leaked link cannot be used any more.
5. As the Host, I want a main Invitation template for English and another for Spanish, so that each Guest gets a message in the language they read.
6. As the Host, I want to edit each template's wording, so that the invitation sounds like me.
7. As the Host, I want placeholders in the template (the Guest's name, their Personal link, the event name, date, time, place, and Reply deadline), so that one template serves every Guest.
8. As the Host, I want to see a preview of the finished message for a particular Guest, so that I can check it reads well before I send it.
9. As the Host, I want sensible English and Spanish wording prepared as the starting templates, so that I am not starting from a blank page.
10. As the Host, I want to personalize the message for one Guest before sending, so that I can add a personal line for my close friends.
11. As the Host, I want a one-off edit to apply only to that Guest and leave the main template alone, so that I do not accidentally change everyone's message.
12. As the Host, I want a one-off edit to be saved with that Guest's Invitation, so that resending uses the same personalized message.
13. As the Host, I want a "reset to template" action on a personalized Invitation, so that I can undo my edit.
14. As the Host, I want the message to use the event details I set in the settings, so that I never type the date or place twice.
15. As the Host, I want a placeholder whose value is not set yet (for example the time) to be clearly flagged or handled gracefully in the preview, so that I do not send a message with a hole in it.

### Host: sending Invitations
16. As the Host, I want a list of all my Guests showing their language, whether an Invitation has been sent, and whether they have replied, so that I can see where everyone stands.
17. As the Host, I want a Share button on each Guest that opens my phone's share sheet with the finished message, so that I can send it through WhatsApp, Messenger, Discord or any other app.
18. As the Host, I want the Share button to work without needing the Guest's phone number or email, so that I can send to people I only know by a chat profile.
19. As the Host, I want a Copy message button where the share sheet is unavailable (for example on my computer), so that I can paste the message wherever I need it.
20. As the Host, I want an Invitation to be marked as sent automatically when I share or copy it, so that I do not have to keep a list myself.
21. As the Host, I want to toggle an Invitation between sent and not sent by hand, so that I can correct it when the share sheet closed without me actually sending.
22. As the Host, I want a "send next" view that shows one unsent Guest at a time with their message and a large Share button, so that I can get through 100 Guests quickly on my phone.
23. As the Host, I want the send-next view to move on to the next unsent Guest after I send, so that I never have to look for who is next.
24. As the Host, I want to resend an Invitation to a Guest who has not replied, by sharing the same saved message again, so that I can nudge people.
25. As the Host, I want to filter the list to Guests who have not replied, so that I can focus my follow-ups.
26. As the Host, I want the app to record only that I sent an Invitation (and when), not to track whether it was opened, so that the system stays simple.
27. As the Host, I want to copy a Guest's Personal link on its own, so that I can send it in a custom message.

### Guest: opening the Personal link and replying
28. As a Guest, I want my Personal link to open the Invitation page greeting me by my name, so that I know the invitation is really for me.
29. As a Spanish-speaking Guest, I want the page to open in Spanish, so that I understand it without having to find a language switch.
30. As a Guest, I want to be able to switch the page language, so that I can read it in the other language if I prefer.
31. As a Guest, I want to see the event's date, time and place (or that they are to be announced), so that I know what I am replying to.
32. As a Guest, I want to say whether I am coming or not with one tap, so that replying is quick.
33. As a Guest, I want to say how many people are coming, including me, so that the Host can plan.
34. As a Guest bringing others, I want to enter each Companion's name and say whether they are an adult or a child, so that the Host knows who is coming.
35. As a Guest, I want the form to ask for exactly as many Companion names as my Party size needs, so that I cannot forget anyone or enter too many.
36. As a Guest, I want to come back to the same link and see my current Reply, so that I can remember what I said.
37. As a Guest, I want to change my Reply through my Personal link, so that I can update it if my plans change.
38. As a Guest, I want my changed Reply to replace the earlier one, so that the Host sees only my latest answer.
39. As a Guest, I want to see how long I have to reply (the Reply deadline), so that I do not miss it.
40. As a Guest, after the Reply deadline I want to still see my Reply but not be able to change it, so that I know what the Host has on record.
41. As a Guest who says I am not coming, I want to skip the Party size and Companion questions, so that I am not asked things that do not apply.
42. As a Guest, I want a clear thank-you after replying, so that I know it went through.
43. As a Guest, I want an error I can understand if something goes wrong, so that I can try again.

### Someone else opens a forwarded Personal link
44. As someone who was sent a forwarded Personal link, I want a "Not [name]?" option, so that I can reply as myself instead of as the person the link was made for.
45. As someone using "Not [name]?", I want to say who I am, so that the app can find me on the Guest list.
46. As someone who is on the Guest list but opened another Guest's link, I want my Reply recorded as mine, so that I am not counted as the other Guest.
47. As the Host, I want a forwarded link never to overwrite the Reply of the Guest it was made for just because someone else typed their name, so that nobody's answer is changed by mistake.
48. As someone not on the Guest list who used "Not [name]?", I want the same friendly "leave your details" form as anyone else, so that I can still be considered.

### Anyone with the Shared link
49. As someone who finds the Shared link (for example on social media), I want to enter my name and who I am, so that I can try to find myself on the list.
50. As a Guest using the Shared link, I want a confident Match to be confirmed with a plain thank-you, so that replying is simple.
51. As the Host, I want the page never to reveal which Guest someone was matched to, or who is on the list, so that my Guest list stays private.
52. As someone whose Match is uncertain, I want to be told my Reply was received and will be confirmed, so that I am not left wondering.
53. As the Host, I want uncertain Matches to land in my review list with the model's best guess, so that I can decide.
54. As the Host, I want a Match to be treated as uncertain when the model says "nobody" but a real Guest is still a plausible second choice, so that a likely Guest is not wrongly turned away.
55. As someone the app cannot Match, I want a friendly message ("We'd love to have you at the party. Leave your details here so we can get back to you.") with a form, so that I still have a way in.
56. As the Host, after the Reply deadline I want the Shared link to say that replies are closed, so that late replies stop arriving.

### Requests
57. As someone leaving a Request, I want to give my name, so that the Host knows who I am.
58. As someone leaving a Request, I want to give a way to reach me: phone, email, WhatsApp, Messenger, or another way I describe, so that the Host can get back to me.
59. As someone leaving a Request, I want to be required to give at least one way to reach me, so that my Request is not useless.
60. As someone leaving a Request, I want my answer (coming or not) and how many people to be kept with it, so that the Host knows what I asked for.
61. As the Host, I want to see all Requests in the admin, so that I can handle them in one place.
62. As the Host, I want to accept a Request, which makes that person a Guest on my list, so that they can be sent an Invitation like everyone else.
63. As the Host, I want to choose the new Guest's language when I accept a Request, so that their Invitation is in the right language.
64. As the Host, I want to decline a Request, so that it leaves my list of things to handle.
65. As the Host, I want to see how each Request was made (the Shared link or a forwarded Personal link) and the person's own words, so that I can judge it.
66. As the Host, I want a Request not to count toward my headcount until I accept it, so that my numbers stay trustworthy.

### Host: deadlines and oversight
67. As the Host, I want the Reply deadline to apply to every Personal link and the Shared link, so that all Replies close on the same day.
68. As the Host, I want to still change anything from the admin after the deadline, so that I can fix mistakes or take late answers.
69. As the Host, I want Companions shown in the admin with their adult or child label, so that I know how many children and adults to plan for.
70. As the Host, I want the headcount to include Companions through Party size, so that my total is right.
71. As the Host, I want my existing way of reviewing uncertain Replies (confirm, assign to a guest, not invited, undo) to keep working, so that nothing I rely on disappears.
72. As the Host, I want the old "not on my list but welcome" action to become "accept request", so that the same idea has one name.
73. As the Host, I want the admin to stay behind my login, so that guest details are private.

## Implementation Decisions

- **Two new deep modules, one for Replies and one for Invitations.** Everything below is decided at the level of what each module does; the screens and pages are thin and call them.
- **Replies module.** It owns all the ways a Reply arrives and is the single place that applies the Reply deadline, the Companion rules, and the Match outcomes. Its operations, in domain terms:
  - Send or change a Reply through a Personal link: coming or not, Party size, Companions.
  - Identify oneself as someone else from a Personal link ("Not [name]?").
  - Send a Reply through the Shared link: name and who they are.
  - Leave a Request.
  - List Requests, accept a Request (it becomes a Guest), decline a Request.
- **One current Reply per Guest.** Changing a Reply replaces the earlier answer. A Guest's latest Reply is what counts.
- **Reply deadline.** A Reply, or a change to one, is refused after the Reply deadline (event date minus the deadline days, closing at the end of that day in the event's local time) for both the Personal link and the Shared link. When no deadline is set, replies stay open. The admin is exempt. The current time is supplied to the module from outside, so it can be controlled.
- **Companions.** When Party size is more than one, exactly Party size minus one Companions must be given, each with a name and a label of adult or child. Not-coming Replies have no Companions. Party size continues to include the replier and all Companions.
- **Personal links.** Each Guest has one unguessable code, carried in the link. Regenerating it invalidates the old one. The code identifies the Guest; it does not authenticate them, and a forwarded link counts as that Guest unless the person uses "Not [name]?".
- **Shared-link Matching (existing behavior preserved).** The model scores each active Guest plus an explicit "nobody" option. A confident Match (existing threshold) is confirmed. A middling Match (at least 0.40, below the confident threshold) goes to review with that Guest as the suggestion; the visitor may then add optional contact details, shown only to the Host. Anything below 0.40, a "nobody" answer (even with a runner-up) and a Jev failure are no Match: nothing goes to review, the visitor leaves details and a Request is made, which keeps Jev's weak guess (or "Jev unavailable") for the Host. The Host can give a Request to an existing Guest. Archived Guests are never offered as Matches. The model call sits behind a small boundary so the rest of the module can be tested with scripted answers.
- **What a person sees is deliberately generic.** The Shared link and the "Not [name]?" path never reveal who is on the list or who a Reply was matched to.
- **"Not [name]?" path.** The person identifies themselves and goes through the same Matching and the same three outcomes as the Shared link. A Match to a different Guest records the Reply for that Guest and leaves the original Guest's Reply untouched.
- **Request.** A Request has a name, an optional answer (coming or not) and Party size, how it arrived (Shared link or a forwarded Personal link), the person's own words, and contact details. Contact details are phone, email, WhatsApp, Messenger and an "other way" field; at least one is required. Accepting creates a Guest (with a language chosen by the Host) and removes the item from the Requests list; declining dismisses it. Requests are not counted in the headcount until accepted.
- **Review flow is kept and reshaped.** The existing review actions (confirm as a suggested Guest, assign to a Guest, mark not invited, undo) remain. The existing "not on my list but welcome" action becomes accepting a Request.
- **Invitations module.** It owns the templates, Personal link management, message building and sent status:
  - One main template per language (English, Spanish), stored in the database and editable by the Host, with placeholders for the Guest's name, their Personal link, and the event's name, date, time, place and Reply deadline.
  - Building a Guest's message uses the template for that Guest's language and the current event settings. A Guest's message can be edited once for that Guest only; the edit is saved with their Invitation and can be reset to the template.
  - Each Guest's Invitation records whether it has been sent and when. It is marked sent when the Host shares or copies it, and the Host can toggle it by hand. Resending reuses the saved message. Nothing about opening or delivery is tracked.
  - Starting English and Spanish wording is written by the implementer and reviewed by the Host (and ideally a native Spanish speaker).
- **Guest list and event settings (from step 1) are reused.** No change to their behavior. The Reply deadline setting already exists.
- **Invitation page.** A Personal link opens the page greeting the Guest by name, in the Guest's language, with the language toggle still available. The page shows the Guest's current Reply and lets them change it until the deadline, then shows it read-only. The Shared link keeps the existing form and gains the Request outcome and the "replies are closed" state.
- **Admin screens.** A new Invitations area with the Guest list view, the send-next view, and the template editor; a Requests list (surfaced from the dashboard); Companions with adult/child labels shown on replies. All admin screens remain behind the existing login.
- **Sharing.** The Share button uses the browser's native share sheet where it exists (ADR 0001). Where it does not, a Copy message button is shown. Neither needs a phone number or email for the Guest.
- **Data.** Guests gain a Personal link code, a saved message, and a sent status. New storage is needed for the templates, for Companions on Replies, and for Requests. Existing Reply records and the existing test Replies must keep working. The two ADRs apply: no Event concept, and no messaging-platform APIs.
- **Privacy.** Guest names and contact details live only in the database and are shown only in the logged-in admin. Personal link codes are the only identifying value in a URL.

## Testing Decisions

- **What makes a good test here:** it drives a module through its public operations, uses a real in-memory database, and asserts only behavior a Host or Guest could observe (what a Reply does, what a message says, what status something has). It does not assert on internal tables, call counts, or private helpers, and it takes expected values from known literals or worked examples, not by recomputing them the way the code does.
- **Seams (confirmed with the Host):**
  - **Replies** (new): Personal-link Replies and changes, Companion rules, the Reply deadline, Shared-link Matching outcomes, "Not [name]?", and Request creation, acceptance and decline.
  - **Invitations** (new): template editing, building a message per Guest and language with placeholders, one-off edits and reset, Personal link creation and regeneration, and sent status including resend.
  - **Existing seams reused** from step 1: Guest list, Event settings, and Admin session.
- **What is faked:** only system boundaries, namely the Jev matching model (scripted answers) and the clock. Nothing inside the codebase is mocked.
- **Behaviors the tests should cover (not exhaustive):**
  - A Reply sent through a Personal link is recorded for that Guest; changing it replaces the earlier one.
  - A Party size above one requires exactly Party size minus one named Companions, each adult or child; a not-coming Reply takes none.
  - A Reply or change is accepted up to the end of the deadline day and refused after; with no deadline set, it is always accepted; the Shared link follows the same rule.
  - A regenerated Personal link makes the old code useless; an unknown code is rejected.
  - Shared-link and "Not [name]?" Replies produce exactly one of: confirmed, review with a suggested Guest, or Request; a "nobody" answer, a weak Match or a Jev failure becomes a Request, never a review item; archived Guests are never matched.
  - A Request without a name or without any contact method is rejected; accepting one creates a Guest in the chosen language; declining removes it; Requests do not count toward the headcount until accepted.
  - A forwarded link never changes the original Guest's Reply when someone identifies as another Guest.
  - A message is built in the Guest's language, with every placeholder filled from the Guest and the current event settings; a one-off edit affects only that Guest and survives a resend; reset restores the template; editing the main template changes later messages.
  - Sent status is set by sharing or copying, can be toggled, and a resend keeps the saved message.
- **Prior art in the codebase:** the guest list, event settings, admin session and login tests written in step 1 (an in-memory database per test, public operations only, validation and persistence checked through the interface, a fake clock for expiry, and mutation checks on security-sensitive rules).
- **Not unit-tested, verified by hand in a real browser:** the admin screens, the Invitation page's layout, the Share and Copy buttons, and the send-next view. Run the type checker regularly, single test files while working, and the full suite once at the end.

## Out of Scope

- Sending email from the app (and creating a dedicated address for it).
- Notifying guests when event details change (calendar updates, email, or any automation).
- Automatic follow-ups after a number of days without a reply. Resend is manual.
- Pasting in or importing a whole Guest list (the Host adds Guests one at a time; the real list is loaded separately).
- Email and phone fields on Guests, and a direct "open this person's WhatsApp chat" button.
- Tracking whether an Invitation was opened, delivered or read.
- Using WhatsApp Business or Messenger platform APIs (ADR 0001).
- Multiple events, multiple Hosts, accounts, or any Event concept (ADR 0002).
- A logout button for the admin.

## Further Notes

- **State of the project:** step 1 shipped (Guests in the database with add, edit, archive and restore; editable event settings including the Reply deadline; admin login). The live database holds the five placeholder Guests and a few test Replies; the real Guest list and the event's time and place are still to come.
- **Assumptions carried from the design conversation that were not explicitly confirmed one by one.** Please confirm or change before building:
  1. A Guest has only a name, a language and notes for now.
  2. "Sent" is marked automatically when the share sheet closes or Copy is tapped, with a manual toggle.
  3. A Personal link opens in the Guest's language, with a toggle to switch.
  4. The Reply deadline closes at the end of that day in the event's local time.
  5. The Jev model runs in two places: Shared-link Replies and the "Not [name]?" path.
  6. A Request is not counted in the headcount until accepted.
  7. A Request that says it is coming with more than one person names its Companions the same way as any Reply.
  8. What a Personal link shows for an archived Guest (suggested: a polite "this invitation is no longer available", and no new Replies accepted).
- **Spanish wording** is drafted by the implementer; have a native speaker skim the templates and the page copy before sending Invitations.
- **Existing live behavior to preserve:** the Shared-link form, Matching thresholds, the review actions with their two-step confirmation and undo, archived Guests excluded from counts, and the admin login.
- **Suggested slicing for `/to-tickets`:** (a) Personal links, the Reply module's Personal-link path, and the Invitation page; (b) Invitations module and the Invitations screen with Share, Copy, sent status, send-next and templates; (c) Shared-link outcomes, "Not [name]?", Requests and their admin screen.
