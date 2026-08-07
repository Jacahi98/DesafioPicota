"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronsLeftRight } from "lucide-react";
import { RouteMap } from "@/components/route-map";
import { ElevationProfile } from "@/components/elevation-profile";
import {
  ComparisonSlider,
  ComparisonPanel,
  ComparisonHandle,
  type ComparisonSliderHandle,
} from "@/components/core/comparison-slider";
import { SlidingNumber } from "@/components/core/sliding-number";
import { routeTrack, routeStats, andarinesTrack, andarinesStats, waypoints } from "@/data/route-track";
import { buildTrackProgress, gainAtFraction } from "@/lib/track-progress";

// Progresión de distancia/desnivel+ de cada modalidad, derivada una sola
// vez de sus trazados (estáticos) — no depende de nada que cambie en
// tiempo de ejecución, así que vive fuera del componente.
const trekkingProgress = buildTrackProgress(routeTrack, routeStats.distanceM, routeStats.gainM);
const andarinesProgress = buildTrackProgress(andarinesTrack, andarinesStats.distanceM, andarinesStats.gainM);

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

// Sigue drawProgress (motion value, cambia en cada frame de scroll sin
// re-renderizar el resto del árbol) y solo convierte a estado de React el
// número YA REDONDEADO que hace falta pintar — así el re-render solo
// ocurre cuando el dígito visible cambia de verdad, no en cada frame. El
// componente que llama a este hook se remonta con key={activeModality} (ver
// LiveDistance/LiveGain más abajo), así que un cambio de modalidad siempre
// arranca desde un valor inicial fresco sin lógica extra de "reset" aquí.
function useLiveValue(drawProgress: MotionValue<number>, compute: (p: number) => number) {
  const [value, setValue] = useState(() => compute(drawProgress.get()));
  useEffect(() => {
    return drawProgress.on("change", (p) => setValue(compute(p)));
  }, [drawProgress, compute]);
  return value;
}

// Distancia recorrida hasta el punto que se ve dibujado ahora mismo, junto
// al total fijo de la modalidad — remontado por key={activeModality} desde
// RouteSection para arrancar siempre en el valor correcto al cambiar de
// modalidad, sin esperar al próximo evento de scroll.
function LiveDistance({
  drawProgress,
  stats,
}: {
  drawProgress: MotionValue<number>;
  stats: { distanceM: number };
}) {
  const km = useLiveValue(
    drawProgress,
    useCallback((p: number) => round1((p * stats.distanceM) / 1000), [stats.distanceM]),
  );
  const totalKm = round1(stats.distanceM / 1000);
  // El total (p.ej. 12.8) marca cuántos dígitos enteros puede llegar a
  // tener "x" — reservarlos desde el principio evita el salto de 9.9 a
  // 10.0 (ver minIntegerDigits en SlidingNumber).
  const minIntegerDigits = Math.trunc(totalKm).toString().length;
  return (
    <>
      <SlidingNumber value={km} decimalPlaces={1} decimalSeparator="." minIntegerDigits={minIntegerDigits} />
      <span className="text-[var(--text-faint)]">/</span>
      <SlidingNumber value={totalKm} decimalPlaces={1} decimalSeparator="." minIntegerDigits={minIntegerDigits} />
      <span>km</span>
    </>
  );
}

// Desnivel+ acumulado hasta el punto dibujado ahora mismo — no es
// proporcional a drawProgress (solo sube en los tramos que ascienden), así
// que usa el bracket real del trazado (gainAtFraction), no una regla de
// tres. Mismo remontado por key={activeModality} que LiveDistance.
function LiveGain({
  drawProgress,
  stats,
  progress,
}: {
  drawProgress: MotionValue<number>;
  stats: { gainM: number };
  progress: ReturnType<typeof buildTrackProgress>;
}) {
  const gainSoFarM = useLiveValue(
    drawProgress,
    useCallback((p: number) => Math.round(gainAtFraction(progress, p)), [progress]),
  );
  // Mismo razonamiento que en LiveDistance: reserva desde el principio los
  // dígitos que hagan falta para el total (9→10 y 99→100 incluidos).
  const minIntegerDigits = Math.trunc(stats.gainM).toString().length;
  return (
    <>
      <SlidingNumber value={gainSoFarM} minIntegerDigits={minIntegerDigits} />
      <span className="text-[var(--text-faint)]">/</span>
      <SlidingNumber value={stats.gainM} minIntegerDigits={minIntegerDigits} />
      <span>m</span>
    </>
  );
}

