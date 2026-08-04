"use client";

import { motion } from "framer-motion";
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

const summitIndex = routeTrack.reduce(
  (best, p, i) => (p[2] > routeTrack[best][2] ? i : best),
  0
);
const [summitX, summitY] = points[summitIndex];
const [startX, startY] = points[0];

export function RouteMap({ hoveredIndex }: { hoveredIndex: number | null }) {
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="relative overflow-hidden rounded-sm">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
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
          style={{ stroke: "var(--sand-gold)" }}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />

        {/* Salida / meta */}
        <circle cx={startX} cy={startY} r="5.5" fill="#fff" stroke="#0a1108" strokeWidth="2" />

        {/* Cima de La Picota */}
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
