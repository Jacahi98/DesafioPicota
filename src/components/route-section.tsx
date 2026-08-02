"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RouteMap } from "@/components/route-map";
import { ElevationProfile } from "@/components/elevation-profile";
import { routeStats } from "@/data/route-track";

const waypoints = [
  {
    place: "Playa de Somocuevas",
    terrain: "Arena",
    text: "Salida a pie de playa. Los primeros metros se corren sobre arena compacta, con la marea marcando el ritmo.",
  },
  {
    place: "Dunas de Liencres",
    terrain: "Arena suelta",
    text: "El parque natural más antiguo protegido de Cantabria. Aquí la arena deja de ser firme: cada zancada cuesta un poco más.",
  },
  {
    place: "El Pinar",
    terrain: "Bosque",
    text: "Pino marítimo y sombra durante casi tres kilómetros. El terreno se endurece y el camino empieza a subir en serio.",
  },
  {
    place: "La Picota",
    terrain: "Roca y viento",
    text: "240 metros sobre el mar, entre los restos de una torre defensiva y de un búnker de la Guerra Civil. La ría de Mogro se abre en herradura justo debajo.",
  },
  {
    place: "Tolio",
    terrain: "Acantilado",
    text: "El tramo más expuesto: sendero de acantilado de vuelta hacia Liencres, con el Cantábrico a un lado todo el descenso.",
  },
];

export function RouteSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="recorrido" className="bg-[var(--paper)] px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]">
          El recorrido
        </p>
        <h2 className="font-display text-4xl italic text-[var(--ink)] sm:text-5xl">
          Cinco paradas, tres terrenos
        </h2>
        <p className="mt-3 max-w-lg text-[15px] text-[var(--text-faint)]">
          Trazado real de referencia, con bucle costero entre Somocuevas, las dunas y La
          Picota.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mt-10 flex flex-col gap-6"
        >
          <dl className="grid grid-cols-3 gap-4 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 font-mono">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                Distancia
              </dt>
              <dd className="text-xl text-[var(--ink)]">
                {(routeStats.distanceM / 1000).toFixed(1)} km
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                Desnivel+
              </dt>
              <dd className="text-xl text-[var(--ink)]">{routeStats.gainM} m</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                Cota máx.
              </dt>
              <dd className="text-xl text-[var(--ink)]">{routeStats.maxEle} m</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="mx-auto w-full max-w-md rounded-sm border border-[var(--border)] p-3 lg:mx-0 lg:max-w-none lg:w-[340px] lg:shrink-0">
              <RouteMap hoveredIndex={hoveredIndex} />
            </div>

            <div className="min-w-0 flex-1 rounded-sm border border-[var(--border)] p-3">
              <ElevationProfile hoveredIndex={hoveredIndex} onHoverIndex={setHoveredIndex} />
            </div>
          </div>
        </motion.div>

        <div className="relative mx-auto mt-20 max-w-2xl pl-8">
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border)]"
            aria-hidden="true"
          />
          <ol className="flex flex-col gap-12">
            {waypoints.map((wp, i) => (
              <motion.li
                key={wp.place}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="relative"
              >
                <span
                  className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--pine)] bg-[var(--paper)]"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-2xl text-[var(--ink)]">{wp.place}</h3>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--sand-gold)]">
                    {wp.terrain}
                  </span>
                </div>
                <p className="mt-2 max-w-lg text-[15.5px] leading-relaxed text-[var(--text-dim)]">
                  {wp.text}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
