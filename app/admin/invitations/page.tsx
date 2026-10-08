import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/admin-auth";
import { placeholders } from "@/lib/invitations";
import { guestStore, invitationStore } from "@/lib/stores";
import { Section } from "../ui";
import { AdminShell } from "../shell";
import { saveTemplate } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitations", robots: { index: false } };

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";
const primary =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700";

export default async function Invitations(props: PageProps<"/admin/invitations">) {
  await requireAdminPage();
  const { error, saved, guest: guestParam } = await props.searchParams;
  const guests = await guestStore.list();
  const chosenId = typeof guestParam === "string" ? guestParam : "";
  const chosen = guests.find((g) => g.id === chosenId) ?? guests[0];
  const [en, es] = await Promise.all([invitationStore.getTemplate("en"), invitationStore.getTemplate("es")]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
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
