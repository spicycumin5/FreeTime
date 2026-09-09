"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function ActivityNav({
  activityId,
  showMovies,
}: {
  activityId: string;
  showMovies: boolean;
}) {
  const pathname = usePathname();
  const base = `/activities/${activityId}`;

  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/availability`, label: "Your availability" },
    { href: `${base}/results`, label: "Results" },
    ...(showMovies ? [{ href: `${base}/movies`, label: "Movies" }] : []),
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Activity sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
