import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionsMenu } from "@/components/sections-menu";
import { Logo } from "@/components/core/logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href="/#top" className="flex min-w-0 shrink-0 items-center">
          <Logo className="h-9 sm:h-11" />
        </Link>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <SectionsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