type TrackPoint = readonly [number, number, number, number];
type TrackStats = { distanceM: number; minEle: number; maxEle: number };

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

// El mapa+perfil de UNA modalidad (Trekking o Andarines) — se instancia dos
// veces, una por cada lado del comparador de arrastre. Cada instancia lleva
// su propio estado de "ampliar mapa/perfil" y su propio índice de hover: no
// pueden compartirse entre modalidades porque un mismo índice apunta a
// puntos distintos en cada trazado.
function RouteStage({
  isMobile,
  track,
  stats,
  waypoints,
  summitLabel,
  ariaLabel,
  drawProgress,
  hoveredIndex,
  onHoverIndex,
}: {
  isMobile: boolean;
  track: TrackPoint[];
  stats: TrackStats;
  waypoints?: { place: string; terrain: string; text: string }[];
  summitLabel?: string;
  ariaLabel: string;
  drawProgress: MotionValue<number>;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}) {
  const [expanded, setExpanded] = useState<"map" | "profile" | null>(null);
  // El 25%/75% "puro" más el gap de 1.25rem entre columnas suma más del
  // 100% del contenedor (framer-motion fija esto como width inline, así
  // que una regla CSS con calc() no sirve de nada aquí — pierde siempre
  // frente al estilo inline). Restar la mitad del gap a cada lado dentro
  // del propio calc() de framer-motion es lo único que de verdad cambia el
  // ancho renderizado.
  const mapWidth = expanded === "profile" ? "0%" : expanded === "map" ? "100%" : "calc(25% - 0.625rem)";
  const profileWidth = expanded === "map" ? "0%" : expanded === "profile" ? "100%" : "calc(75% - 0.625rem)";

  return isMobile ? (
    <div className="route-stage-mobile">
      <RouteMap
        track={track}
        maxEle={stats.maxEle}
        hoveredIndex={hoveredIndex}
        drawProgress={drawProgress}
        waypoints={waypoints}
        summitLabel={summitLabel}
        ariaLabel={ariaLabel}
      />
      <div className="route-stage-mobile-profile">
        <ElevationProfile
          track={track}
          stats={stats}
          hoveredIndex={hoveredIndex}
          onHoverIndex={onHoverIndex}
          drawProgress={drawProgress}
          summitLabel={summitLabel}
        />
      </div>
    </div>
  ) : (
    <div className="route-columns">
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
        <RouteMap
          track={track}
          maxEle={stats.maxEle}
          hoveredIndex={hoveredIndex}
          drawProgress={drawProgress}
          waypoints={waypoints}
          summitLabel={summitLabel}
          ariaLabel={ariaLabel}
        />
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
          track={track}
          stats={stats}
          hoveredIndex={hoveredIndex}
          onHoverIndex={onHoverIndex}
          drawProgress={drawProgress}
          summitLabel={summitLabel}
        />
      </motion.div>
    </div>
  );
}

// Valor de una stat (distancia/desnivel/cota) con transición al cambiar de
// modalidad: sale el número anterior, entra el nuevo — en vez de un
// remplazo instantáneo, que con el imán del slider (siempre 0 o 100) pasa
// a ocurrir en cada gesto, no solo alguna vez.
function AnimatedStat({ value, statKey }: { value: string; statKey: string }) {
  return (
    <dd className="relative whitespace-nowrap text-sm text-[var(--ink)] sm:text-xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={statKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </dd>
  );
}

