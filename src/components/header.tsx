import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionsMenu } from "@/components/sections-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        {/* Wordmark con texto integrado (sustituye al emblema circular +
            texto aparte que había antes): dos PNG recortados a su
            contenido real, uno por tema, intercambiados con las mismas
            clases icon-light/icon-dark que ya usa el theme-toggle — sin
            CSS nuevo. */}
        <a href="#top" className="flex min-w-0 shrink-0 items-center">
          <Image
            src="/logo-wordmark-light.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            priority
            className="icon-light h-9 w-auto sm:h-11"
          />
          <Image
            src="/logo-wordmark-dark.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            priority
            className="icon-dark h-9 w-auto sm:h-11"
          />
        </a>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <SectionsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
