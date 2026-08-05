"use client";

import type { PointerEvent } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { routeTrack, routeStats } from "@/data/route-track";

const VW = 800;
// Más alto que un perfil de desnivel "clásico" a propósito: al no ser
// geografía real (es un gráfico estilizado), ganar relieve vertical aquí no
// distorsiona nada y se lee mejor, sobre todo junto al mapa en escritorio.
const VH = 320;
const PAD_TOP = 44;
const PAD_BOTTOM = 36;
const PLOT_H = VH - PAD_TOP - PAD_BOTTOM;

const eleMin = routeStats.minEle;
const eleMax = routeStats.maxEle;

function x(distM: number) {
  return (distM / routeStats.distanceM) * VW;
}
function y(ele: number) {
  return PAD_TOP + (1 - (ele - eleMin) / (eleMax - eleMin)) * PLOT_H;
}

const linePoints = routeTrack.map(([, , ele, dist]) => [x(dist), y(ele)] as const);
const lineD = linePoints
  .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`)
  .join(" ");
const areaD = `${lineD} L${VW},${VH - PAD_BOTTOM} L0,${VH - PAD_BOTTOM} Z`;

// Longitud acumulada de la curva para animar stroke-dasharray/dashoffset a
// mano (ver nota equivalente en route-map.tsx), guardando también el
// acumulado punto a punto para saber en qué fracción del dibujo cae la cima.
const cumulativeLengths: number[] = [0];
for (let i = 1; i < linePoints.length; i++) {
  const [x0, y0] = linePoints[i - 1];
  const [x1, y1] = linePoints[i];
  cumulativeLengths.push(cumulativeLengths[i - 1] + Math.hypot(x1 - x0, y1 - y0));
}
const lineTotalLength = cumulativeLengths[cumulativeLengths.length - 1];

const summitIndex = routeTrack.reduce(
  (best, p, i) => (p[2] > routeTrack[best][2] ? i : best),
  0
);
const [summitX, summitY] = linePoints[summitIndex];
const summitFraction = cumulativeLengths[summitIndex] / lineTotalLength;

type Props = {
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  drawProgress: MotionValue<number>;
};

export function ElevationProfile({ hoveredIndex, onHoverIndex, drawProgress }: Props) {
  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VW;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < linePoints.length; i++) {
      const d = Math.abs(linePoints[i][0] - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    }
    onHoverIndex(nearest);
  };

  const hovered = hoveredIndex !== null ? linePoints[hoveredIndex] : null;
  const hoveredTrack = hoveredIndex !== null ? routeTrack[hoveredIndex] : null;

  const areaOpacity = useTransform(drawProgress, [0, 0.3], [0, 1]);
  const summitOpacity = useTransform(drawProgress, [summitFraction, summitFraction + 0.01], [0, 1]);
  const dashOffset = useTransform(drawProgress, (v) => lineTotalLength * (1 - v));

  return (
    <div
      className="route-profile-svg-wrap overflow-hidden rounded-sm border border-[var(--border)] p-3"
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-full w-full cursor-crosshair touch-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Perfil de desnivel: de ${eleMin} a ${eleMax} metros a lo largo de ${(routeStats.distanceM / 1000).toFixed(1)} km. Pasa el cursor para ver el punto en el mapa.`}
        onPointerMove={handleMove}
        onPointerLeave={() => onHoverIndex(null)}
      >
        <defs>
          <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--sand-gold)" }} stopOpacity="0.35" />
            <stop offset="100%" style={{ stopColor: "var(--sand-gold)" }} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[eleMin, Math.round((eleMin + eleMax) / 2), eleMax].map((v) => (
          <g key={v}>
            <line x1="0" x2={VW} y1={y(v)} y2={y(v)} style={{ stroke: "var(--border)" }} strokeWidth="0.75" />
            <text x="4" y={y(v) - 4} className="font-mono" fontSize="11" style={{ fill: "var(--text-faint)" }}>
              {v} m
            </text>
          </g>
        ))}

        <motion.path d={areaD} fill="url(#elevation-fill)" style={{ opacity: areaOpacity }} />
        <motion.path
          d={lineD}
          fill="none"
          style={{
            stroke: "var(--pine)",
            strokeDasharray: lineTotalLength,
            strokeDashoffset: dashOffset,
          }}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <motion.g style={{ opacity: summitOpacity }}>
          <circle cx={summitX} cy={summitY} r="4" style={{ fill: "var(--sand-gold)" }} />
          <text
            x={summitX}
            y={summitY - 10}
            textAnchor="middle"
            className="font-mono"
            fontSize="11"
            style={{ fill: "var(--text-dim)" }}
          >
            La Picota
          </text>
        </motion.g>

        {hovered && hoveredTrack && (
          <g>
            <line
              x1={hovered[0]}
              x2={hovered[0]}
              y1={PAD_TOP}
              y2={VH - PAD_BOTTOM}
              style={{ stroke: "var(--text-dim)" }}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={hovered[0]}
              cy={hovered[1]}
              r="5"
              style={{ fill: "var(--sand-gold)", stroke: "var(--paper)" }}
              strokeWidth="2"
            />
            <g transform={`translate(${Math.min(Math.max(hovered[0], 60), VW - 60)}, ${PAD_TOP - 12})`}>
              <rect x="-58" y="-20" width="116" height="22" rx="3" style={{ fill: "var(--ink)" }} opacity="0.9" />
              <text
                x="0"
                y="-5"
                textAnchor="middle"
                className="font-mono"
                fontSize="11"
                style={{ fill: "var(--paper)" }}
              >
                {Math.round(hoveredTrack[2])} m · {(hoveredTrack[3] / 1000).toFixed(1)} km
              </text>
            </g>
          </g>
        )}

        <text x="0" y={VH - 8} className="font-mono" fontSize="11" style={{ fill: "var(--text-faint)" }}>
          0 km
        </text>
        <text
          x={VW}
          y={VH - 8}
          textAnchor="end"
          className="font-mono"
          fontSize="11"
          style={{ fill: "var(--text-faint)" }}
        >
          {(routeStats.distanceM / 1000).toFixed(1)} km
        </text>
      </svg>
    </div>
  );
}
