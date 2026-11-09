"use client";

import { useMemo, useState } from "react";
import { setPaymentStatusAction } from "@/app/panel/actions";

// Vistas del panel: Resumen (gráficas), Lista (buscar, filtrar, abrir una persona)
// y Tabla (solo en pantallas anchas). Recibe los datos ya preparados por el
// servidor y se queda con su estado (pestaña, búsqueda, filtros) aunque la
// página se refresque sola cada pocos segundos.

export type PanelRow = {
  id: string;
  createdAt: string; // ISO
  modality: "trekking" | "andarines";
  modalityLabel: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  address: string;
  shirtSize: string | null;
  club: string | null;
  federated: boolean;
  licenseNumber: string | null;
  licenseVerified: boolean;
  priceLabel: string;
  paymentReference: string;
  paymentStatus: "pending" | "confirmed" | "cancelled";
  paymentUpdatedBy: string | null;
  minor: boolean;
};

export type Bucket = { t: number; n: number };

type Props = {
  rows: PanelRow[];
  buckets: Bucket[];
  nowMs: number;
  beforeOpening: number;
};

const TZ = "Europe/Madrid";
const STATUS_LABEL = { pending: "pendiente", confirmed: "pagado", cancelled: "cancelado" } as const;
const STATUS_COLOR = {
  pending: "text-[var(--text-dim)]",
  confirmed: "text-[var(--pine)]",
  cancelled: "text-[var(--accent-rose)]",
} as const;

