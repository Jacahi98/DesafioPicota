"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { routeTrack } from "@/data/route-track";

const VW = 420;
const VH = 512;
const PAD = 34;

const lngs = routeTrack.map((p) => p[0]);
const lats = routeTrack.map((p) => p[1]);
const lngMin = Math.min(...lngs);
const lngMax = Math.max(...lngs);
const latMin = Math.min(...lats);
const latMax = Math.max(...lats);

function project(lng: number, lat: number) {
  const x = PAD + ((lng - lngMin) / (lngMax - lngMin)) * (VW - 2 * PAD);
  const y = PAD + (1 - (lat - latMin) / (latMax - latMin)) * (VH - 2 * PAD);
  return [x, y] as const;
}

const points = routeTrack.map(([lng, lat]) => project(lng, lat));
const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Longitud acumulada del trazado (suma de segmentos) para animar
// stroke-dasharray/dashoffset a mano — el pathLength de Framer Motion emite
// dasharray en px, lo que rompe la normalización de longitud del propio SVG.
// Guardamos también el acumulado punto a punto para saber en qué fracción
// del dibujo cae cada punto de interés (p. ej. la cima).
const cumulativeLengths: number[] = [0];
for (let i = 1; i < points.length; i++) {
  const [x0, y0] = points[i - 1];
  const [x1, y1] = points[i];
  cumulativeLengths.push(cumulativeLengths[i - 1] + Math.hypot(x1 - x0, y1 - y0));
}
const pathTotalLength = cumulativeLengths[cumulativeLengths.length - 1];

const summitIndex = routeTrack.reduce(
  (best, p, i) => (p[2] > routeTrack[best][2] ? i : best),
  0
);
const [summitX, summitY] = points[summitIndex];
const [startX, startY] = points[0];
// Fracción del trazado (0–1) en la que la línea dibujada llega a la cima —
// el rótulo aparece justo en ese instante, no con un umbral fijo.
const summitFraction = cumulativeLengths[summitIndex] / pathTotalLength;

export function RouteMap({
  hoveredIndex,
  drawProgress,
}: {
  hoveredIndex: number | null;
  drawProgress: MotionValue<number>;
}) {
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  const summitOpacity = useTransform(drawProgress, [summitFraction, summitFraction + 0.01], [0, 1]);
  const dashOffset = useTransform(drawProgress, (v) => pathTotalLength * (1 - v));

  return (
    <div className="route-map-svg-wrap overflow-hidden rounded-sm border border-[var(--border)] p-3">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa por satélite del recorrido: bucle costero entre Somocuevas, las dunas de Liencres, el pinar y La Picota"
      >
        <image
          href="/route-satellite.jpg"
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

        {/* Norte */}
        <g transform={`translate(${VW - PAD - 6}, ${PAD + 2})`}>
          <line x1="0" y1="16" x2="0" y2="0" stroke="#fff" strokeWidth="1.4" />
          <path d="M0,0 L-3.5,7 L0,4.5 L3.5,7 Z" fill="#fff" />
          <text x="0" y="30" textAnchor="middle" className="font-mono" fontSize="10" fill="#fff">
            N
          </text>
        </g>
      </svg>
    </div>
  );
}
