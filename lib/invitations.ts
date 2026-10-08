import type { Client } from "@libsql/client";
import { replyDeadlineDate, type createEventStore } from "./event";
import type { createGuestStore, Language } from "./guests";
import { formatDate } from "./party";

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
 * Later tickets add one-off edits and sent status here.
 */
export function createInvitationStore(
  db: Client,
  deps: { guests: ReturnType<typeof createGuestStore>; event: ReturnType<typeof createEventStore> },
) {
  let ready: Promise<unknown> | null = null;
  const ensure = () =>
    (ready ??= db.execute(`
      CREATE TABLE IF NOT EXISTS invitation_templates (
        language TEXT PRIMARY KEY,
        body TEXT NOT NULL
      )
    `));

  async function getTemplate(language: Language): Promise<string> {
    cleanLanguage(language);
    await ensure();
    const { rows } = await db.execute({
      sql: "SELECT body FROM invitation_templates WHERE language = ?",
      args: [language],
    });
    return rows[0] ? String(rows[0].body) : startingTemplates[language];
  }

  return {
    getTemplate,

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

    /** The finished message for one Guest, in their language, with every placeholder filled. */
    async messageFor(guestId: string, opts: { origin: string }): Promise<string> {
      const guest = (await deps.guests.list({ includeArchived: true })).find((g) => g.id === guestId);
      if (!guest) throw new Error("No such guest.");
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
