import Link from "next/link";
import type { ReactNode } from "react";

const tabs = [
  { id: "replies", href: "/admin", label: "Replies" },
  { id: "guests", href: "/admin/guests", label: "Guests" },
  { id: "invitations", href: "/admin/invitations", label: "Invitations" },
  { id: "settings", href: "/admin/settings", label: "Event settings" },
] as const;

export type AdminTab = (typeof tabs)[number]["id"];

/** Page frame for every logged-in admin screen: the racing stripe, the tabs and the content column. */
export function AdminShell({ current, children }: { current: AdminTab; children: ReactNode }) {
  return (
    <div className="min-h-full flex-1 bg-zinc-50 font-sans text-zinc-900">
      <div aria-hidden className="h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400" />
      <nav aria-label="Admin" className="border-b border-zinc-200 bg-white">
        <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 sm:px-5">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={t.id === current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
                  t.id === current
                    ? "border-red-600 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
