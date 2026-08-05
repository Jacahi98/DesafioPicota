"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
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
    text: "232 metros sobre el mar, entre los restos de una torre defensiva y de un búnker de la Guerra Civil. La ría de Mogro se abre en herradura justo debajo.",
  },
  {
    place: "Tolio",
    terrain: "Acantilado",
    text: "El tramo más expuesto: sendero de acantilado de vuelta hacia Liencres, con el Cantábrico a un lado todo el descenso.",
  },
];

// Cuánto scroll (px) hace falta para dibujar el mapa y el perfil una vez
// fijos en pantalla.
const PIN_SCROLL_PX = 900;
// Alto del header fijo (top-16) = top de la caja sticky única (título+stats
// +mapa/perfil, ver .route-pin-sticky en globals.css). Mantener en sync con
// el "96px" de ahí (HEADER_OFFSET + el margen inferior de esa caja).
const HEADER_OFFSET = 64;

function ExpandToggle({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={expanded}
      aria-label={expanded ? `Volver a la vista dividida` : `Ampliar ${label}`}
      title={expanded ? "Volver a la vista dividida" : `Ampliar ${label}`}
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--paper)]/90 text-[var(--text-dim)] backdrop-blur-sm transition-colors hover:text-[var(--ink)]"
    >
      {expanded ? (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path
            d="M8 5L11.5 1.5M11.5 1.5H8.5M11.5 1.5V4.5M5 8L1.5 11.5M1.5 11.5H4.5M1.5 11.5V8.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path
            d="M8.5 1.5H11.5M11.5 1.5V4.5M11.5 1.5L7.5 5.5M4.5 11.5H1.5M1.5 11.5V8.5M1.5 11.5L5.5 7.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function WaypointItem({
  wp,
  index,
  lineProgress,
}: {
  wp: (typeof waypoints)[number];
  index: number;
  lineProgress: MotionValue<number>;
}) {
  const threshold = index / (waypoints.length - 1);
  const dotFillOpacity = useTransform(lineProgress, [Math.max(0, threshold - 0.06), threshold], [0, 1]);

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="relative"
    >
      <span
        className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--pine)] bg-[var(--paper)]"
        aria-hidden="true"
      />
      <motion.span
        style={{ opacity: dotFillOpacity }}
        className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full bg-[var(--pine)]"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl text-[var(--ink)]">{wp.place}</h3>
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--sand-gold)]">
          {wp.terrain}
        </span>
      </div>
      <p className="mt-2 max-w-lg text-[15.5px] leading-relaxed text-[var(--text-dim)]">{wp.text}</p>
    </motion.li>
  );
}

