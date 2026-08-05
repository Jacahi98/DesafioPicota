"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { routeTrack, routeStats } from "@/data/route-track";

// El trazado en sí ocupa esta caja "ajustada" (ROUTE_VW x ROUTE_VH, con PAD
// de margen) — es el sistema de coordenadas de siempre. Pero la imagen de
// satélite real (route-satellite-wide.jpg) cubre un área geográfica bastante
// mayor alrededor de esta caja (MARGIN_X/MARGIN_Y de margen extra), así que
// hay imagen real que revelar cuando la ventana de cámara del plano general
// necesita una proporción distinta a la de esta caja ajustada — si solo
// existiera imagen para ROUTE_VW x ROUTE_VH, una tarjeta muy ancha y baja (o
// muy alta y estrecha) obligaría a recortar el propio trazado para no dejar
// franjas, en vez de recortar solo paisaje de sobra alrededor.
const ROUTE_VW = 420;
const ROUTE_VH = 512;
const PAD = 34;
const MARGIN_X = 380;
const MARGIN_Y = 164;
const VW = ROUTE_VW + 2 * MARGIN_X;
const VH = ROUTE_VH + 2 * MARGIN_Y;

// La imagen de satélite (como cualquier tile de mapa web) está en proyección
// Web Mercator, no en lat/lng planas — a esta latitud (~43.45°N) tratar
// lat/lng como si fueran unidades lineales desplaza los puntos más alejados
// del centro varias decenas de metros respecto a su posición real en la
// imagen (se notaba sobre todo en la caja ampliada: el trazado se metía en
// el mar cerca del principio). Proyectar a Mercator antes de encajar en la
// caja evita ese desfase.
const MERC_R = 6378137;
function mercX(lng: number) {
  return MERC_R * (lng * Math.PI) / 180;
}
function mercY(lat: number) {
  const rad = (lat * Math.PI) / 180;
  return MERC_R * Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

const mercXs = routeTrack.map((p) => mercX(p[0]));
const mercYs = routeTrack.map((p) => mercY(p[1]));
const mercXMin = Math.min(...mercXs);
const mercXMax = Math.max(...mercXs);
const mercYMin = Math.min(...mercYs);
const mercYMax = Math.max(...mercYs);

// Math.log/Math.tan no están garantizados bit a bit idénticos entre motores
// JS (a diferencia de +,-,*,/, que sí lo están) — sin este redondeo, el
// SSR (Node) y el cliente (navegador) podían calcular un strokeDashoffset
// que difería en el último dígito y React marcaba un error de hidratación.
function round(v: number) {
  return Math.round(v * 1000) / 1000;
}

function project(lng: number, lat: number) {
  const mx = mercX(lng);
  const my = mercY(lat);
  const x = MARGIN_X + PAD + ((mx - mercXMin) / (mercXMax - mercXMin)) * (ROUTE_VW - 2 * PAD);
  const y = MARGIN_Y + PAD + (1 - (my - mercYMin) / (mercYMax - mercYMin)) * (ROUTE_VH - 2 * PAD);
  return [round(x), round(y)] as const;
}

const points = routeTrack.map(([lng, lat]) => project(lng, lat));
const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Longitud acumulada del trazado EN PÍXELES (suma de segmentos proyectados)
// — solo para dibujar el stroke-dasharray/dashoffset a mano (el pathLength
// de Framer Motion emite dasharray en px, lo que rompe la normalización).
// Esto NO es la distancia real recorrida: es una aproximación geométrica de
// la proyección en pantalla, así que no sirve como parámetro de avance.
const cumulativeLengths: number[] = [0];
for (let i = 1; i < points.length; i++) {
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  cumulativeLengths.push(cumulativeLengths[i - 1] + Math.hypot(x1 - x0, y1 - y0));
}
const pathTotalLength = cumulativeLengths[cumulativeLengths.length - 1];

// Fracción de DISTANCIA REAL recorrida (dato GPS, routeTrack[i][3] en
// metros) en cada punto — el parámetro de avance de verdad. drawProgress
// representa esto, no una fracción de longitud en píxeles de ESTE mapa en
// concreto: si cada componente (mapa, perfil de elevación) tradujera
// drawProgress a su propia longitud visual directamente, cada uno
// avanzaría a un ritmo distinto (curvas, subidas) aunque compartan el
// mismo drawProgress — justo el desfase que se veía entre el mapa y el
// perfil al hacer hover. Todo se ancla a esta fracción real en su lugar.
const distFractions = routeTrack.map((p) => p[3] / routeStats.distanceM);

const summitIndex = routeTrack.reduce(
  (best, p, i) => (p[2] > routeTrack[best][2] ? i : best),
  0
);
const [summitX, summitY] = points[summitIndex];
const [startX, startY] = points[0];
// Fracción de distancia real (0–1) en la que la cima cae — el rótulo
// aparece justo cuando drawProgress la alcanza, no con un umbral fijo.
const summitFraction = distFractions[summitIndex];

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// Dado drawProgress (fracción de distancia real 0–1), encuentra el tramo
// del trazado GPS en el que cae y la fracción dentro de ese tramo — a
// partir de aquí se interpola tanto el punto en píxeles (para la cámara)
// como la longitud en píxeles ya recorrida (para el dashoffset), así los
// dos usan exactamente el mismo punto real del recorrido.
function bracketAtFraction(frac: number) {
  const v = clamp(frac, 0, 1);
  let i = 1;
  while (i < distFractions.length - 1 && distFractions[i] < v) i++;
  const segStart = distFractions[i - 1];
  const segEnd = distFractions[i];
  const segFrac = segEnd > segStart ? (v - segStart) / (segEnd - segStart) : 0;
  return { i, segFrac };
}

// Punto interpolado del trazado en una fracción de distancia real 0–1 dada
// (no solo el punto discreto más cercano) — para que la cámara se mueva
// con fluidez en vez de saltar de punto en punto del GPX.
function pointAtFraction(frac: number): readonly [number, number] {
  const { i, segFrac } = bracketAtFraction(frac);
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  return [x0 + (x1 - x0) * segFrac, y0 + (y1 - y0) * segFrac];
}

// Longitud en píxeles del trazado ya "recorrida" en esa misma fracción de
// distancia real — es lo que hay que restar de pathTotalLength para el
// dashoffset, en vez de pathTotalLength*(1-v) directo (que asumiría que la
// longitud en píxeles avanza al mismo ritmo que la distancia real, cosa
// que no pasa en absoluto en el perfil de elevación, y no exactamente
// tampoco aquí, aunque el error sea menor).
function pixelLengthAtFraction(frac: number): number {
  const { i, segFrac } = bracketAtFraction(frac);
  const segStart = cumulativeLengths[i - 1];
  const segEnd = cumulativeLengths[i];
  return segStart + (segEnd - segStart) * segFrac;
}

// Alto de la ventana de cámara en modo seguimiento (unidades del viewBox);
// el ancho sale de multiplicarlo por la proporción real de la tarjeta,
// medida en vivo, y se recorta si no cabe en VW/VH — así la cámara siempre
// encaja exacto en la tarjeta, sea cual sea su forma, sin franjas vacías.
const TRACK_H = 280;
const ROUTE_CENTER_X = MARGIN_X + ROUTE_VW / 2;
const ROUTE_CENTER_Y = MARGIN_Y + ROUTE_VH / 2;
// Tramos (fracción del dibujo) en los que la cámara entra y sale del
// seguimiento: antes de ZOOM_IN_END se ve el plano general (más alejado,
// "establishing shot"); después de ZOOM_OUT_START vuelve a alejarse para
// revelar el recorrido ya trazado. Entre medias sigue el punto que se
// dibuja de cerca.
const ZOOM_IN_END = 0.08;
const ZOOM_OUT_START = 0.92;

function smoothstep(t: number) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

// 0 = plano general (todo el trazado), 1 = cámara siguiendo de cerca.
function zoomLevel(frac: number) {
  if (frac <= ZOOM_IN_END) return smoothstep(frac / ZOOM_IN_END);
  if (frac >= ZOOM_OUT_START) return smoothstep((1 - frac) / (1 - ZOOM_OUT_START));
  return 1;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type CameraRect = { x: number; y: number; w: number; h: number };

// Cuánto se acerca la cámara a su objetivo cada 1/60s (0–1): más alto,
// sigue más pegado; más bajo, más suave/rezagado. El trazado es una costa
// con curvas, así que el punto objetivo sube y baja bastante — sin
// suavizado, un scroll rápido y seguido hace que la cámara salte de un
// lado a otro y maree.
const CAMERA_EASE = 0.12;

export function RouteMap({
  hoveredIndex,
  drawProgress,
}: {
  hoveredIndex: number | null;
  drawProgress: MotionValue<number>;
}) {
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  const summitOpacity = useTransform(drawProgress, [summitFraction, summitFraction + 0.01], [0, 1]);
  const dashOffset = useTransform(drawProgress, (v) => pathTotalLength - pixelLengthAtFraction(v));

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [aspect, setAspect] = useState(VW / VH);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cámara que empieza en plano general (todo el trazado), se acerca a
  // seguir de cerca el punto que se está dibujando en cuanto arranca el
  // scroll, y se aleja otra vez al terminar para revelar el recorrido
  // completo ya trazado. La ventana de seguimiento adopta en vivo la
  // proporción real de la tarjeta (sin franjas vacías ni recortar
  // geografía); el plano general es el viewBox 0 0 VW VH de siempre.
  //
  // El objetivo (dónde "debería" estar la cámara) se recalcula al vuelo con
  // cada cambio de drawProgress, pero la cámara no salta directa a él: un
  // bucle de rAF la va acercando poco a poco (CAMERA_EASE), así un scroll
  // rápido por una costa con curvas no marea con la cámara subiendo y
  // bajando de golpe en cada punto. Todo por atributo directo del SVG (no
  // estado de React) para no re-renderizar en cada frame.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const computeTarget = (frac: number): CameraRect => {
      const [cx, cy] = pointAtFraction(frac);
      const zl = zoomLevel(frac);

      // Plano general: la ventana más pequeña que, con la proporción real de
      // la tarjeta, contiene la caja ajustada del trazado entera (ROUTE_VW x
      // ROUTE_VH) — así se ve el recorrido completo siempre, usando el
      // margen de imagen real (MARGIN_X/MARGIN_Y) para crecer hacia donde
      // haga falta según la proporción, en vez de recortar el trazado.
      const overviewW = Math.min(VW, Math.max(ROUTE_VW, ROUTE_VH * aspect));
      const overviewH = Math.min(VH, Math.max(ROUTE_VH, ROUTE_VW / aspect));

      // Seguimiento: ventana ajustada a la proporción de la tarjeta, tan
      // cerca como TRACK_H permite sin exceder el lienzo.
      let trackW = TRACK_H * aspect;
      let trackH = TRACK_H;
      if (trackW > VW) {
        trackW = VW;
        trackH = trackW / aspect;
      }
      if (trackH > VH) {
        trackH = VH;
        trackW = trackH * aspect;
      }

      const w = lerp(overviewW, trackW, zl);
      const h = lerp(overviewH, trackH, zl);
      const centerX = lerp(ROUTE_CENTER_X, cx, zl);
      const centerY = lerp(ROUTE_CENTER_Y, cy, zl);

      return {
        x: clamp(centerX - w / 2, 0, VW - w),
        y: clamp(centerY - h / 2, 0, VH - h),
        w,
        h,
      };
    };

    const applyViewBox = (r: CameraRect) => {
      svg.setAttribute("viewBox", `${r.x.toFixed(1)} ${r.y.toFixed(1)} ${r.w.toFixed(1)} ${r.h.toFixed(1)}`);
    };

    let target = computeTarget(drawProgress.get());
    let current: CameraRect = { ...target };
    applyViewBox(current);
    // Ojo: este primer target usa drawProgress.get() en el momento en que
    // este efecto arranca — como los efectos de los hijos (este) corren
    // ANTES que los del padre (RouteSection, que es quien de verdad fija
    // drawProgress al montar según el scroll real), ese primer valor casi
    // siempre es el 0 inicial, no el real. En cuanto RouteSection lo
    // corrige, llega aquí como evento "change" — pero si esa corrección se
    // aplicara con el suavizado normal (que solo avanza por rAF), dependería
    // de que rAF llegue a disparar para verse: nada que hacer mientras
    // tanto. Por eso la PRIMERA corrección real que llega se aplica directa
    // (sin suavizar), no solo por rendimiento sino porque si no puede
    // quedarse pegada al plano general inicial indefinidamente.
    let hasSyncedOnce = false;

    let rafId: number | null = null;
    let lastTime = 0;

    const tick = (time: number) => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1 / 60;
      lastTime = time;
      // Suavizado independiente del framerate: a más dt transcurrido, más
      // se acerca al objetivo en ese paso (si no, en pantallas a 120Hz
      // seguiría el doble de despacio que a 60Hz).
      const t = 1 - Math.pow(1 - CAMERA_EASE, dt * 60);
      current = {
        x: lerp(current.x, target.x, t),
        y: lerp(current.y, target.y, t),
        w: lerp(current.w, target.w, t),
        h: lerp(current.h, target.h, t),
      };
      applyViewBox(current);

      const settled =
        Math.abs(current.x - target.x) < 0.25 &&
        Math.abs(current.y - target.y) < 0.25 &&
        Math.abs(current.w - target.w) < 0.25 &&
        Math.abs(current.h - target.h) < 0.25;
      if (settled) {
        current = { ...target };
        applyViewBox(current);
        rafId = null;
        lastTime = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onProgress = (frac: number) => {
      target = computeTarget(frac);
      if (!hasSyncedOnce) {
        hasSyncedOnce = true;
        current = { ...target };
        applyViewBox(current);
        return;
      }
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    const unsubscribe = drawProgress.on("change", onProgress);
    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawProgress, aspect]);

  return (
    <div ref={wrapRef} className="route-map-svg-wrap relative overflow-hidden rounded-sm border border-[var(--border)] p-3">
      <svg
        ref={svgRef}
        viewBox={`${MARGIN_X} ${MARGIN_Y} ${ROUTE_VW} ${ROUTE_VH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa por satélite del recorrido: bucle costero entre Somocuevas, las dunas de Liencres, el pinar y La Picota"
      >
        <image
          href="/route-satellite-wide.jpg"
          x="0"
          y="0"
          width={VW}
          height={VH}
          preserveAspectRatio="xMidYMid slice"
        />
        <rect x="0" y="0" width={VW} height={VH} fill="#0a1108" opacity="0.12" />

        {/* Casing oscuro para que el trazado se lea sobre cualquier tono de la foto */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(10, 14, 8, 0.55)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <motion.path
          d={pathD}
          fill="none"
          style={{
            stroke: "var(--sand-gold)",
            strokeDasharray: pathTotalLength,
            strokeDashoffset: dashOffset,
          }}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Salida / meta: visible desde el principio, es el origen del trazado */}
        <g>
          <circle cx={startX} cy={startY} r="5.5" fill="#fff" stroke="#0a1108" strokeWidth="2" />
          <text
            x={startX + 11}
            y={startY - 8}
            className="font-mono"
            fontSize="11"
            fill="#fff"
            stroke="#0a1108"
            strokeWidth="3"
            paintOrder="stroke"
          >
            Salida / meta
          </text>
        </g>

        {/* Cima de La Picota: aparece justo cuando la línea llega a este punto */}
        <motion.g style={{ opacity: summitOpacity }}>
          <circle
            cx={summitX}
            cy={summitY}
            r="5"
            style={{ fill: "var(--sand-gold)" }}
            stroke="#0a1108"
            strokeWidth="1.5"
          />
          <text
            x={summitX + 11}
            y={summitY + 4}
            className="font-mono"
            fontSize="11"
            fill="#fff"
            stroke="#0a1108"
            strokeWidth="3"
            paintOrder="stroke"
          >
            La Picota · 232 m
          </text>
        </motion.g>

        {hovered && (
          <g>
            <circle cx={hovered[0]} cy={hovered[1]} r="9" style={{ fill: "var(--sand-gold)" }} opacity="0.35" />
            <circle cx={hovered[0]} cy={hovered[1]} r="5" fill="#fff" stroke="#0a1108" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* Norte: fuera del SVG, fijo en la esquina de la tarjeta — dentro del
          SVG se movería con la cámara en vez de quedarse quieto en pantalla. */}
      <div
        className="pointer-events-none absolute right-2 top-2 flex flex-col items-center gap-0.5 font-mono text-[10px] text-white"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
        aria-hidden="true"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
          <line x1="6" y1="16" x2="6" y2="2" stroke="white" strokeWidth="1.4" />
          <path d="M6,0 L2.5,7 L6,4.5 L9.5,7 Z" fill="white" />
        </svg>
        N
      </div>
    </div>
  );
}
