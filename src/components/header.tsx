import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span className="relative block h-8 w-[4.7rem] sm:h-9 sm:w-[5.3rem]">
            <Image
              src="/icon-mark.svg"
              alt=""
              aria-hidden="true"
              fill
              priority
              className="icon-light object-contain object-left"
            />
            <Image
              src="/icon-mark-dark.svg"
              alt=""
              aria-hidden="true"
              fill
              priority
              className="icon-dark object-contain object-left"
            />
          </span>
          <span className="font-display text-lg italic leading-none text-[var(--ink)] sm:text-xl">
            Desafío Picota
          </span>
        </a>

        <div className="flex items-center gap-5">
          <a
            href="#recorrido"
            className="text-sm font-semibold text-[var(--pine)] underline decoration-[var(--sand-gold)] decoration-2 underline-offset-4"
          >
            El recorrido
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