// Botones para elegir explícitamente Trekking o Andarines: deslizan el
// slider al extremo correspondiente (con animación, vía el spring del
// propio ComparisonSlider) en vez de saltar de golpe.
function ModalityToggle({
  activeModality,
  onSelect,
}: {
  activeModality: "trekking" | "andarines";
  onSelect: (modality: "trekking" | "andarines") => void;
}) {
  return (
    <div className="mb-3 inline-flex overflow-hidden rounded-sm border border-[var(--border)] font-mono text-[11px] uppercase tracking-wider">
      {(["trekking", "andarines"] as const).map((modality) => (
        <button
          key={modality}
          type="button"
          onClick={() => onSelect(modality)}
          aria-pressed={activeModality === modality}
          className={`px-3 py-1.5 transition-colors ${
            activeModality === modality
              ? "bg-[var(--pine)] text-[var(--pine-ink)]"
              : "bg-[var(--paper-raised)] text-[var(--text-dim)] hover:text-[var(--ink)]"
          }`}
        >
          {modality === "trekking" ? "Trekking" : "Andarines"}
        </button>
      ))}
    </div>
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
  // Un índice de hover por modalidad: el mismo número apunta a puntos
  // distintos en el trazado de Trekking y en el de Andarines, así que no
  // pueden compartir estado.
  const [hoveredTrekking, setHoveredTrekking] = useState<number | null>(null);
  const [hoveredAndarines, setHoveredAndarines] = useState<number | null>(null);

  // ComparisonPanel position="left" (Trekking) se ve en el lado DERECHO del
  // recorte y position="right" (Andarines) en el IZQUIERDO — así que pasado
  // el 50% hay más Andarines visible que Trekking, no al revés. Las stats
  // (distancia/desnivel/cota) siguen a quien ocupe más sitio en pantalla.
  const [activeModality, setActiveModality] = useState<"trekking" | "andarines">("trekking");
  const activeStats = activeModality === "trekking" ? routeStats : andarinesStats;
  const sliderRef = useRef<ComparisonSliderHandle>(null);

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

  // Al cambiar de modalidad (imán del slider al soltar, o botón Trekking/
  // Andarines) el scroll vuelve al principio del carril de dibujo, para que
  // la modalidad recién elegida se vea dibujarse desde el inicio en vez de
  // aparecer ya a medio dibujar en el punto de scroll donde estaba el
  // usuario. getBoundingClientRect().top - HEADER_OFFSET es el desplazamiento
  // que falta para llegar exactamente al scroll donde drawProgress = 0,
  // funcione desde cualquier posición de scroll actual.
  const scrollToRouteStart = () => {
    const wrapper = pinWrapperRef.current;
    if (!wrapper) return;
    const top = wrapper.getBoundingClientRect().top;
    window.scrollTo({ top: window.scrollY + (top - HEADER_OFFSET), behavior: "smooth" });
  };

  const lastCommittedModality = useRef<"trekking" | "andarines">("trekking");
  const handleModalityCommit = (side: 0 | 100) => {
    const modality = side === 100 ? "andarines" : "trekking";
    setActiveModality(modality);
    if (lastCommittedModality.current !== modality) {
      lastCommittedModality.current = modality;
      scrollToRouteStart();
    }
  };

  // Progresión (distancia/desnivel+ ya recorridos) del trazado activo —
  // LiveDistance/LiveGain la consumen remontadas por key={activeModality}.
  const activeProgress = activeModality === "trekking" ? trekkingProgress : andarinesProgress;

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

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
                className="mt-4 sm:mt-10"
              >
                <ModalityToggle
                  activeModality={activeModality}
                  onSelect={(modality) => sliderRef.current?.goTo(modality === "andarines" ? 100 : 0)}
                />
                <dl className="grid grid-cols-[1.3fr_1.05fr_0.75fr] gap-2 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3 py-3 font-mono sm:grid-cols-3 sm:gap-4 sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                      Distancia
                    </dt>
                    <dd className="flex flex-nowrap items-baseline gap-x-1 whitespace-nowrap text-sm text-[var(--ink)] sm:text-xl">
                      <LiveDistance key={activeModality} drawProgress={drawProgress} stats={activeStats} />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                      Desnivel+
                    </dt>
                    <dd className="flex flex-nowrap items-baseline gap-x-1 whitespace-nowrap text-sm text-[var(--ink)] sm:text-xl">
                      <LiveGain
                        key={activeModality}
                        drawProgress={drawProgress}
                        stats={activeStats}
                        progress={activeProgress}
                      />
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">
                      Cota máx.
                    </dt>
                    <AnimatedStat statKey={activeModality} value={`${activeStats.maxEle} m`} />
                  </div>
                </dl>
              </motion.div>
            </div>

            {/* Arrastra el tirador para comparar Trekking (referencia, cinco
                paradas) con Andarines (bucle corto, mismos dos altos). Las
                dos modalidades comparten drawProgress: avanzan juntas con
                el mismo scroll, cada una a su propio ritmo real. key
                distinto en cada rama de isMobile: sin él, React reutiliza
                los mismos nodos al cambiar de layout y los estilos inline
                que Framer Motion escribe (width del 25%/75% de escritorio)
                se quedan pegados en la rama móvil, que solo anima height —
                el perfil acababa midiendo 768px dentro de una tarjeta de
                437px. */}
            {/* ComparisonPanel position="left" (Trekking) se ve en el lado
                DERECHO del recorte, y position="right" (Andarines) en el
                IZQUIERDO — así funciona el clip-path del propio componente
                (motion-primitives), no un error de posición: solo importa
                para las stats/paneles, ya no hay etiquetas de texto aquí
                (sustituidas por ModalityToggle encima de las stats). */}
            <ComparisonSlider
              ref={sliderRef}
              className="route-stage-compare"
              defaultPosition={50}
              onPositionChange={(pct) => setActiveModality(pct > 50 ? "andarines" : "trekking")}
              onCommit={handleModalityCommit}
            >
              <ComparisonPanel position="left">
                <RouteStage
                  key={isMobile ? "trekking-mobile" : "trekking-columns"}
                  isMobile={isMobile}
                  track={routeTrack}
                  stats={routeStats}
                  waypoints={waypoints}
                  ariaLabel="Mapa por satélite de la modalidad Trekking: bucle costero entre Somocuevas, las dunas de Liencres, el pinar y La Picota"
                  drawProgress={drawProgress}
                  hoveredIndex={hoveredTrekking}
                  onHoverIndex={setHoveredTrekking}
                />
              </ComparisonPanel>
              <ComparisonPanel position="right">
                <RouteStage
                  key={isMobile ? "andarines-mobile" : "andarines-columns"}
                  isMobile={isMobile}
                  track={andarinesTrack}
                  stats={andarinesStats}
                  ariaLabel="Mapa por satélite de la modalidad Andarines: bucle corto entre Monte Tolío y La Picota"
                  drawProgress={drawProgress}
                  hoveredIndex={hoveredAndarines}
                  onHoverIndex={setHoveredAndarines}
                />
              </ComparisonPanel>
              <ComparisonHandle className="group flex w-[3px] items-center justify-center bg-[var(--sand-gold)] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]">
                <div className="flex h-8 w-8 shrink-0 scale-100 items-center justify-center rounded-full border-2 border-[var(--sand-gold)] bg-[var(--paper)] text-[var(--pine)] shadow-[var(--shadow)] transition-transform duration-200 ease-out group-hover:scale-125 group-active:scale-150">
                  <ChevronsLeftRight size={16} className="shrink-0" />
                </div>
              </ComparisonHandle>
            </ComparisonSlider>
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
