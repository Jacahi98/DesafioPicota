"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

type TrackPoint = readonly [number, number, number, number];

// Más alto que un perfil de desnivel "clásico" a propósito: al no ser
// geografía real (es un gráfico estilizado), ganar relieve vertical aquí no
// distorsiona nada y se lee mejor, sobre todo junto al mapa en escritorio.
const VH = 320;
const PAD_TOP = 44;
// Mínimos: los valores reales se calculan en el componente a partir de
// labelFont, porque ese tamaño varía con el alto de la tarjeta (ver más
// abajo) y unos márgenes fijos dejaban el texto invadiendo el gráfico.
const PAD_BOTTOM = 36;
// Hueco a la izquierda para las etiquetas del eje Y ("232 m", etc.): el
// trazado empieza aquí, no en x=0, así nunca se monta encima del texto.
const PAD_LEFT = 36;
// Ancho "por defecto" antes de medir la tarjeta real (SSR/primer pintado).
const DEFAULT_VW = 800;
// Nunca más estrecho que esto, aunque la tarjeta salga rarísima de ancha.
const MIN_VW = 500;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// Marcas del eje Y en múltiplos redondos (50, 100, 150…) en vez de
// mínimo/medio/máximo, que no son una escala: daban valores arbitrarios como
// "6 m" o "120 m" (el punto medio exacto de un rango cualquiera). Se coge el
// paso más pequeño de la lista que no pase del número de marcas permitido, y
// se añade además la cota máxima real —la cima, que sí es un dato— salvo que
// caiga tan pegada a la última marca que se solaparían.
function buildEleAxis(min: number, max: number, maxTicks: number) {
  const span = Math.max(1, max - min);
  const step = [10, 20, 25, 50, 100, 200, 250, 500].find((s) => span / s <= maxTicks) ?? 1000;
  // El eje arranca en el múltiplo redondo justo por debajo de la cota mínima
  // (y nunca por debajo de 0), no en la cota mínima exacta. Si arranca en la
  // cota exacta, la primera franja vale menos metros que las demás —con este
  // recorrido, de 6 a 50 son 44 m frente a los 50 de las siguientes— y se ve
  // que la separación de abajo no cuadra con el resto aunque la escala sea
  // perfectamente lineal.
  const floor = Math.max(0, Math.floor(min / step) * step);
  const ticks: number[] = [];
  for (let v = floor; v <= max; v += step) ticks.push(v);
  if (ticks.length === 0 || max - ticks[ticks.length - 1] > step * 0.35) ticks.push(max);
  return { ticks, floor };
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

  // Ojo: el suelo de la escala es scaleMin (múltiplo redondo), NO la cota
  // mínima real — así todas las franjas del eje valen los mismos metros.
  // scaleMin se define más abajo (necesita boxH); y() solo se llama al
  // pintar, cuando ya existe.
  function y(ele: number) {
    return PAD_TOP + (1 - (ele - scaleMin) / (eleMax - scaleMin)) * plotH;
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
  // Alto real de la tarjeta en px, para poder compensar el tamaño del texto
  // (ver labelFont).
  const [boxH, setBoxH] = useState(VH);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setVw(Math.max(MIN_VW, (width / height) * VH));
        setBoxH(height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // El viewBox tiene alto fijo (VH) pero la tarjeta no, así que todo lo que
  // se mide en unidades de viewBox se escala por boxH/VH al pintarse. Un
  // fontSize fijo de 11 acababa en 3,8 px reales en tarjetas bajas —
  // ilegible. Aquí se hace el camino inverso: se calcula el tamaño en
  // unidades de viewBox que da SIEMPRE ~12 px en pantalla, sea cual sea el
  // alto de la tarjeta. El clamp evita valores absurdos en casos extremos.
  const LABEL_PX = 12;
  const labelFont = Math.round(Math.min(48, Math.max(7, (LABEL_PX * VH) / Math.max(1, boxH))));

  // Los márgenes tienen que crecer con labelFont, no ser fijos: al compensar
  // el tamaño del texto, en tarjetas bajas la fuente pasa de 11 a ~32
  // unidades de viewBox, y con PAD_LEFT fijo en 36 una etiqueta como
  // "200 m" ya no cabía en su hueco y se metía dentro del gráfico. Igual
  // abajo: con PAD_BOTTOM fijo, "0 m" y "0 km" quedaban a 14 px uno de otro.
  // En mono cada carácter mide ~0,6 em y la etiqueta más larga son 5-6
  // caracteres, de ahí el 3,6.
  const padLeft = Math.max(PAD_LEFT, Math.round(labelFont * 3.6));
  const padBottom = Math.max(PAD_BOTTOM, Math.round(labelFont * 2.4));
  const plotH = VH - PAD_TOP - padBottom;

  // En tarjetas bajas caben menos marcas sin amontonarse, así que el eje se
  // vuelve más grueso (pasos de 100 en vez de 50) en lugar de apretar texto.
  const { ticks: eleTicks, floor: scaleMin } = useMemo(
    () => buildEleAxis(eleMin, eleMax, boxH < 150 ? 3 : 5),
    [eleMin, eleMax, boxH],
  );

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
    const x = (distM: number) => padLeft + (distM / distanceM) * (vw - padLeft);
    const pts = track.map(([, , ele, dist]) => [x(dist), y(ele)] as const);
    const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${vw},${VH - padBottom} L${padLeft},${VH - padBottom} Z`;

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
  }, [vw, track, distanceM, summitIndex, scaleMin, eleMax, padLeft, padBottom, plotH]);

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

        {eleTicks.map((v) => (
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
            fontSize={labelFont}
            style={{ fill: "var(--text-dim)" }}
          >
            {summitLabel}
          </text>
        </g>

        {/* Etiquetas del eje Y con fondo propio, pintadas DESPUÉS del área y
            la línea (no antes, como las guías): si no, cuando el trazado
            estirado pasa cerca del borde inferior (tramos bajos, costeros)
            se comía el texto por encima. */}
        {/* En tarjetas bajas se omite la etiqueta del suelo del eje: queda
            justo encima de la fila del eje X y "0 m" y "0 km" acababan a 11
            px uno de otro, pareciendo que marcan lo mismo. La línea guía del
            0 sigue dibujada y, con las marcas repartidas de forma regular, el
            suelo se lee igual de bien. */}
        {eleTicks.filter((v) => !(v === scaleMin && boxH < 200)).map((v) => (
          <g key={v}>
            {/* El fondo de la etiqueta también escala con la fuente: con un
                width fijo de 40 dejaba de tapar el trazado por debajo del
                texto en cuanto la fuente crecía. */}
            <rect
              x="0"
              y={y(v) - labelFont - 3}
              width={padLeft - 4}
              height={labelFont + 4}
              style={{ fill: "var(--paper)" }}
              opacity="0.85"
            />
            <text x="4" y={y(v) - 4} className="font-mono" fontSize={labelFont} style={{ fill: "var(--sea)" }}>
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
              y2={VH - padBottom}
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
                fontSize={labelFont}
                style={{ fill: "var(--paper)" }}
              >
                {Math.round(hoveredTrack[2])} m · {(hoveredTrack[3] / 1000).toFixed(1)} km
              </text>
            </g>
          </g>
        )}

        {/* El "0 km" se alinea con PAD_LEFT, que es donde empieza de verdad
            el trazado, no con x=0. Pegado al borde quedaba justo debajo del
            "0 m" del eje Y y los dos parecían marcar el mismo punto, cuando
            cada uno es el origen de su propio eje: el del eje Y está en el
            borde izquierdo y el del eje X, PAD_LEFT más allá. */}
        <text x={padLeft} y={VH - 8} className="font-mono" fontSize={labelFont} style={{ fill: "var(--sea)" }}>
          0 km
        </text>
        <text
          x={vw}
          y={VH - 8}
          textAnchor="end"
          className="font-mono"
          fontSize={labelFont}
          style={{ fill: "var(--sea)" }}
        >
          {(distanceM / 1000).toFixed(1)} km
        </text>
      </svg>
    </div>
  );
}
