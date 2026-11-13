import { Footprints, ArrowUpRight, MapPinned } from "lucide-react";

// Recorrido de ENTRENAMIENTO (distinto del oficial que se dibuja en el mapa): para que la gente vaya a probar la zona antes de la carrera.
const TRAINING_URL = "https://www.wikiloc.com/trail-running-trails/desafio-picota-2027-entrenamiento-292388705?h=3p7yarw26p";

export function TrainingRouteLink() {
  return (
    <a
      href={TRAINING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative mx-auto mt-14 flex max-w-2xl items-center gap-4 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-5 shadow-[var(--shadow)] transition-colors hover:border-[var(--pine)] sm:gap-5 sm:px-6"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--pine)] text-[var(--pine-ink)] transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
        <Footprints size={26} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sea)]">Entrena la carrera</span>
        <span className="mt-0.5 block text-[17px] font-semibold leading-snug text-[var(--ink)]">Recorrido de entrenamiento</span>
        <span className="mt-1 block text-sm leading-relaxed text-[var(--text-dim)]">
          Un trazado para ir a conocer la zona antes del día D.
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-2 rounded-full bg-[var(--pine)] px-4 py-2 text-sm font-semibold text-[var(--pine-ink)] shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:bg-[var(--accent-rose)] sm:inline-flex">
        <MapPinned size={16} aria-hidden="true" />
        Ver en Wikiloc
        <ArrowUpRight size={15} aria-hidden="true" />
      </span>
      <span className="absolute right-3 top-3 text-[var(--pine)] sm:hidden" aria-hidden="true">
        <ArrowUpRight size={18} />
      </span>
      <span className="sr-only">(se abre en Wikiloc, en una pestaña nueva)</span>
    </a>
  );
}