export function RouteSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<"map" | "profile" | null>(null);
  const mapWidth = expanded === "profile" ? "0%" : expanded === "map" ? "100%" : "25%";
  const profileWidth = expanded === "map" ? "0%" : expanded === "profile" ? "100%" : "75%";

  // Móvil estrecho apila mapa y perfil como dos tarjetas separadas a todo
  // el ancho, en vez del lado a lado 1/4-3/4 de tablet/desktop (a 1/4 de
  // ancho el mapa se quedaba enano e ilegible). Se probó primero con el
  // perfil superpuesto sobre el mapa, pero tapaba la etiqueta de la cima
  // (cae en el tercio inferior del mapa) y forzar la tarjeta a la
  // proporción del mapa para no dejar franjas dentro desperdiciaba ancho
  // fuera de ella — dos problemas de raíz del propio patrón de superponer,
  // no arreglables con parches. Apiladas sin solape, cada una a todo el
  // ancho, evita los dos. Es un layout distinto (no solo un reparto de
  // ancho), así que se decide en JS.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: timelineScroll } = useScroll({
    target: timelineRef,
    offset: ["start 0.7", "end 0.6"],
  });
  const lineProgress = useSpring(timelineScroll, { stiffness: 200, damping: 40, mass: 0.4 });

  // Mapa y perfil se fijan en pantalla juntos, siempre lado a lado, y
  // avanzan con un único progreso compartido. El título+stats y el
  // mapa/perfil viven en UNA sola caja sticky (.route-pin-sticky, top:
  // HEADER_OFFSET) en vez de dos cajas sticky independientes: con dos, cada
  // una se libera del scroll en un instante distinto (alturas distintas),
  // así que la que se libera antes queda flotando encima de la otra
  // mientras sigue fija — bug real, visto haciendo scroll de verdad. Con
  // una sola caja no puede pasar: se fijan y se liberan siempre juntas. El
  // alto del mapa/perfil (flex:1 dentro de esa caja, ver globals.css) sale
  // solo del espacio que sobra tras el título+stats, sin JS.
  const pinWrapperRef = useRef<HTMLDivElement>(null);

  const drawProgress = useMotionValue(0);

  useEffect(() => {
    // getBoundingClientRect() fuerza layout: si se llama directo en cada
    // evento de scroll (que puede disparar varias veces por frame en un
    // scroll rápido), puede provocar jank/fotogramas en blanco visibles.
    // Con rAF, como mucho una lectura de layout por frame pintado.
    let rafId: number | null = null;
    const measure = () => {
      rafId = null;
      const wrapper = pinWrapperRef.current;
      if (!wrapper) return;
      const top = wrapper.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (HEADER_OFFSET - top) / PIN_SCROLL_PX));
      drawProgress.set(p);
    };
    const onScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawProgress]);

  return (
    <section id="recorrido" className="bg-[var(--paper)] px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Título+stats y mapa/perfil viven en el mismo wrapper con scroll
            "carril" (el spacer de PIN_SCROLL_PX) y son sticky los dos, cada
            uno con su propio top: así el título+stats no desaparece
            mientras el mapa/perfil se fija y dibuja debajo. El mapa/perfil
            se fija con un margen por defecto respecto al borde inferior de
            la ventana (no pegado del todo abajo), salvo que haga falta más
            hueco arriba para no tapar la info. drawProgress se computa a
            mano (HEADER_OFFSET fijo), sin useScroll, para que el dibujo
            arranque justo al fijarse y termine justo cuando el scroll libera
            el bloque — el punto de liberación solo depende de dónde termina
            el spacer, así que no cambia por compartir caja con la info. */}
        <div ref={pinWrapperRef} className="relative">
          <div className="route-pin-sticky sticky" style={{ top: HEADER_OFFSET }}>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]">
                El recorrido
              </p>
              <h2 className="font-display text-4xl italic text-[var(--ink)] sm:text-5xl">
                Cinco paradas, tres terrenos
              </h2>
              <p className="mt-3 hidden max-w-lg text-[15px] text-[var(--text-faint)] sm:block">
                Trazado real de referencia, con bucle costero entre Somocuevas, las dunas y La
                Picota.
              </p>

              <motion.dl
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
                className="mt-4 grid grid-cols-3 gap-3 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-4 py-3 font-mono sm:mt-10 sm:gap-4 sm:px-5 sm:py-4"
              >
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
              </motion.dl>
            </div>

            {/* key distinto en cada rama: sin él React reutiliza los mismos
                nodos al cambiar de layout y los estilos inline que Framer
                Motion escribe (width del 25%/75% de escritorio) se quedan
                pegados en la rama móvil, que solo anima height — el perfil
                acababa midiendo 768px dentro de una tarjeta de 437px. */}
            {isMobile ? (
              <div key="stage-mobile" className="route-stage-mobile">
                <RouteMap hoveredIndex={hoveredIndex} drawProgress={drawProgress} />
                <div className="route-stage-mobile-profile">
                  <ElevationProfile
                    hoveredIndex={hoveredIndex}
                    onHoverIndex={setHoveredIndex}
                    drawProgress={drawProgress}
                  />
                </div>
              </div>
            ) : (
              <div key="stage-columns" className="route-columns">
                <motion.div
                  className="route-map-col relative overflow-hidden"
                  animate={{ width: mapWidth, opacity: expanded === "profile" ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ExpandToggle
                    expanded={expanded === "map"}
                    label="el mapa"
                    onClick={() => setExpanded((e) => (e === "map" ? null : "map"))}
                  />
                  <RouteMap hoveredIndex={hoveredIndex} drawProgress={drawProgress} />
                </motion.div>

                <motion.div
                  className="route-profile-col relative overflow-hidden"
                  animate={{ width: profileWidth, opacity: expanded === "map" ? 0 : 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ExpandToggle
                    expanded={expanded === "profile"}
                    label="el perfil"
                    onClick={() => setExpanded((e) => (e === "profile" ? null : "profile"))}
                  />
                  <ElevationProfile
                    hoveredIndex={hoveredIndex}
                    onHoverIndex={setHoveredIndex}
                    drawProgress={drawProgress}
                  />
                </motion.div>
              </div>
            )}
          </div>
          <div style={{ height: PIN_SCROLL_PX }} aria-hidden="true" />
        </div>

        <div ref={timelineRef} className="relative mx-auto mt-20 max-w-2xl pl-8">
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border)]"
            aria-hidden="true"
          />
          <motion.div
            style={{ scaleY: lineProgress }}
            className="absolute left-[7px] top-2 bottom-2 w-px origin-top bg-[var(--pine)]"
            aria-hidden="true"
          />
          <ol className="flex flex-col gap-12">
            {waypoints.map((wp, i) => (
              <WaypointItem key={wp.place} wp={wp} index={i} lineProgress={lineProgress} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
