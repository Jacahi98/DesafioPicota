"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/countdown";

type Props = {
  phase: "before" | "open";
  opensAt: number;
  closesAt: number;
  opensLabel: string;
  closesLabel: string;
  testMode?: boolean;
};

function compact(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d} d ${h} h ${m} min ${s % 60} s`;
}

// Reloj de la página de preinscripción. Reutiliza la cuenta atrás de la
// portada. Antes de la apertura cuenta hasta que abre; con el formulario
// abierto cuenta hasta el cierre y deja a la vista la hora de cierre. Cuando el
// reloj grande sale de pantalla (se está rellenando el formulario) aparece una
// línea fija debajo de la cabecera con el mismo dato, sin repetirlo mientras
// el reloj grande se ve.
export function RegistrationClock({ phase, opensAt, closesAt, opensLabel, closesLabel, testMode }: Props) {
  const router = useRouter();
  const open = phase === "open";
  const target = open ? closesAt : opensAt;
  const label = open ? closesLabel : opensLabel;

  const [now, setNow] = useState<number | null>(null);
  const [bigVisible, setBigVisible] = useState(true);
  const bigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = bigRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setBigVisible(entry.isIntersecting), {
      rootMargin: "-70px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const left = now === null ? null : target - now;
  const finished = left !== null && left <= 0 && !testMode;

  // Al llegar a cero se vuelve a pedir la página: abre el formulario o lo cierra.
  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [finished, router]);

  return (
    <>
      <div ref={bigRef} className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4">
        {testMode && (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-rose)]">
            Modo prueba: la preinscripción aún no está abierta al público
          </p>
        )}
        <Countdown
          target={target}
          label={open ? "Cierra en" : "Abre en"}
          doneText={open ? "Plazo terminado" : "¡Ya está abierta!"}
        />
        <p className="mt-3 font-mono text-xs text-[var(--text-dim)]">
          {label} <span className="text-[var(--text-faint)]">(hora de España)</span>
        </p>
      </div>

      {!bigVisible && left !== null && !finished && (
        <div
          role="timer"
          aria-live="off"
          className="fixed inset-x-0 top-[61px] z-30 border-b border-[var(--border)] bg-[var(--paper-raised)] px-4 py-1.5 text-center font-mono text-[11px] leading-snug text-[var(--ink)] shadow-sm sm:top-[69px] sm:text-xs"
        >
          <span className="text-[var(--text-dim)]">{open ? "Cierra en " : "Abre en "}</span>
          <span className="font-semibold tabular-nums">{compact(left)}</span>
          <span className="text-[var(--text-dim)]"> · {label}</span>
        </div>
      )}
    </>
  );
}
