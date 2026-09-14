"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { routeStats } from "@/data/route-track";
import { Logo } from "@/components/core/logo";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
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
        className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 pb-20 pt-14 text-center sm:px-8 sm:pt-16 lg:pb-28 lg:pt-20"
      >
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]"
          >
            Liencres · Parque Natural de las Dunas
          </motion.p>

          <div className="flex justify-center">
            {/* El h1 se mantiene como h1 aunque ahora sea una imagen: el
                nombre sigue llegando a Google y a los lectores de pantalla
                por el aria-label del Logo (accessible name computation lo
                sube al propio h1, que no tiene texto propio). */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="w-[68vw] max-w-[300px] sm:w-[340px] sm:max-w-none lg:w-[420px]"
            >
              <Logo size="lg" label="Desafío Picota · Trail Run" className="w-full" />
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-7 max-w-lg text-justify text-[17px] leading-relaxed text-[var(--text-dim)]"
          >
            Un trail costero por Cantabria, entre acantilados y pinares, hasta el mirador
            de Monte Picota, con la ría de Mogro abriéndose debajo.
          </motion.p>
        </div>

        {/* CTA y estadísticas van juntos como grupo: apilados y centrados en
            móvil/tablet, uno al lado del otro (separados por el borde
            izquierdo del dl) en escritorio — nunca cada uno centrado por su
            cuenta en su propia fila ancha. */}
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-4"
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

          <dl className="grid grid-cols-3 gap-x-8 gap-y-3 border-t border-[var(--border)] pt-6 font-mono text-[var(--ink)] sm:gap-x-12 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
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
        </div>
      </motion.div>
    </section>
  );
}
