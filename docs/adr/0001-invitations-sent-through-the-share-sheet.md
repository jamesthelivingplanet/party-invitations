---
status: accepted (revisit after Alex's party)
---

# Invitations are sent through the phone's Share button, not messaging-platform APIs

Most guests are reachable on WhatsApp and Messenger. Messenger doesn't let an app send the first message to someone, WhatsApp's official API needs approved message templates and a registered business number, and automating a personal WhatsApp account breaks its terms. So the app prepares each Invitation and the Host sends it with the Share button (or Copy message on desktop), and the app records only that it was sent. Email sending is deferred.

## Considered Options

- **WhatsApp Business API / Messenger Platform:** full automation, but blocked or heavily constrained by platform rules for cold invitations.
- **Unofficial WhatsApp automation:** easy, but risks the Host's own number being banned.

## Consequences

- The Host taps once per Guest, so sending to ~100 Guests takes a sitting, not a button press. Send-next mode exists to make that fast.
- The app can't confirm a message was actually sent or delivered.
