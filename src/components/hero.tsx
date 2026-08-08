"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Eye, X } from "lucide-react";
import { routeStats } from "@/data/route-track";
import { Logo } from "@/components/core/logo";

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

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative overflow-hidden border-b border-[var(--border)]"
    >
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
            {/* El h1 se mantiene como h1 aunque ahora sea una imagen: el
                nombre sigue llegando a Google y a los lectores de pantalla
                por el aria-label del Logo (accessible name computation lo
                sube al propio h1, que no tiene texto propio). */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              onMouseEnter={() => setPhotoOpen(true)}
              onMouseLeave={() => setPhotoOpen(false)}
              className="w-[68vw] max-w-[300px] sm:w-[340px] sm:max-w-none lg:w-[420px]"
            >
              <Logo size="lg" label="Desafío Picota · Trail Run" className="w-full" />
            </motion.h1>

            {/* En escritorio el hover sobre las letras del título ya revela
                la foto; en móvil/tablet no hay hover real, así que el ojo
                hace lo mismo con un tap — dos vías al mismo contenido. */}
            <button
              type="button"
              onClick={() => setPhotoOpen((o) => !o)}
              aria-expanded={photoOpen}
              aria-label="Ver foto de Monte Picota"
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
            Un trail costero por Cantabria, entre acantilados y pinares, hasta el mirador
            de Monte Picota, con la ría de Mogro abriéndose debajo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <a
              id="inscripcion"
              href="/inscripcion"
              className="inline-flex items-center gap-2 rounded-sm border border-[var(--pine)] bg-[var(--pine)] px-4 py-2.5 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90"
            >
              Inscríbete · 24 abril 2027
            </a>
            <a
              href="#recorrido"
              className="text-sm font-semibold text-[var(--pine)] transition-colors hover:text-[var(--accent-rose)]"
            >
              Ver el recorrido ↓
            </a>
          </motion.div>
        </div>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-6 font-mono text-[var(--ink)] sm:gap-x-8 lg:min-w-[280px] lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--sea)]">Distancia</dt>
            <dd className="whitespace-nowrap text-lg sm:text-2xl">
              {(routeStats.distanceM / 1000).toFixed(1)} km
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--sea)]">Desnivel+</dt>
            <dd className="whitespace-nowrap text-lg sm:text-2xl">{routeStats.gainM} m</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-[var(--sea)]">Cota máx.</dt>
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
                  alt="Vista desde Monte Picota hacia la ría de Mogro"
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
