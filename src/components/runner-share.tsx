"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Check } from "lucide-react";
import { routeTrack, routeStats, andarinesTrack, andarinesStats } from "@/data/route-track";

// Imagen para compartir en formato historia (9:16): el recorrido de TU modalidad (Trail o Andarines) con el mismo diseño que la web,
// y el número de corredor pequeño abajo. No lleva ningún dato personal.
const W = 1080;
const H = 1920;

const SHARE_URL = "https://desafiopicota.com";
export type Modality = "trekking" | "andarines";
const SHARE_TEXT = (n: number, modality: Modality) =>
  `¡Ya estoy dentro del Desafío Picota (${modality === "trekking" ? "Trail" : "Andarines"})! ${modality === "trekking" ? "Corredor" : "Andarín"} número ${n}. 24 de abril de 2027 · Liencres, Cantabria.`;

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type Rgb = [number, number, number];

// Imagen de satélite de la web (public/route-satellite-wide.webp) y su calibración: son las MISMAS constantes que usa route-map.tsx para
// colocar el trazado sobre ella, así que aquí el recorrido cae en su sitio exacto del satélite.
const SAT_SRC = "/route-satellite-wide.webp";
const MERC_R = 6378137;
const mercX = (lng: number) => (MERC_R * (lng * Math.PI)) / 180;
const mercY = (lat: number) => MERC_R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const ROUTE_VW = 420;
const ROUTE_VH = 512;
const SAT_PAD = 34;
const MARGIN_X = 380;
const MARGIN_Y = 164;
const VBW = ROUTE_VW + 2 * MARGIN_X;
const VBH = ROUTE_VH + 2 * MARGIN_Y;
const MERC_X_MIN = -441114.6142174258;
const MERC_X_MAX = -437185.03619242326;
const MERC_Y_MIN = 5378680.032683926;
const MERC_Y_MAX = 5383617.743608577;

function loadImage(src: string): Promise<HTMLImageElement> {
  const im = new Image();
  im.src = src;
  return new Promise((resolve) => {
    im.onload = () => resolve(im);
    im.onerror = () => resolve(im);
  });
}

function mix(c1: Rgb, c2: Rgb, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  return `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * k)},${Math.round(c1[1] + (c2[1] - c1[1]) * k)},${Math.round(c1[2] + (c2[2] - c1[2]) * k)})`;
}

