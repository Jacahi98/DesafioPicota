import { APP_VERSION } from "@/lib/version";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--paper-sunken)] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display italic text-[var(--ink)]">Desafío Picota</p>
          <p className="text-sm text-[var(--text-faint)]">Liencres, Cantabria</p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-[var(--text-faint)] opacity-60">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
