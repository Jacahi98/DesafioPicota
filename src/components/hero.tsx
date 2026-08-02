"use client";

import { motion } from "framer-motion";

// Líneas de nivel que sugieren las dunas de Liencres vistas desde arriba —
// no es decoración genérica, es el propio terreno de la carrera.
function DuneContours() {
  const lines = [
    "M-40,120 C120,60 260,180 440,90 C580,20 720,140 880,70",
    "M-40,200 C100,150 260,260 440,180 C600,110 740,220 880,160",
    "M-40,280 C90,240 250,330 440,270 C610,210 750,300 880,250",
    "M-40,360 C110,330 260,400 440,350 C600,300 760,380 880,340",
  ];
  return (
    <svg
      viewBox="0 0 880 420"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {lines.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--sand-gold)"
          strokeWidth="1"
          opacity={0.16 + i * 0.03}
        />
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--paper)]"
    >
      <DuneContours />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-28 sm:px-8 lg:flex-row lg:items-end lg:gap-16 lg:pb-28 lg:pt-36">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]"
          >
            Liencres · Parque Natural de las Dunas
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-[13vw] italic leading-[0.95] text-[var(--ink)] sm:text-6xl lg:text-7xl"
          >
            Desafío
            <br />
            <span className="text-[var(--pine)]">Picota</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-7 max-w-lg text-[17px] leading-relaxed text-[var(--text-dim)]"
          >
            Un trail que cambia de terreno tres veces: arena suelta en las dunas, sombra
            de pinar y roca de acantilado hasta el mirador de La Picota, con la ría de
            Mogro abriéndose debajo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <span className="inline-flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-4 py-2.5 text-sm font-medium text-[var(--text-dim)]">
              Inscripciones · próximamente
            </span>
            <a
              href="#recorrido"
              className="text-sm font-semibold text-[var(--pine)] underline decoration-[var(--sand-gold)] decoration-2 underline-offset-4"
            >
              Ver el recorrido ↓
            </a>
          </motion.div>
        </div>

        <dl className="grid grid-cols-3 gap-x-8 gap-y-3 border-t border-[var(--border)] pt-6 font-mono text-[var(--ink)] lg:min-w-[280px] lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Distancia</dt>
            <dd className="text-2xl">14 km</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Desnivel+</dt>
            <dd className="text-2xl">310 m</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Cota máx.</dt>
            <dd className="text-2xl">240 m</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
