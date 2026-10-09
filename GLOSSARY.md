# Birthday Invitations

Lets a Host invite a list of people to a party, send each of them a personalized invitation, and collect their replies. Started for Alex's 2026 birthday, with the aim of growing into a tool for personalized invitations to any event.

## Language

**Host**:
The person organizing the event and sending the invitations.
_Avoid_: Admin, organizer, owner

**Guest**:
A person the Host has invited and who appears on the Guest list.
_Avoid_: Invitee, attendee, contact

**Guest list**:
The Host's roster of Guests for an event.
_Avoid_: Invite list, invitee list

**Invitation**:
The personalized message the Host sends to one Guest, containing that Guest's Personal link.
_Avoid_: Invite, invite message

**Invitation page**:
The web page where someone sees the event details and sends a Reply.
_Avoid_: Invite page, landing page

**Personal link**:
A link unique to one Guest. Opening it identifies which Guest is replying, so no Match is needed.
_Avoid_: Unique link, custom link

**Shared link**:
A single link the Host posts publicly (for example on social media) that anyone can open. Replies sent through it must be Matched to the Guest list.
_Avoid_: Public link, generic link

**Reply**:
A response to an Invitation saying whether the replier is coming and for how many people.
_Avoid_: Submission, response

**Match**:
Deciding which Guest on the Guest list a Reply sent through the Shared link comes from.
_Avoid_: Lookup, linking

**Party size**:
How many people a Reply covers, including the person replying.
_Avoid_: Headcount (that is the total across all Replies), guest count

**Companion**:
A person a Guest names in their Reply as coming with them, identified by name and as an adult or a child. Companions count toward Party size and are not on the Guest list.
_Avoid_: Plus-one, extra guest

**Request**:
A Reply from someone who is not on the Guest list, who leaves their name and ways to reach them so the Host can decide whether to invite them. The Host accepts a Request (the person becomes a Guest, in a language the Host picks, and the Reply that came with it is kept and counts) or declines it (it is removed, nothing is counted). A Request also keeps Jev's weak guess at the closest Guest (or that Jev was unavailable), for the Host only; the Host can instead give the Request to an existing Guest, which assigns its Reply to them. In the review flow, "Accept request" does the same for a Reply the Host cannot place: it becomes a Guest and the Reply counts for them. Not counted until accepted.
_Avoid_: Application, lead, walk-in

**Reply deadline**:
The last day Replies can be sent or changed, set as a number of days before the event.
_Avoid_: RSVP date, cutoff
