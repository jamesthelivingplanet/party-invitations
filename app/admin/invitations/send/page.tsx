import { headers } from "next/headers";
import { requireAdminPage } from "@/lib/admin-auth";
import { invitationStore } from "@/lib/stores";
import { AdminShell } from "../../shell";
import { ShareButton } from "../share-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Send invitations", robots: { index: false } };

const link =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-300 bg-white";

/** Send-next mode: one unsent Guest at a time. Skipped Guests ride along in the URL, so nothing is stored. */
export default async function SendNext(props: PageProps<"/admin/invitations/send">) {
  await requireAdminPage();
  const { skip: skipParam } = await props.searchParams;
  const skip = (typeof skipParam === "string" ? skipParam : "").split(",").filter(Boolean);
  const { next, remaining, skippedLeft } = await invitationStore.nextUnsent({ skip });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const message = next ? await invitationStore.messageFor(next.guestId, { origin: `${proto}://${host}` }) : "";
  const skipHref = next ? `/admin/invitations/send?skip=${[...skip, next.guestId].map(encodeURIComponent).join(",")}` : "";

  return (
    <AdminShell current="invitations">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Invitations</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Send next</h1>
        <p data-testid="remaining" className="text-sm text-zinc-600">
          {remaining === 0 ? "No Invitations left to send." : `${remaining} left to send.`}
        </p>
      </header>

      {next ? (
        <div data-guest={next.name} className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="min-w-0 break-words text-2xl font-bold text-zinc-900">{next.name}</h2>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {next.language === "es" ? "Spanish" : "English"}
            </span>
          </div>
          <pre
            data-testid="message-preview"
            lang={next.language}
            className="whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 font-sans text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200"
          >
            {message}
          </pre>
          <ShareButton key={next.guestId} guestId={next.guestId} message={message} big />
          <a href={skipHref} className={`${link} w-full`}>Skip for now</a>
        </div>
      ) : remaining === 0 ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          All done. Every Invitation has been sent.
        </p>
      ) : (
        <div className="space-y-3">
          <p role="status" className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 ring-1 ring-inset ring-sky-200">
            Only skipped Guests are left ({skippedLeft}).
          </p>
          <a href="/admin/invitations/send" className={link}>Go back to the skipped Guests</a>
        </div>
      )}

      <p>
        <a href="/admin/invitations" className={link}>Back to all Invitations</a>
      </p>
    </AdminShell>
  );
}
