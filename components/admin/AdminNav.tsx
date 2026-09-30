"use client";

import { Gavel, Settings, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/registrations", label: "Registrations", icon: Users },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
const ADMINS_LINK = { href: "/admin/admins", label: "Admins", icon: ShieldCheck };

/** Admin tabs. The current section is underlined in gold. Super admins also get Admins. */
export function AdminNav({ showAdmins = false }: { showAdmins?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto">
      {(showAdmins ? [...LINKS, ADMINS_LINK] : LINKS).map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-4 px-2 font-bold sm:px-3 whitespace-nowrap focus-visible:outline-4 focus-visible:outline-gold ${
              active ? "border-gold text-white" : "border-transparent text-white/85 hover:text-white"
            }`}
          >
            <Icon aria-hidden className="hidden size-5 sm:block" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
