import seedGuests from "@/guests.json";
import { db } from "./db";
import { createEventStore } from "./event";
import { createGuestStore } from "./guests";
import { createInvitationStore } from "./invitations";
import { fakeJev } from "./fake-jev";
import { askJev } from "./match";
import { createReplyStore } from "./replies";

// guests.json only seeds the very first guest list; after that the database is the source of truth.
export const guestStore = createGuestStore(db, { seed: seedGuests });
export const eventStore = createEventStore(db);
export const replyStore = createReplyStore(db, { guests: guestStore, jev: process.env.E2E_FAKE_JEV ? fakeJev : askJev });
export const invitationStore = createInvitationStore(db, { guests: guestStore, event: eventStore, replies: replyStore });
