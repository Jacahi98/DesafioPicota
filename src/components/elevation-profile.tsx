"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

type TrackPoint = readonly [number, number, number, number];

// Más alto que un perfil de desnivel "clásico" a propósito: al no ser
// geografía real (es un gráfico estilizado), ganar relieve vertical aquí no
// distorsiona nada y se lee mejor, sobre todo junto al mapa en escritorio.
const VH = 320;
const PAD_TOP = 44;
const PAD_BOTTOM = 36;
// Hueco a la izquierda para las etiquetas del eje Y ("232 m", etc.): el
// trazado empieza aquí, no en x=0, así nunca se monta encima del texto.
const PAD_LEFT = 36;
const PLOT_H = VH - PAD_TOP - PAD_BOTTOM;
// Ancho "por defecto" antes de medir la tarjeta real (SSR/primer pintado).
const DEFAULT_VW = 800;
// Nunca más estrecho que esto, aunque la tarjeta salga rarísima de ancha.
const MIN_VW = 500;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

type Props = {
  track: TrackPoint[];
  stats: { distanceM: number; minEle: number; maxEle: number };
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  drawProgress: MotionValue<number>;
  // La cima de ambos recorridos (trekking y andarines) es la misma —
  // Monte Picota — así que el valor por defecto sirve para los dos, pero se
  // deja como prop por si algún día hay un trazado que no la toque.
  summitLabel?: string;
};