function hexToRgb(hex: string, fallback: Rgb): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function km(m: number) {
  return (m / 1000).toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export async function buildImage(number: number, modality: Modality): Promise<Blob> {
  const track = modality === "trekking" ? routeTrack : andarinesTrack;
  const stats = modality === "trekking" ? routeStats : andarinesStats;
  const label = modality === "trekking" ? "TRAIL" : "ANDARINES";
  const person = modality === "trekking" ? "Corredor" : "Andarín";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const paper = cssVar("--paper", "#f4ddb8");
  const raised = cssVar("--paper-raised", "#faecd4");
  const border = cssVar("--border", "#dcb787");
  const pine = cssVar("--pine", "#621719");
  const rose = cssVar("--accent-rose", "#a9353a");
  const sea = cssVar("--sea", "#355c5e");
  const ink = cssVar("--ink", "#4a1010");
  const dim = cssVar("--text-dim", "#7a3624");
  const body = getComputedStyle(document.body).fontFamily || "sans-serif";
  const mono = cssVar("--font-mono", "") || "ui-monospace, monospace";
  const seaRgb = hexToRgb(sea, [53, 92, 94]);
  const roseRgb = hexToRgb(rose, [169, 53, 58]);
  const pineRgb = hexToRgb(pine, [98, 23, 25]);

  // fondo + líneas de nivel de las dunas, como en la web
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  const contour = (alpha: number, y0: number, step: number, count: number) => {
    ctx.strokeStyle = rose;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      const y = y0 + i * step;
      ctx.moveTo(-40, y);
      ctx.bezierCurveTo(260, y - 80, 520, y + 100, 760, y - 10);
      ctx.bezierCurveTo(900, y - 60, 1000, y + 20, 1120, y - 30);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  contour(0.16, 120, 215, 9);

  // logo y satélite
  const [logo, sat] = await Promise.all([loadImage("/logo-wordmark-light.webp"), loadImage(SAT_SRC)]);
  if (logo.naturalWidth > 0) {
    // por altura (no por ancho): el logo es casi cuadrado y a lo ancho se comía el resto de la cabecera
    const lh = 215;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, (W - lw) / 2, 50, lw, lh);
  }

  // etiqueta de modalidad
  ctx.textAlign = "center";
  ctx.fillStyle = sea;
  ctx.font = `600 36px ${mono}`;
  ctx.fillText("YA ESTOY DENTRO · MI RECORRIDO", W / 2, 322);
  ctx.fillStyle = pine;
  ctx.font = `800 70px ${body}`;
  ctx.fillText(label, W / 2, 398);

  // tarjeta del mapa
  const mx = 70;
  const my = 465;
  const mw = W - 140;
  const mh = 800;
  ctx.fillStyle = raised;
  ctx.fillRect(mx, my, mw, mh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();

  // trazado en el espacio de la imagen de satélite (la misma calibración que la web) y encuadre del recorrido dentro de la tarjeta
  const hasSat = sat.naturalWidth > 0;
  const viewScale = Math.max(VBW / (sat.naturalWidth || 1), VBH / (sat.naturalHeight || 1));
  const offX = ((sat.naturalWidth || 1) * viewScale - VBW) / 2;
  const offY = ((sat.naturalHeight || 1) * viewScale - VBH) / 2;
  const toImg = (p: number[]): [number, number] => {
    const vx = MARGIN_X + SAT_PAD + ((mercX(p[0]) - MERC_X_MIN) / (MERC_X_MAX - MERC_X_MIN)) * (ROUTE_VW - 2 * SAT_PAD);
    const vy = MARGIN_Y + SAT_PAD + (1 - (mercY(p[1]) - MERC_Y_MIN) / (MERC_Y_MAX - MERC_Y_MIN)) * (ROUTE_VH - 2 * SAT_PAD);
    return [(vx + offX) / viewScale, (vy + offY) / viewScale];
  };
  const imgPts = track.map((p) => toImg(p));
  const bx0 = Math.min(...imgPts.map((q) => q[0]));
  const bx1 = Math.max(...imgPts.map((q) => q[0]));
  const by0 = Math.min(...imgPts.map((q) => q[1]));
  const by1 = Math.max(...imgPts.map((q) => q[1]));
  const aspect = mw / mh;
  const margin = 1.22;
  let cw = Math.max((bx1 - bx0) * margin, (by1 - by0) * margin * aspect);
  let ch = cw / aspect;
  if (hasSat && cw > sat.naturalWidth) {
    cw = sat.naturalWidth;
    ch = cw / aspect;
  }
  if (hasSat && ch > sat.naturalHeight) {
    ch = sat.naturalHeight;
    cw = ch * aspect;
  }
  let cx0 = (bx0 + bx1) / 2 - cw / 2;
  let cy0 = (by0 + by1) / 2 - ch / 2;
  if (hasSat) {
    cx0 = Math.min(Math.max(cx0, 0), sat.naturalWidth - cw);
    cy0 = Math.min(Math.max(cy0, 0), sat.naturalHeight - ch);
  }
  const pt = (p: number[]): [number, number] => {
    const q = toImg(p);
    return [mx + ((q[0] - cx0) / cw) * mw, my + ((q[1] - cy0) / ch) * mh];
  };

  if (hasSat) {
    // satélite real con poca intensidad: apagado, con el tono de la paleta, para que el trazado mande
    ctx.globalAlpha = 0.42;
    try {
      ctx.filter = "saturate(0.55) sepia(0.28)";
    } catch {
      /* navegador sin ctx.filter: se dibuja sin filtro */
    }
    ctx.drawImage(sat, cx0, cy0, cw, ch, mx, my, mw, mh);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
  } else {
    contour(0.1, my + 60, 130, 7);
  }
  const eleT = (e: number) => (e - stats.minEle) / (stats.maxEle - stats.minEle);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // halo claro para despegar el trazado del fondo
  ctx.strokeStyle = paper;
  ctx.lineWidth = 28;
  ctx.beginPath();
  track.forEach((p, i) => {
    const [x, y] = pt(p);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // trazado coloreado por altitud: del verde azulado (abajo) al rosa de la marca y al granate (cima)
  ctx.lineWidth = 14;
  for (let i = 1; i < track.length; i++) {
    const t = eleT((track[i][2] + track[i - 1][2]) / 2);
    ctx.strokeStyle = t < 0.6 ? mix(seaRgb, roseRgb, t / 0.6) : mix(roseRgb, pineRgb, (t - 0.6) / 0.4);
    const [x0, y0] = pt(track[i - 1]);
    const [x1, y1] = pt(track[i]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // salida/meta y cima
  const [sx, sy] = pt(track[0]);
  ctx.fillStyle = paper;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(sx, sy, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  let top = 0;
  track.forEach((p, i) => {
    if (p[2] > track[top][2]) top = i;
  });
  const [tx, ty] = pt(track[top]);
  ctx.fillStyle = pine;
  ctx.beginPath();
  ctx.arc(tx, ty, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = paper;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  // rótulos (fuera del clip para que no se corten)
  const tag = (text: string, x: number, y: number, align: CanvasTextAlign) => {
    ctx.font = `700 34px ${body}`;
    ctx.textAlign = "left";
    const w = ctx.measureText(text).width + 36;
    const bx = align === "right" ? x - w : x;
    ctx.fillStyle = raised;
    ctx.fillRect(bx, y - 40, w, 58);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, y - 40, w, 58);
    ctx.fillStyle = ink;
    ctx.fillText(text, bx + 18, y);
  };
  tag("Salida y meta", Math.min(Math.max(sx + 34, mx + 20), mx + mw - 330), sy + 12, "left");
  tag(`Cima · ${stats.maxEle} m`, tx + 34 + 300 > mx + mw ? tx - 34 : tx + 34, ty - 26, tx + 34 + 300 > mx + mw ? "right" : "left");

  // borde de la tarjeta
  ctx.strokeStyle = pine;
  ctx.lineWidth = 5;
  ctx.strokeRect(mx, my, mw, mh);

  // tres cifras
  const cols = [
    { k: "DISTANCIA", v: `${km(stats.distanceM)} km` },
    { k: "DESNIVEL+", v: `${stats.gainM} m` },
    { k: "COTA MÁX.", v: `${stats.maxEle} m` },
  ];
  cols.forEach((c, i) => {
    const cx = mx + (mw / 3) * (i + 0.5);
    ctx.textAlign = "center";
    ctx.fillStyle = sea;
    ctx.font = `600 28px ${mono}`;
    ctx.fillText(c.k, cx, 1318);
    ctx.fillStyle = ink;
    ctx.font = `700 54px ${mono}`;
    ctx.fillText(c.v, cx, 1382);
  });

  // perfil de desnivel
  const px = mx;
  const py = 1425;
  const pw = mw;
  const ph = 220;
  ctx.fillStyle = raised;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  const inX = px + 36;
  const inW = pw - 72;
  const inY = py + 34;
  const inH = ph - 78;
  const dMax = track[track.length - 1][3] || stats.distanceM;
  const gx = (d: number) => inX + (d / dMax) * inW;
  const gy = (e: number) => inY + inH - eleT(e) * inH;
  const grad = ctx.createLinearGradient(0, inY, 0, inY + inH);
  grad.addColorStop(0, `rgba(${roseRgb.join(",")},0.55)`);
  grad.addColorStop(1, `rgba(${seaRgb.join(",")},0.18)`);
  ctx.beginPath();
  ctx.moveTo(gx(track[0][3]), inY + inH);
  track.forEach((p) => ctx.lineTo(gx(p[3]), gy(p[2])));
  ctx.lineTo(gx(track[track.length - 1][3]), inY + inH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = pine;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  track.forEach((p, i) => (i === 0 ? ctx.moveTo(gx(p[3]), gy(p[2])) : ctx.lineTo(gx(p[3]), gy(p[2]))));
  ctx.stroke();
  ctx.fillStyle = dim;
  ctx.font = `500 26px ${mono}`;
  ctx.textAlign = "left";
  ctx.fillText("0 km", inX, py + ph - 14);
  ctx.textAlign = "right";
  ctx.fillText(`${km(stats.distanceM)} km`, inX + inW, py + ph - 14);

  // fecha y lugar
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `700 58px ${body}`;
  ctx.fillText("24 de abril de 2027", W / 2, 1745);
  ctx.fillStyle = sea;
  ctx.font = `500 42px ${body}`;
  ctx.fillText("Liencres · Cantabria", W / 2, 1806);

  // pie: web y número de corredor, pequeño
  ctx.fillStyle = pine;
  ctx.fillRect(mx, 1830, mw, 4);
  ctx.textAlign = "left";
  ctx.fillStyle = pine;
  ctx.font = `700 34px ${body}`;
  ctx.fillText("desafiopicota.com", mx, 1885);
  ctx.textAlign = "right";
  ctx.fillStyle = rose;
  ctx.font = `700 34px ${mono}`;
  ctx.fillText(`${person} número ${number}`, mx + mw, 1885);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error("blob"))), "image/png"));
}

export function RunnerShare({ number, modality }: { number: number; modality: Modality }) {
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fallbackImage, setFallbackImage] = useState<Blob | null>(null);
  // La imagen se dibuja al mostrar el número, no al pulsar: los móviles (sobre todo iPhone) solo abren la hoja de compartir si se
  // pide en el mismo instante del toque, y dibujar antes tardaba lo bastante para que el sistema lo rechazara en silencio.
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildImage(number, modality)
      .then((blob) => {
        if (cancelled) return;
        fileRef.current = new File([blob], `corredor-${number}-${modality}-desafio-picota.png`, { type: "image/png" });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setMessage("No hemos podido preparar la imagen. Recarga la página e inténtalo de nuevo.");
      });
    return () => {
      cancelled = true;
    };
  }, [number, modality]);

  function share() {
    const file = fileRef.current;
    if (!file) return;
    setMessage(null);
    setFallbackImage(null);
    const text = SHARE_TEXT(number, modality);
    // Sin ningún "await" antes: la llamada a share() tiene que ir directa dentro del toque.
    if (typeof navigator.share === "function") {
      const data: ShareData = navigator.canShare?.({ files: [file] })
        ? { files: [file], text, title: "Desafío Picota" }
        : { text, url: SHARE_URL, title: "Desafío Picota" };
      navigator.share(data).then(
        () => setMessage("¡Compartido!"),
        (e: unknown) => {
          // Cancelar la hoja de compartir no es un error.
          if (e instanceof DOMException && e.name === "AbortError") return;
          setMessage(`No hemos podido abrir el menú de compartir (${e instanceof Error ? e.name : "error"}). Inténtalo de nuevo.`);
        }
      );
      return;
    }
    // Este navegador (o una página sin https) no trae hoja de compartir: se copia el texto y se ofrece guardar la imagen si quieres.
    setFallbackImage(file);
    if (!navigator.clipboard) {
      setMessage("Tu navegador no permite compartir directamente desde esta página.");
      return;
    }
    navigator.clipboard.writeText(`${text} ${SHARE_URL}`).then(
      () => setMessage("Tu navegador no permite compartir directamente. Hemos copiado el texto para que lo pegues donde quieras."),
      () => setMessage("Tu navegador no permite compartir directamente desde esta página.")
    );
  }

  function saveImage() {
    if (!fallbackImage) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(fallbackImage);
    a.download = `corredor-${number}-${modality}-desafio-picota.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <button
        type="button"
        onClick={share}
        disabled={!ready}
        className="inline-flex items-center gap-2 rounded-sm bg-[var(--pine)] px-5 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {message === "¡Compartido!" ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        {ready ? "Compartir" : "Preparando…"}
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm text-[var(--text-dim)]">
          {message}
        </p>
      )}
      {fallbackImage && (
        <button type="button" onClick={saveImage} className="mt-2 text-sm font-semibold text-[var(--pine)] underline underline-offset-4">
          Guardar la imagen
        </button>
      )}
    </div>
  );
}
