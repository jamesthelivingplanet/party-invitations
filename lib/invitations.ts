import type { Client } from "@libsql/client";
import { replyDeadlineDate, type createEventStore } from "./event";
import type { createGuestStore, Language } from "./guests";
import { formatDate } from "./party";
import type { createReplyStore } from "./replies";

export type InvitationStatus = "not_sent" | "sent" | "replied";
export type InvitationRow = {
  guestId: string;
  name: string;
  language: Language;
  /** Replied (from the Guest's Reply) wins over Sent; Sent is the Host's own record. */
  status: InvitationStatus;
  /** When the Host last shared or copied it (ISO time), or null when not marked sent. */
  sentAt: string | null;
  /** True when the Host has edited this Guest's message by hand (a one-off edit saved with the Invitation). */
  hasCustomMessage: boolean;
};

export class ValidationError extends Error {}

/** The placeholders a template may use, with what each stands for (shown to the Host in the editor). */
export const placeholders = {
  name: "the Guest's name",
  link: "the Guest's Personal link",
  event: "the event's name",
  date: "the event date",
  time: "the event time",
  place: "the event place",
  deadline: "the Reply deadline (last day to reply)",
} as const;

const notSet: Record<Language, string> = { en: "to be announced", es: "por confirmar" };

/** Starting wording for the Host to adjust. Spanish needs a native speaker's review. */
const startingTemplates: Record<Language, string> = {
  en: `Hi {name}! You're invited to {event}!

📅 {date}
🕑 {time}
📍 {place}

Please let us know if you can come by {deadline}. Tap your personal link to reply:
{link}`,
  es: `¡Hola {name}! ¡Estás invitado/a a {event}!

📅 {date}
🕑 {time}
📍 {place}

Por favor avísanos si puedes venir antes del {deadline}. Toca tu enlace personal para responder:
{link}`,
};

const MAX_TEMPLATE = 2000;

function cleanTemplate(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new ValidationError("A template needs some text.");
  if (trimmed.length > MAX_TEMPLATE) throw new ValidationError(`A template can be at most ${MAX_TEMPLATE} characters.`);
  for (const [, key] of trimmed.matchAll(/\{([^{}]*)\}/g)) {
    if (!(key in placeholders)) {
      throw new ValidationError(
        `Unknown placeholder {${key}}. Use only: ${Object.keys(placeholders).map((k) => `{${k}}`).join(", ")}.`,
      );
    }
  }
  if (!trimmed.includes("{link}")) {
    throw new ValidationError("A template must include {link}, or the Guest cannot reach their Personal link.");
  }
  return trimmed;
}

function cleanLanguage(language: string): Language {
  if (language !== "en" && language !== "es") throw new ValidationError("Language must be English or Spanish.");
  return language;
}

/**
 * Invitations: the main template per language and the message built for each Guest.
 * Also the sent status of each Guest's Invitation. Later tickets add one-off edits here.
 */
