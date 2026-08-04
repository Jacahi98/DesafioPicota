import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_VERSION } from "@/lib/version";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/logo-badge.png"
            alt=""
            aria-hidden="true"
            width={480}
            height={480}
            priority
            className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"
          />
          <span className="truncate whitespace-nowrap font-display text-base italic leading-none text-[var(--ink)] sm:text-xl">
            Desafío Picota
          </span>
          <span className="hidden shrink-0 whitespace-nowrap font-mono text-[10px] text-[var(--text-faint)] sm:inline">
            v{APP_VERSION}
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <a
            href="#inscripcion"
            className="whitespace-nowrap text-sm font-semibold text-[var(--pine)] transition-colors hover:text-[var(--sand-gold)]"
          >
            Inscripción
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
