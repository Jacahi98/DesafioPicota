"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Eye, X } from "lucide-react";
import { routeStats } from "@/data/route-track";

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
        <motion.path
          key={i}
          d={d}
          fill="none"
          style={{ stroke: "var(--sand-gold)" }}
          strokeWidth="1"
          opacity={0.16 + i * 0.03}
          animate={{ x: i % 2 === 0 ? [0, 18, 0] : [0, -18, 0] }}
          transition={{ duration: 16 + i * 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
        />
      ))}
    </svg>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // El hero se desvanece y se encoge levemente al salir de vista, y el
  // fondo de dunas se mueve a otro ritmo (parallax) — la salida de escena
  // se siente dirigida, no un simple corte.
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const duneY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--paper)]"
    >
      <motion.div style={{ y: duneY }} className="absolute inset-0">
        <DuneContours />
      </motion.div>

      <motion.div
        style={{ opacity: contentOpacity, scale: contentScale, y: contentY }}
        className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-14 sm:px-8 sm:pt-16 lg:flex-row lg:items-end lg:gap-16 lg:pb-28 lg:pt-20"
      >
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]"
          >
            Liencres · Parque Natural de las Dunas
          </motion.p>

          <div className="relative flex items-start gap-3">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              onMouseEnter={() => setPhotoOpen(true)}
              onMouseLeave={() => setPhotoOpen(false)}
              className="font-display text-[13vw] italic leading-[0.95] text-[var(--ink)] sm:text-6xl lg:text-7xl"
            >
              Desafío
              <br />
              <span className="text-[var(--pine)]">Picota</span>
            </motion.h1>

            {/* En escritorio el hover sobre las letras del título ya revela
                la foto; en móvil/tablet no hay hover real, así que el ojo
                hace lo mismo con un tap — dos vías al mismo contenido. */}
            <button
              type="button"
              onClick={() => setPhotoOpen((o) => !o)}
              aria-expanded={photoOpen}
              aria-label="Ver foto de La Picota"
              className="mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-dim)] transition-colors hover:border-[var(--pine)] hover:text-[var(--pine)] lg:hidden"
            >
              <Eye size={16} />
            </button>
          </div>

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
            <span
              id="inscripcion"
              className="inline-flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-4 py-2.5 text-sm font-medium text-[var(--text-dim)]"
            >
              Inscripciones · próximamente
            </span>
            <a
              href="#recorrido"
              className="text-sm font-semibold text-[var(--pine)] transition-colors hover:text-[var(--sand-gold)]"
            >
              Ver el recorrido ↓
            </a>
          </motion.div>
        </div>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-6 font-mono text-[var(--ink)] sm:gap-x-8 lg:min-w-[280px] lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Distancia</dt>
            <dd className="whitespace-nowrap text-lg sm:text-2xl">
              {(routeStats.distanceM / 1000).toFixed(1)} km
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Desnivel+</dt>
            <dd className="whitespace-nowrap text-lg sm:text-2xl">{routeStats.gainM} m</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Cota máx.</dt>
            <dd className="whitespace-nowrap text-lg sm:text-2xl">{routeStats.maxEle} m</dd>
          </div>
        </dl>
      </motion.div>

      {/* position: fixed, no en flujo — con height:auto empujaba el resto
          del hero hacia abajo, así que en cualquier ventana normal la foto
          aparecía por debajo del pliegue y el hover no se veía sin hacer
          scroll (justo lo que se reportó). Como overlay siempre queda a la
          vista, sea cual sea el scroll o el alto de la ventana. */}
      <AnimatePresence>
        {photoOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none fixed inset-0 z-30 bg-black/50"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              className="pointer-events-none fixed inset-x-[10%] top-1/2 z-30 -translate-y-1/2"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/foto-picota.jpg"
                  alt="Vista desde La Picota hacia la ría de Mogro"
                  className="h-[45vh] w-full object-cover shadow-[var(--shadow)] sm:h-[55vh]"
                />
                {/* Solo la X es interactiva (pointer-events-auto): el resto
                    del overlay se queda pointer-events-none para que, en
                    escritorio, mover el ratón hacia la foto no cuente como
                    salir del título y la cierre sola antes de tiempo. */}
                <button
                  type="button"
                  onClick={() => setPhotoOpen(false)}
                  aria-label="Cerrar foto"
                  className="pointer-events-auto absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
