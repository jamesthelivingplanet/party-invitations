import seedGuests from "@/guests.json";
import { db } from "./db";
import { createEventStore } from "./event";
import { createGuestStore } from "./guests";

// guests.json only seeds the very first guest list; after that the database is the source of truth.
export const guestStore = createGuestStore(db, { seed: seedGuests });
export const eventStore = createEventStore(db);