export function ElevationProfile({
  track,
  stats,
  hoveredIndex,
  onHoverIndex,
  drawProgress,
  summitLabel = "Monte Picota",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { distanceM, minEle: eleMin, maxEle: eleMax } = stats;

  function y(ele: number) {
    return PAD_TOP + (1 - (ele - eleMin) / (eleMax - eleMin)) * PLOT_H;
  }

  // El gráfico no es geografía real, así que puede estirar su eje X para
  // llenar la tarjeta sin más: no hay riesgo de "distorsionar" nada, porque
  // no hay una proporción "correcta" que respetar (solo estaba fija en
  // 800×320 antes). Medida en vivo, así siempre encaja exacto en cualquier
  // tarjeta, sin la franja vacía a los lados que dejaba antes un ancho fijo.
  // Sin tope máximo: un tope metía preserveAspectRatio="meet" en juego (el
  // viewBox dejaba de coincidir con la caja real), y eso desincronizaba el
  // hover del ratón con el punto marcado — usaba el ancho de la caja
  // entera para convertir a coordenadas del viewBox, pero el contenido
  // visible era más estrecho por el letterbox. Sin tope, viewBox y caja
  // siempre coinciden exactos, así que esa conversión es siempre correcta.
  const [vw, setVw] = useState(DEFAULT_VW);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setVw(Math.max(MIN_VW, (width / height) * VH));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const summitIndex = useMemo(
    () => track.reduce((best, p, i) => (p[2] > track[best][2] ? i : best), 0),
    [track]
  );

  const {
    linePoints,
    lineD,
    areaD,
    cumulativeLengths,
    lineTotalLength,
    summitPoint,
    distFractions,
    summitFraction,
  } = useMemo(() => {
    const x = (distM: number) => PAD_LEFT + (distM / distanceM) * (vw - PAD_LEFT);
    const pts = track.map(([, , ele, dist]) => [x(dist), y(ele)] as const);
    const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${vw},${VH - PAD_BOTTOM} L${PAD_LEFT},${VH - PAD_BOTTOM} Z`;

    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      cum.push(cum[i - 1] + Math.hypot(x1 - x0, y1 - y0));
    }

    const fracs = track.map((p) => p[3] / distanceM);

    return {
      linePoints: pts,
      lineD: line,
      areaD: area,
      cumulativeLengths: cum,
      lineTotalLength: cum[cum.length - 1],
      summitPoint: pts[summitIndex],
      distFractions: fracs,
      summitFraction: fracs[summitIndex],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, track, distanceM, summitIndex, eleMin, eleMax]);

  // Dado drawProgress (fracción de distancia real 0–1), encuentra el tramo
  // GPS en el que cae y la fracción dentro de ese tramo.
  function bracketAtFraction(frac: number) {
    const v = clamp(frac, 0, 1);
    let i = 1;
    while (i < distFractions.length - 1 && distFractions[i] < v) i++;
    const segStart = distFractions[i - 1];
    const segEnd = distFractions[i];
    const segFrac = segEnd > segStart ? (v - segStart) / (segEnd - segStart) : 0;
    return { i, segFrac };
  }

  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * vw;
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
  const hoveredTrack = hoveredIndex !== null ? track[hoveredIndex] : null;
  const [summitX, summitY] = summitPoint;

  const areaOpacity = useTransform(drawProgress, [0, 0.3], [0, 1]);

  // summitFraction y lineTotalLength dependen de vw (se recalculan al medir
  // la tarjeta). Se probó con useTransform (de una fuente, luego de varias
  // fuentes envolviendo estos valores en motion values) y las dos veces se
  // veía el mismo desfase real entre el % de avance del mapa y el perfil —
  // no una cuestión de "no se refresca cuando cambia el cierre", sino algo
  // más fino en cómo esta versión de Framer resuelve useTransform con
  // dependencias que cambian fuera de un evento de scroll. Aplicar el
  // atributo a mano con un efecto (mismo patrón ya probado en la cámara del
  // mapa, route-map.tsx) evita depender de ese mecanismo: se recalcula
  // directo con los valores vigentes cada vez que cambia drawProgress O
  // estos, sin intermediarios.
  const linePathRef = useRef<SVGPathElement>(null);
  const summitRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const linePath = linePathRef.current;
    const summit = summitRef.current;
    if (!linePath || !summit) return;
    const update = (v: number) => {
      const { i, segFrac } = bracketAtFraction(v);
      const segStart = cumulativeLengths[i - 1];
      const segEnd = cumulativeLengths[i];
      const pixelLength = segStart + (segEnd - segStart) * segFrac;
      linePath.style.strokeDashoffset = `${lineTotalLength - pixelLength}`;
      summit.style.opacity = `${v >= summitFraction ? Math.min(1, (v - summitFraction) / 0.01) : 0}`;
    };
    update(drawProgress.get());
    return drawProgress.on("change", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawProgress, lineTotalLength, cumulativeLengths, distFractions, summitFraction]);

  return (
    <div ref={wrapRef} className="route-profile-svg-wrap overflow-hidden rounded-sm border border-[var(--border)] p-3">
      <svg
        viewBox={`0 0 ${vw} ${VH}`}
        className="h-full w-full cursor-crosshair touch-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Perfil de desnivel: de ${eleMin} a ${eleMax} metros a lo largo de ${(distanceM / 1000).toFixed(1)} km. Pasa el cursor para ver el punto en el mapa.`}
        onPointerMove={handleMove}
        onPointerLeave={() => onHoverIndex(null)}
      >
        <defs>
          <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent-rose)" }} stopOpacity="0.35" />
            <stop offset="100%" style={{ stopColor: "var(--accent-rose)" }} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[eleMin, Math.round((eleMin + eleMax) / 2), eleMax].map((v) => (
          <line
            key={v}
            x1="0"
            x2={vw}
            y1={y(v)}
            y2={y(v)}
            style={{ stroke: "var(--border)" }}
            strokeWidth="0.75"
          />
        ))}

        <motion.path d={areaD} fill="url(#elevation-fill)" style={{ opacity: areaOpacity }} />
        <path
          ref={linePathRef}
          d={lineD}
          fill="none"
          style={{
            stroke: "var(--pine)",
            strokeDasharray: lineTotalLength,
            strokeDashoffset: lineTotalLength,
          }}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <g ref={summitRef} style={{ opacity: 0 }}>
          <circle cx={summitX} cy={summitY} r="4" style={{ fill: "var(--accent-rose)" }} />
          <text
            x={summitX}
            y={summitY - 10}
            textAnchor="middle"
            className="font-mono"
            fontSize="11"
            style={{ fill: "var(--text-dim)" }}
          >
            {summitLabel}
          </text>
        </g>

        {/* Etiquetas del eje Y con fondo propio, pintadas DESPUÉS del área y
            la línea (no antes, como las guías): si no, cuando el trazado
            estirado pasa cerca del borde inferior (tramos bajos, costeros)
            se comía el texto por encima. */}
        {[eleMin, Math.round((eleMin + eleMax) / 2), eleMax].map((v) => (
          <g key={v}>
            <rect x="0" y={y(v) - 15} width="40" height="14" style={{ fill: "var(--paper)" }} opacity="0.85" />
            <text x="4" y={y(v) - 4} className="font-mono" fontSize="11" style={{ fill: "var(--text-faint)" }}>
              {v} m
            </text>
          </g>
        ))}

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
              style={{ fill: "var(--accent-rose)", stroke: "var(--paper)" }}
              strokeWidth="2"
            />
            <g transform={`translate(${Math.min(Math.max(hovered[0], 60), vw - 60)}, ${PAD_TOP - 12})`}>
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
          x={vw}
          y={VH - 8}
          textAnchor="end"
          className="font-mono"
          fontSize="11"
          style={{ fill: "var(--text-faint)" }}
        >
          {(distanceM / 1000).toFixed(1)} km
        </text>
      </svg>
    </div>
  );
}