const fmt = (ms: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hourCycle: "h23", ...o }).format(new Date(ms));
const hourLabel = (ms: number) => fmt(ms, { hour: "2-digit" }) + "h";
const dayLabel = (ms: number) => fmt(ms, { weekday: "short", day: "numeric" }).replace(".", "");
const whenLabel = (ms: number) => fmt(ms, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const timeShort = (iso: string) => fmt(new Date(iso).getTime(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function ModalityBadge({ modality, label }: { modality: PanelRow["modality"]; label: string }) {
  const cls = modality === "trekking" ? "border-[var(--pine)] text-[var(--pine)]" : "border-[var(--sea)] bg-[var(--sea)] text-[var(--pine-ink)]";
  return (
    <span className={`inline-block rounded-sm border px-1.5 py-px align-middle text-[10px] font-semibold uppercase leading-snug tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function MinorBadge() {
  return (
    <span className="inline-block rounded-sm bg-[var(--accent-rose)] px-1.5 py-px align-middle text-[10px] font-bold uppercase leading-snug tracking-wider text-[var(--pine-ink)]">
      menor
    </span>
  );
}

/* ---------- acciones de pago (formularios de servidor) ---------- */
function StatusActions({ id, status }: { id: string; status: PanelRow["paymentStatus"] }) {
  const botones = [
    { to: "confirmed", label: "[ marcar pagado ]", cls: "text-[var(--pine)]" },
    { to: "pending", label: "[ pendiente ]", cls: "text-[var(--text-dim)]" },
    { to: "cancelled", label: "[ cancelar ]", cls: "text-[var(--accent-rose)]" },
  ] as const;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {botones
        .filter((b) => status !== b.to)
        .map((b) => (
          <form key={b.to} action={setPaymentStatusAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={b.to} />
            <button type="submit" className={`py-1.5 text-xs underline underline-offset-2 ${b.cls}`}>
              {b.label}
            </button>
          </form>
        ))}
    </div>
  );
}

/* ---------- gráficas (SVG a mano, sin librerías) ---------- */
const W = 360;

function HourChart({ buckets, nowMs, sel, onSel }: { buckets: Bucket[]; nowMs: number; sel: number; onSel: (i: number) => void }) {
  const H = 176, padL = 26, padB = 24, padT = 10, padR = 4;
  const n = buckets.length;
  const bw = (W - padL - padR) / n;
  const max = Math.max(1, ...buckets.map((b) => b.n));
  const plotH = H - padB - padT;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const ticks = [0, Math.round(max / 2), max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Preinscripciones por hora">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="0.6" />
          <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="var(--text-faint)">
            {t}
          </text>
        </g>
      ))}
      {buckets.map((b, i) => {
        const x = padL + i * bw;
        const future = b.t > nowMs;
        const current = b.t <= nowMs && nowMs < b.t + 3600000;
        const h = (b.n / max) * plotH;
        return (
          <g key={b.t}>
            {!future && b.n > 0 && (
              <rect x={x + 0.8} y={y(b.n)} width={Math.max(1, bw - 1.6)} height={h} fill={current ? "var(--sea)" : "var(--pine)"} opacity={sel === i ? 1 : 0.78} rx="0.8" />
            )}
            {future && <rect x={x + 0.8} y={padT + plotH - 1.5} width={Math.max(1, bw - 1.6)} height="1.5" fill="var(--border)" />}
            {sel === i && <rect x={x} y={padT} width={bw} height={plotH} fill="none" stroke="var(--ink)" strokeWidth="0.7" strokeDasharray="2 2" />}
            <rect x={x} y={padT} width={bw} height={plotH} fill="transparent" onClick={() => onSel(i)} style={{ cursor: "pointer" }} />
            {i % 6 === 0 && (
              <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="8" fill="var(--text-faint)">
                {hourLabel(b.t)}
              </text>
            )}
            {i % 12 === 0 && (
              <text x={x + bw / 2} y={H - 2} textAnchor="middle" fontSize="7.5" fill="var(--sea)">
                {dayLabel(b.t)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CumulativeChart({ buckets, nowMs, base }: { buckets: Bucket[]; nowMs: number; base: number }) {
  const H = 138, padL = 26, padB = 28, padT = 10, padR = 4;
  const n = buckets.length;
  const bw = (W - padL - padR) / n;
  // Arranca en `base` (los registros anteriores a la apertura, contados como los primeros)
  // y sube al final de cada hora ya empezada.
  const hasta = buckets.filter((b) => b.t <= nowMs);
  const pts = [
    { x: padL, v: base },
    ...hasta.map((_, i) => ({ x: padL + (i + 1) * bw, v: base + hasta.slice(0, i + 1).reduce((s, x) => s + x.n, 0) })),
  ];
  const acc = pts[pts.length - 1].v;
  const max = Math.max(1, acc);
  const plotH = H - padB - padT;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const line = pts.map((p) => `${p.x},${y(p.v)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = `${padL},${y(0)} ${line} ${last.x},${y(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Preinscripciones acumuladas">
      {[0, Math.round(max / 2), max].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="0.6" />
          <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="var(--text-faint)">
            {t}
          </text>
        </g>
      ))}
      {buckets.map((b, i) =>
        i % 6 === 0 ? (
          <g key={b.t}>
            <line x1={padL + i * bw} x2={padL + i * bw} y1={padT} y2={padT + plotH} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="1.5 2.5" />
            <text x={padL + i * bw} y={H - 14} textAnchor="middle" fontSize="8" fill="var(--text-faint)">
              {hourLabel(b.t)}
            </text>
            {i % 12 === 0 && (
              <text x={padL + i * bw} y={H - 4} textAnchor="middle" fontSize="7.5" fill="var(--sea)">
                {dayLabel(b.t)}
              </text>
            )}
          </g>
        ) : null,
      )}
      <polygon points={area} fill="var(--pine)" opacity="0.18" />
      <polyline points={line} fill="none" stroke="var(--pine)" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={last.x} cy={y(acc)} r="3" fill="var(--sea)" />
      <text x={Math.min(last.x + 6, W - padR)} y={Math.max(y(acc) - 6, 9)} textAnchor={last.x + 40 > W ? "end" : "start"} fontSize="9" fill="var(--ink)">
        {acc}
      </text>
    </svg>
  );
}

function Bars({ items }: { items: [string, number][] }) {
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[4.2rem_1fr_2.2rem] items-center gap-2 text-xs">
          <span className="text-[var(--text-dim)]">{label}</span>
          <span className="h-2.5 bg-[var(--paper-sunken)]">
            <span className="block h-full bg-[var(--pine)]" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-[var(--ink)]">{n}</span>
        </li>
      ))}
    </ul>
  );
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] p-3.5">
    <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">{title}</h3>
    {children}
  </section>
);

/* ---------- Resumen ---------- */
function Summary({ rows, buckets, nowMs, beforeOpening }: Props) {
  const nowIdx = Math.max(0, buckets.findIndex((b) => b.t <= nowMs && nowMs < b.t + 3600000));
  const [sel, setSel] = useState(nowIdx);
  const b = buckets[sel];
  const peak = buckets.reduce((m, x) => (x.n > m.n ? x : m), buckets[0]);
  const live = rows.filter((r) => r.paymentStatus !== "cancelled");
  const por = (f: (r: PanelRow) => string) => {
    const m = new Map<string, number>();
    live.forEach((r) => m.set(f(r), (m.get(f(r)) ?? 0) + 1));
    return [...m.entries()];
  };
  const tallas = ["XS", "S", "M", "L", "XL", "XXL"].map((t) => [t, live.filter((r) => r.shirtSize === t).length] as [string, number]);
  const sinTalla = live.filter((r) => !r.shirtSize).length;
  const modal = por((r) => r.modalityLabel).sort((a, c) => c[1] - a[1]);
  const estado = (["pending", "confirmed", "cancelled"] as const).map((s) => [STATUS_LABEL[s], rows.filter((r) => r.paymentStatus === s).length] as [string, number]);
  const menores = live.filter((r) => r.minor).length;
  const fed = live.filter((r) => r.federated).length;

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Preinscripciones por hora">
        <HourChart buckets={buckets} nowMs={nowMs} sel={sel} onSel={setSel} />
        <p className="mt-2 min-h-[2.4rem] text-xs text-[var(--text-dim)]">
          {b ? (
            <>
              <span className="capitalize">{whenLabel(b.t)}</span> a {hourLabel(b.t + 3600000)}:{" "}
              <strong className="text-[var(--ink)]">{b.n}</strong> {b.n === 1 ? "preinscripción" : "preinscripciones"}
              {b.t > nowMs && " (aún no ha llegado)"}
            </>
          ) : null}
        </p>
        <p className="text-[11px] text-[var(--text-faint)]">
          Hora punta: {peak && peak.n > 0 ? `${hourLabel(peak.t)} del ${dayLabel(peak.t)} con ${peak.n}` : "—"}. Toca una barra para ver su hora.
        </p>
      </Panel>

      <Panel title="Acumuladas">
        <CumulativeChart buckets={buckets} nowMs={nowMs} base={beforeOpening} />
        {beforeOpening > 0 && (
          <p className="mt-1 text-[11px] text-[var(--text-faint)]">
            Incluye {beforeOpening} {beforeOpening === 1 ? "registro anterior" : "registros anteriores"} a la apertura, contados como los primeros.
          </p>
        )}
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Camisetas por talla">
          <Bars items={tallas} />
          {sinTalla > 0 && <p className="mt-2 text-[11px] text-[var(--text-faint)]">{sinTalla} sin talla</p>}
        </Panel>
        <Panel title="Modalidad">
          <Bars items={modal} />
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">Estado de pago</p>
          <Bars items={estado} />
          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            {fed} con licencia federada · {menores} {menores === 1 ? "menor" : "menores"}
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Lista ---------- */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--sea)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PAGE = 25;
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function csvOf(rows: PanelRow[]) {
  const head = ["fecha", "nombre", "apellidos", "modalidad", "dni", "email", "telefono", "telefono_emergencia", "direccion", "talla", "club", "federado", "menor", "importe", "referencia", "estado"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [timeShort(r.createdAt), r.firstName, r.lastName, r.modalityLabel, r.dni, r.email, r.phone, r.emergencyPhone, r.address, r.shirtSize ?? "", r.club ?? "", r.federated ? "si" : "no", r.minor ? "si" : "no", r.priceLabel, r.paymentReference, STATUS_LABEL[r.paymentStatus]].map(esc).join(","),
  );
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

/* ---------- filtros y orden (compartidos por Lista y Tabla) ---------- */
type SortKey = "fecha" | "nombre" | "dni" | "talla";
type Dir = "asc" | "desc";
const SORT_LABEL: Record<SortKey, string> = { fecha: "fecha de inscripción", nombre: "nombre", dni: "DNI", talla: "talla de camiseta" };
const SORT_SHORT: Record<SortKey, string> = { fecha: "fecha", nombre: "nombre", dni: "DNI", talla: "talla" };
const hasClub = (r: PanelRow) => Boolean(r.club && r.club.trim());

function compare(a: PanelRow, b: PanelRow, key: SortKey): number {
  switch (key) {
    case "fecha":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "nombre":
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "es", { sensitivity: "base" });
    case "dni":
      return a.dni.localeCompare(b.dni, "es", { numeric: true, sensitivity: "base" });
    case "talla":
      return SIZES.indexOf(a.shirtSize ?? "") - SIZES.indexOf(b.shirtSize ?? "");
  }
}

function useFilters(rows: PanelRow[]) {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<"all" | PanelRow["modality"]>("all");
  const [st, setSt] = useState<"all" | PanelRow["paymentStatus"]>("all");
  const [size, setSize] = useState("all");
  const [club, setClub] = useState<"all" | "with" | "without">("all");
  const [onlyMinors, setOnlyMinors] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [dir, setDir] = useState<Dir>("desc");
  const [shown, setShown] = useState(PAGE);
  const reset = () => setShown(PAGE);

  const filtered = useMemo(() => {
    const t = norm(q.trim());
    const list = rows.filter((r) => {
      if (mod !== "all" && r.modality !== mod) return false;
      if (st !== "all" && r.paymentStatus !== st) return false;
      if (size !== "all" && (r.shirtSize ?? "") !== size) return false;
      if (club === "with" && !hasClub(r)) return false;
      if (club === "without" && hasClub(r)) return false;
      if (onlyMinors && !r.minor) return false;
      if (!t) return true;
      return norm(`${r.firstName} ${r.lastName} ${r.dni} ${r.email} ${r.phone} ${r.paymentReference} ${r.club ?? ""}`).includes(t);
    });
    const sign = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      // Las filas sin talla van siempre al final, sea cual sea el sentido.
      if (sortKey === "talla" && Boolean(a.shirtSize) !== Boolean(b.shirtSize)) return a.shirtSize ? -1 : 1;
      return compare(a, b, sortKey) * sign;
    });
  }, [rows, q, mod, st, size, club, onlyMinors, sortKey, dir]);

  // Elegir una columna de orden: la fecha empieza por lo más reciente y las demás de la A a la Z.
  const chooseSort = (k: SortKey) => {
    setSortKey(k);
    setDir(k === "fecha" ? "desc" : "asc");
    reset();
  };
  // Pulsar una cabecera de la tabla: si ya era la columna, cambia el sentido; si no, la elige.
  const sortBy = (k: SortKey) => {
    if (k === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
      reset();
    } else chooseSort(k);
  };

  return { q, setQ, mod, setMod, st, setSt, size, setSize, club, setClub, onlyMinors, setOnlyMinors, sortKey, dir, setDir, chooseSort, sortBy, shown, setShown, reset, filtered };
}
type Filters = ReturnType<typeof useFilters>;

const chip = (active: boolean) =>
  `rounded-sm border px-2 py-1.5 text-xs ${active ? "border-[var(--pine)] bg-[var(--pine)] text-[var(--pine-ink)]" : "border-[var(--border)] text-[var(--text-dim)]"}`;

function FiltersPanel({ f, total }: { f: Filters; total: number }) {
  const { reset } = f;
  function download() {
    const blob = new Blob([csvOf(f.filtered)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "preinscripciones.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={f.q}
        onChange={(e) => {
          f.setQ(e.target.value);
          reset();
        }}
        placeholder="buscar nombre, DNI, email, teléfono, localizador…"
        aria-label="Buscar preinscripciones"
        className="w-full rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3 py-2.5 text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--pine)]"
      />
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-x-6">
        <Group label="ordenar por">
          {(Object.keys(SORT_SHORT) as SortKey[]).map((k) => (
            <button key={k} type="button" onClick={() => f.chooseSort(k)} className={chip(f.sortKey === k)}>
              {SORT_SHORT[k]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              f.setDir(f.dir === "asc" ? "desc" : "asc");
              reset();
            }}
            className={`${chip(false)} min-w-[7.5rem] text-[var(--ink)]`}
            aria-label="Cambiar sentido del orden"
          >
            {f.dir === "asc" ? "↑ ascendente" : "↓ descendente"}
          </button>
        </Group>
        <Group label="modalidad">
          {([["all", "todas"], ["trekking", "Trail"], ["andarines", "Andarines"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { f.setMod(v); reset(); }} className={chip(f.mod === v)}>{l}</button>
          ))}
        </Group>
        <Group label="pago">
          {([["all", "todos"], ["pending", "pendiente"], ["confirmed", "pagado"], ["cancelled", "cancelado"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { f.setSt(v); reset(); }} className={chip(f.st === v)}>{l}</button>
          ))}
        </Group>
        <Group label="club">
          {([["all", "todos"], ["with", "con club"], ["without", "sin club"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { f.setClub(v); reset(); }} className={chip(f.club === v)}>{l}</button>
          ))}
        </Group>
        <Group label="talla de camiseta">
          {["all", ...SIZES].map((t) => (
            <button key={t} type="button" onClick={() => { f.setSize(t); reset(); }} className={chip(f.size === t)}>{t === "all" ? "todas" : t}</button>
          ))}
        </Group>
        <Group label="edad">
          <button type="button" onClick={() => { f.setOnlyMinors(false); reset(); }} className={chip(!f.onlyMinors)}>todos</button>
          <button type="button" onClick={() => { f.setOnlyMinors(true); reset(); }} className={chip(f.onlyMinors)}>solo menores</button>
        </Group>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--text-faint)]">
          {f.filtered.length === total ? `${total} preinscripciones` : `${f.filtered.length} de ${total} con estos filtros`} · orden: {SORT_LABEL[f.sortKey]} {f.dir === "asc" ? "↑" : "↓"}
        </p>
        <button type="button" onClick={download} className="shrink-0 text-xs text-[var(--text-dim)] underline underline-offset-2">[ descargar CSV ]</button>
      </div>
    </div>
  );
}

/* ---------- Lista ---------- */
function List({ f }: { f: Filters }) {
  const [open, setOpen] = useState<string | null>(null);
  const { filtered, shown, setShown } = f;
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {filtered.slice(0, shown).map((r) => {
          const isOpen = open === r.id;
          return (
            <li key={r.id} className={`rounded-sm border border-[var(--border)] border-l-[3px] bg-[var(--paper-raised)] ${r.modality === "trekking" ? "border-l-[var(--pine)]" : "border-l-[var(--sea)]"}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.id)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--text-faint)]">
                    <ModalityBadge modality={r.modality} label={r.modalityLabel} />
                    {r.minor && <MinorBadge />}
                    <span>
                      {timeShort(r.createdAt)} · talla {r.shirtSize ?? "—"}
                    </span>
                    {hasClub(r) && <span className="text-[var(--sea)]">· club</span>}
                  </span>
                </span>
                <span className={`text-[11px] font-medium ${STATUS_COLOR[r.paymentStatus]}`}>{STATUS_LABEL[r.paymentStatus]}</span>
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border)] px-3 pb-2.5 pt-2">
                  <dl className="grid grid-cols-[4.6rem_1fr] gap-x-2 gap-y-1 text-[11px] leading-snug">
                    {(
                      [
                        ["email", r.email],
                        ["teléfono", r.phone],
                        ["emergencia", r.emergencyPhone || "—"],
                        ["dni", r.dni],
                        ["club", r.club || "—"],
                        ["federado", r.federated ? `Sí${r.licenseNumber ? ` · ${r.licenseNumber}` : ""}${r.licenseVerified ? "" : " (sin verificar)"}` : "No"],
                        ["dirección", r.address || "—"],
                        ["pago", `${r.priceLabel} · ${r.paymentReference}`],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-[var(--sea)]">{k}</dt>
                        <dd className="text-[var(--text-dim)] [overflow-wrap:anywhere]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {r.paymentUpdatedBy && <p className="mt-1 text-[10px] text-[var(--text-faint)]">estado cambiado por {r.paymentUpdatedBy.toLowerCase()}</p>}
                  <div className="mt-1.5 border-t border-[var(--border)] pt-1">
                    <StatusActions id={r.id} status={r.paymentStatus} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">{"// nada con estos filtros"}</p>}
      {filtered.length > shown && (
        <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-sm border border-[var(--border)] py-2.5 text-xs text-[var(--text-dim)]">
          ver {Math.min(PAGE, filtered.length - shown)} más ({filtered.length - shown} restantes)
        </button>
      )}
    </div>
  );
}

/* ---------- Tabla completa (pantallas anchas) ---------- */
function Table({ f }: { f: Filters }) {
  const cols: { label: string; key?: SortKey }[] = [
    { label: "fecha", key: "fecha" },
    { label: "nombre", key: "nombre" },
    { label: "modalidad" },
    { label: "talla", key: "talla" },
    { label: "dni", key: "dni" },
    { label: "email" },
    { label: "teléfono" },
    { label: "emergencia" },
    { label: "club" },
    { label: "federado" },
    { label: "importe" },
    { label: "referencia" },
    { label: "estado" },
    { label: "" },
  ];
  return (
    <div className="overflow-x-auto rounded-sm border border-[var(--border)] bg-[var(--paper-raised)]">
      <table className="w-full min-w-[1280px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            {cols.map((c) => (
              <th
                key={c.label}
                aria-sort={c.key && c.key === f.sortKey ? (f.dir === "asc" ? "ascending" : "descending") : undefined}
                className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]"
              >
                {c.key ? (
                  <button type="button" onClick={() => f.sortBy(c.key!)} className={`uppercase tracking-wider hover:text-[var(--ink)] ${c.key === f.sortKey ? "text-[var(--ink)]" : ""}`}>
                    {c.label} {c.key === f.sortKey ? (f.dir === "asc" ? "↑" : "↓") : <span className="opacity-40">↕</span>}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {f.filtered.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--text-faint)]">{timeShort(r.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--ink)]">
                {r.firstName} {r.lastName}
                {r.minor && (
                  <span className="ml-2">
                    <MinorBadge />
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2"><ModalityBadge modality={r.modality} label={r.modalityLabel} /></td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.shirtSize ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--text-dim)]">{r.dni}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.email}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.phone}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.emergencyPhone || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.club || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--text-dim)]">{r.federated ? `Sí${r.licenseVerified ? "" : " · sin verificar"}` : "No"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--ink)]">{r.priceLabel}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--ink)]">{r.paymentReference}</td>
              <td className={`whitespace-nowrap px-3 py-2 font-medium ${STATUS_COLOR[r.paymentStatus]}`}>{STATUS_LABEL[r.paymentStatus]}</td>
              <td className="px-3 py-1"><StatusActions id={r.id} status={r.paymentStatus} /></td>
            </tr>
          ))}
          {f.filtered.length === 0 && (
            <tr>
              <td colSpan={14} className="px-3 py-8 text-center text-[var(--text-faint)]">{"// nada con estos filtros"}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Contenedor con pestañas ---------- */
export function PanelView(props: Props) {
  const [tab, setTab] = useState<"resumen" | "lista" | "tabla">("resumen");
  const f = useFilters(props.rows);
  const tabs = [
    ["resumen", "resumen", ""],
    ["lista", `lista (${props.rows.length})`, ""],
    ["tabla", "tabla", "hidden md:inline-block"],
  ] as const;
  return (
    <div className="mt-8 font-mono">
      <div role="tablist" aria-label="Vistas del panel" className="mb-3 flex gap-1 border-b border-[var(--border)]">
        {tabs.map(([id, label, cls]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${cls} ${tab === id ? "border-[var(--pine)] text-[var(--ink)]" : "border-transparent text-[var(--text-faint)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "resumen" && <Summary {...props} />}
      {(tab === "lista" || tab === "tabla") && (
        <div className="flex flex-col gap-3">
          <FiltersPanel f={f} total={props.rows.length} />
          {tab === "lista" ? <List f={f} /> : <Table f={f} />}
        </div>
      )}
    </div>
  );
}