export function createInvitationStore(
  db: Client,
  deps: {
    guests: ReturnType<typeof createGuestStore>;
    event: ReturnType<typeof createEventStore>;
    replies: Pick<ReturnType<typeof createReplyStore>, "summary">;
    now?: () => Date;
  },
) {
  const now = deps.now ?? (() => new Date());
  let ready: Promise<unknown> | null = null;
  const ensure = () =>
    (ready ??= migrate());
  const migrate = async () => {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS invitation_templates (
        language TEXT PRIMARY KEY,
        body TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS invitations (
        guest_id TEXT PRIMARY KEY,
        sent_at TEXT,
        message TEXT
      )`,
    ]);
    // Databases created before one-off edits lack the column.
    const { rows } = await db.execute("PRAGMA table_info(invitations)");
    if (!rows.some((r) => r.name === "message")) await db.execute("ALTER TABLE invitations ADD COLUMN message TEXT");
  };

  async function getTemplate(language: Language): Promise<string> {
    cleanLanguage(language);
    await ensure();
    const { rows } = await db.execute({
      sql: "SELECT body FROM invitation_templates WHERE language = ?",
      args: [language],
    });
    return rows[0] ? String(rows[0].body) : startingTemplates[language];
  }

  async function requireGuest(guestId: string) {
    const guest = (await deps.guests.list({ includeArchived: true })).find((g) => g.id === guestId);
    if (!guest) throw new Error("No such guest.");
    return guest;
  }

  return {
    getTemplate,

    /** Every active Guest with their language and Invitation status; optionally only those who have not replied. */
    async overview(opts: { notReplied?: boolean } = {}): Promise<InvitationRow[]> {
      await ensure();
      const summary = await deps.replies.summary();
      const replied = new Set([...summary.coming, ...summary.declined].map((e) => e.key));
      const { rows } = await db.execute("SELECT guest_id, sent_at, message FROM invitations");
      const sentAt = new Map(rows.map((r) => [String(r.guest_id), r.sent_at == null ? null : String(r.sent_at)]));
      const custom = new Set(rows.filter((r) => r.message != null).map((r) => String(r.guest_id)));
      const all = summary.guests.map((g): InvitationRow => {
        const at = sentAt.get(g.id) ?? null;
        return {
          guestId: g.id,
          name: g.name,
          language: g.language,
          status: replied.has(g.id) ? "replied" : at ? "sent" : "not_sent",
          sentAt: at,
          hasCustomMessage: custom.has(g.id),
        };
      });
      return opts.notReplied ? all.filter((r) => r.status !== "replied") : all;
    },

    /** Record that the Host shared or copied the Invitation (with the time), or clear it by hand. */
    async setSent(guestId: string, sent: boolean): Promise<void> {
      if (!(await deps.guests.list({ includeArchived: true })).some((g) => g.id === guestId)) {
        throw new Error("No such guest.");
      }
      await ensure();
      await db.execute({
        sql: `INSERT INTO invitations (guest_id, sent_at) VALUES (?, ?)
              ON CONFLICT(guest_id) DO UPDATE SET sent_at = excluded.sent_at`,
        args: [guestId, sent ? now().toISOString() : null],
      });
    },

    /**
     * Save a one-off message for this Guest only. It is the finished text (no placeholders) and is what
     * messageFor returns until reset. It must still contain the Guest's Personal link.
     */
    async setMessage(guestId: string, text: string): Promise<void> {
      const guest = await requireGuest(guestId);
      const body = text.trim();
      if (!body) throw new ValidationError("A message needs some text.");
      if (body.length > MAX_TEMPLATE) throw new ValidationError(`A message can be at most ${MAX_TEMPLATE} characters.`);
      if (!body.includes(`/i/${guest.personalLinkCode}`)) {
        throw new ValidationError("The message must include this Guest's Personal link, or they cannot reply.");
      }
      await ensure();
      await db.execute({
        sql: `INSERT INTO invitations (guest_id, message) VALUES (?, ?)
              ON CONFLICT(guest_id) DO UPDATE SET message = excluded.message`,
        args: [guestId, body],
      });
    },

    /** Drop the one-off message so this Guest's message is built from the main template again. */
    async resetMessage(guestId: string): Promise<void> {
      await requireGuest(guestId);
      await ensure();
      await db.execute({ sql: "UPDATE invitations SET message = NULL WHERE guest_id = ?", args: [guestId] });
    },

    async setTemplate(language: Language, text: string): Promise<void> {
      cleanLanguage(language);
      const body = cleanTemplate(text);
      await ensure();
      await db.execute({
        sql: `INSERT INTO invitation_templates (language, body) VALUES (?, ?)
              ON CONFLICT(language) DO UPDATE SET body = excluded.body`,
        args: [language, body],
      });
    },

    /**
     * The message to send to one Guest. Contract: the Guest's saved one-off message when there is one
     * (returned as saved), otherwise the template for their language with every placeholder filled.
     */
    async messageFor(guestId: string, opts: { origin: string }): Promise<string> {
      const guest = await requireGuest(guestId);
      await ensure();
      const saved = await db.execute({ sql: "SELECT message FROM invitations WHERE guest_id = ?", args: [guestId] });
      if (saved.rows[0]?.message != null) return String(saved.rows[0].message);
      const event = await deps.event.get();
      const template = await getTemplate(guest.language);
      const deadline = replyDeadlineDate(event);
      const tbd = notSet[guest.language];
      const values: Record<keyof typeof placeholders, string> = {
        name: guest.name,
        link: `${opts.origin.replace(/\/+$/, "")}/i/${guest.personalLinkCode}`,
        event: event.name,
        date: formatDate(event.date, guest.language),
        time: event.time ?? tbd,
        place: event.place ?? tbd,
        deadline: deadline ? formatDate(deadline, guest.language) : tbd,
      };
      // One pass, so a value that looks like a placeholder is never expanded again.
      return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in values ? values[key as keyof typeof values] : whole,
      );
    },
  };
}
