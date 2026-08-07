import Image from "next/image";
import { APP_VERSION } from "@/lib/version";
import { InfiniteSlider } from "@/components/core/infinite-slider";

// Placeholders — sustituir por los logos reales de los colaboradores
// cuando se confirmen.
const collaborators = [
  "Colaborador 01",
  "Colaborador 02",
  "Colaborador 03",
  "Colaborador 04",
  "Colaborador 05",
  "Colaborador 06",
];

function CollaboratorBadge({ label }: { label: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] px-6 font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)] opacity-70 grayscale transition-opacity hover:opacity-100 hover:grayscale-0">
      {label}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--paper-sunken)] py-10">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
          Colaboradores
        </p>
      </div>

      <InfiniteSlider gap={16} speed={28} speedOnHover={8} className="mb-10">
        {collaborators.map((label) => (
          <CollaboratorBadge key={label} label={label} />
        ))}
      </InfiniteSlider>

      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/logo-wordmark-light.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            className="icon-light h-8 w-auto"
          />
          <Image
            src="/logo-wordmark-dark.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            className="icon-dark h-8 w-auto"
          />
          <p className="text-sm text-[var(--text-faint)]">Liencres, Cantabria</p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-[var(--text-faint)] opacity-60">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
