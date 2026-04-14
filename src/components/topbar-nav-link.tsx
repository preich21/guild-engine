"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type TopbarNavLinkProps = {
  href: string;
  label: string;
};

const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

export function TopbarNavLink({ href, label }: TopbarNavLinkProps) {
  const pathname = usePathname();
  const isActive = normalizePath(pathname) === normalizePath(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

