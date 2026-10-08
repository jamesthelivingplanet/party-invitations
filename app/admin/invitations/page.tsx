import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/admin-auth";
import { placeholders } from "@/lib/invitations";
import { guestStore, invitationStore } from "@/lib/stores";
import { Section } from "../ui";
import { AdminShell } from "../shell";
import { resetGuestMessage, saveGuestMessage, saveTemplate, toggleSent } from "./actions";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitations", robots: { index: false } };

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";
const primary =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700";

export default async function Invitations(props: PageProps<"/admin/invitations">) {
  await requireAdminPage();
  const { error, saved, guest: guestParam, filter, edited } = await props.searchParams;
  const notReplied = filter === "not-replied";
  const guests = await guestStore.list();
  const chosenId = typeof guestParam === "string" ? guestParam : "";
  const chosen = guests.find((g) => g.id === chosenId) ?? guests[0];
  const [en, es] = await Promise.all([invitationStore.getTemplate("en"), invitationStore.getTemplate("es")]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const rows = await invitationStore.overview({ notReplied });
  const origin = `${proto}://${host}`;
  const messages = new Map(await Promise.all(rows.map(async (r) => [r.guestId, await invitationStore.messageFor(r.guestId, { origin })] as const)));
  const statusLabel = { not_sent: "Not sent", sent: "Sent", replied: "Replied" } as const;
  const statusStyle = {
    not_sent: "bg-zinc-100 text-zinc-700 ring-zinc-300",
    sent: "bg-sky-50 text-sky-800 ring-sky-200",
    replied: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  } as const;
  const preview = chosen ? await invitationStore.messageFor(chosen.id, { origin: `${proto}://${host}` }) : null;

  return (
    <AdminShell current="invitations">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Invitations</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Invitation messages</h1>
        <p className="text-sm text-zinc-600">
          One main message per language. Each Guest gets the one for their language, with their own details filled in.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}
      {(saved === "en" || saved === "es") && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {saved === "en" ? "English" : "Spanish"} message saved.
        </p>
      )}

      {(edited === "1" || edited === "reset") && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {edited === "1" ? "Message saved for this Guest only." : "Message reset to the main message."}
        </p>
      )}

      <Section title="Send">
        <div className="space-y-3">
          <nav aria-label="Filter" className="flex gap-2 text-sm font-semibold">
            <a href="/admin/invitations" aria-current={!notReplied ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl px-4 ring-1 ring-inset ${!notReplied ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-800 ring-zinc-300"}`}>
              All Guests
            </a>
            <a href="/admin/invitations?filter=not-replied" aria-current={notReplied ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl px-4 ring-1 ring-inset ${notReplied ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-800 ring-zinc-300"}`}>
              Not replied
            </a>
          </nav>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-600">{notReplied ? "Everyone has replied." : "No Guests yet."}</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-2xl bg-white ring-1 ring-zinc-200">
              {rows.map((r) => (
                <li key={r.guestId} data-guest={r.name} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 break-words font-semibold text-zinc-900">{r.name}</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{r.language === "es" ? "Spanish" : "English"}</span>
                    <span data-testid="status" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyle[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                    {r.hasCustomMessage && <span data-testid="edited" className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Edited</span>}
                    {r.sentAt && <time dateTime={r.sentAt} className="text-xs text-zinc-500">sent {new Date(r.sentAt).toISOString().slice(0, 16).replace("T", " ")} UTC</time>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ShareButton guestId={r.guestId} message={messages.get(r.guestId) ?? ""} />
                    <form action={toggleSent}>
                      <input type="hidden" name="guest" value={r.guestId} />
                      <input type="hidden" name="sent" value={r.sentAt ? "0" : "1"} />
                      <button className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline">
                        {r.sentAt ? "Mark not sent" : "Mark sent"}
                      </button>
                    </form>
                  </div>
                  <details className="group">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline">Edit message</summary>
                    <div className="space-y-3 pt-2">
                      <form action={saveGuestMessage} className="space-y-3">
                        <input type="hidden" name="guest" value={r.guestId} />
                        <label htmlFor={`msg-${r.guestId}`} className={label}>Message for {r.name} only</label>
                        <textarea id={`msg-${r.guestId}`} name="body" defaultValue={messages.get(r.guestId) ?? ""} rows={10} maxLength={2000} className={field} />
                        <button className={primary}>Save for {r.name} only</button>
                      </form>
                      {r.hasCustomMessage && (
                        <form action={resetGuestMessage}>
                          <input type="hidden" name="guest" value={r.guestId} />
                          <button className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-rose-700 underline-offset-2 hover:underline">Reset to main message</button>
                        </form>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Preview">
        {guests.length === 0 ? (
          <p className="text-sm text-zinc-600">Add a Guest to preview their message.</p>
        ) : (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="preview-guest" className={label}>Guest</label>
                <select id="preview-guest" name="guest" defaultValue={chosen.id} className={field}>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.language === "es" ? "Spanish" : "English"})
                    </option>
                  ))}
                </select>
              </div>
              <button className={primary}>Preview</button>
            </form>
            <pre
              data-testid="message-preview"
              lang={chosen.language}
              className="whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 font-sans text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200"
            >
              {preview}
            </pre>
          </div>
        )}
      </Section>

      {(
        [
          ["en", "English message", en],
          ["es", "Spanish message", es],
        ] as const
      ).map(([language, title, body]) => (
        <Section key={language} title={title}>
          <form action={saveTemplate} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <input type="hidden" name="language" value={language} />
            <input type="hidden" name="guest" value={chosen?.id ?? ""} />
            <div>
              <label htmlFor={`body-${language}`} className={label}>{title}</label>
              <textarea id={`body-${language}`} name="body" defaultValue={body} rows={10} maxLength={2000} className={field} />
            </div>
            <button className={primary}>Save {language === "en" ? "English" : "Spanish"} message</button>
          </form>
        </Section>
      ))}

      <section className="space-y-2 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-800">Placeholders</h2>
        <p>Type these in a message and they are filled in for each Guest. {"{link}"} is required.</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {Object.entries(placeholders).map(([key, meaning]) => (
            <li key={key}>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5">{`{${key}}`}</code> {meaning}
            </li>
          ))}
        </ul>
        <p>If the time, place or Reply deadline is not set yet, the message says &quot;to be announced&quot; (Spanish: &quot;por confirmar&quot;).</p>
      </section>
    </AdminShell>
  );
}
