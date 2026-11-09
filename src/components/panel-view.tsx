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

function CumulativeChart({ buckets, nowMs }: { buckets: Bucket[]; nowMs: number }) {
  const H = 120, padL = 26, padB = 14, padT = 8, padR = 4;
  const n = buckets.length;
  const bw = (W - padL - padR) / n;
  const hasta = buckets.filter((b) => b.t <= nowMs);
  const pts = hasta.map((_, i) => ({ i, v: hasta.slice(0, i + 1).reduce((s, x) => s + x.n, 0) }));
  const acc = pts.length ? pts[pts.length - 1].v : 0;
  const max = Math.max(1, acc);
  const plotH = H - padB - padT;
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const line = pts.map((p) => `${padL + (p.i + 1) * bw},${y(p.v)}`).join(" ");
  const area = pts.length ? `${padL},${y(0)} ${line} ${padL + pts.length * bw},${y(0)}` : "";
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
      {area && <polygon points={area} fill="var(--pine)" opacity="0.18" />}
      {line && <polyline points={line} fill="none" stroke="var(--pine)" strokeWidth="1.6" strokeLinejoin="round" />}
      {pts.length > 0 && <circle cx={padL + pts.length * bw} cy={y(acc)} r="3" fill="var(--sea)" />}
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
        <CumulativeChart buckets={buckets} nowMs={nowMs} />
        {beforeOpening > 0 && (
          <p className="mt-1 text-[11px] text-[var(--text-faint)]">
            {beforeOpening} {beforeOpening === 1 ? "registro anterior" : "registros anteriores"} a la apertura (pruebas) no salen en las gráficas.
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
            {fed} con licencia federada · {menores} {menores === 1 ? "menor" : "menores"} (autorización firmada)
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Lista ---------- */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PAGE = 25;

function csvOf(rows: PanelRow[]) {
  const head = ["fecha", "nombre", "apellidos", "modalidad", "dni", "email", "telefono", "telefono_emergencia", "direccion", "talla", "club", "federado", "importe", "referencia", "estado"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [timeShort(r.createdAt), r.firstName, r.lastName, r.modalityLabel, r.dni, r.email, r.phone, r.emergencyPhone, r.address, r.shirtSize ?? "", r.club ?? "", r.federated ? "si" : "no", r.priceLabel, r.paymentReference, STATUS_LABEL[r.paymentStatus]].map(esc).join(","),
  );
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

function List({ rows }: { rows: PanelRow[] }) {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<"all" | PanelRow["modality"]>("all");
  const [st, setSt] = useState<"all" | PanelRow["paymentStatus"]>("all");
  const [size, setSize] = useState("all");
  const [onlyMinors, setOnlyMinors] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = norm(q.trim());
    return rows.filter((r) => {
      if (mod !== "all" && r.modality !== mod) return false;
      if (st !== "all" && r.paymentStatus !== st) return false;
      if (size !== "all" && (r.shirtSize ?? "") !== size) return false;
      if (onlyMinors && !r.minor) return false;
      if (!t) return true;
      return norm(`${r.firstName} ${r.lastName} ${r.dni} ${r.email} ${r.phone} ${r.paymentReference} ${r.club ?? ""}`).includes(t);
    });
  }, [rows, q, mod, st, size, onlyMinors]);

  const reset = () => setShown(PAGE);
  const chip = (active: boolean) =>
    `rounded-sm border px-2.5 py-1.5 text-xs ${active ? "border-[var(--pine)] bg-[var(--pine)] text-[var(--pine-ink)]" : "border-[var(--border)] text-[var(--text-dim)]"}`;

  function download() {
    const blob = new Blob([csvOf(filtered)], { type: "text/csv;charset=utf-8" });
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
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          reset();
        }}
        placeholder="buscar nombre, DNI, email, teléfono, localizador…"
        aria-label="Buscar preinscripciones"
        className="w-full rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3 py-2.5 text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--pine)]"
      />
      <div className="flex flex-wrap gap-1.5">
        {([["all", "todas"], ["trekking", "Trail"], ["andarines", "Andarines"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setMod(v); reset(); }} className={chip(mod === v)}>{l}</button>
        ))}
        <span className="mx-1 w-px bg-[var(--border)]" />
        {([["all", "todos"], ["pending", "pendiente"], ["confirmed", "pagado"], ["cancelled", "cancelado"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setSt(v); reset(); }} className={chip(st === v)}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={size}
          onChange={(e) => { setSize(e.target.value); reset(); }}
          aria-label="Filtrar por talla"
          className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-2 py-1.5 text-xs text-[var(--text-dim)]"
        >
          <option value="all">talla: todas</option>
          {["XS", "S", "M", "L", "XL", "XXL"].map((t) => <option key={t} value={t}>talla {t}</option>)}
        </select>
        <button type="button" onClick={() => { setOnlyMinors((v) => !v); reset(); }} className={chip(onlyMinors)}>solo menores</button>
        <button type="button" onClick={download} className="ml-auto text-xs underline underline-offset-2 text-[var(--text-dim)]">[ descargar CSV ]</button>
      </div>
      <p className="text-[11px] text-[var(--text-faint)]">
        {filtered.length === rows.length ? `${rows.length} preinscripciones` : `${filtered.length} de ${rows.length} con estos filtros`}
      </p>

      <ul className="flex flex-col gap-1.5">
        {filtered.slice(0, shown).map((r) => {
          const isOpen = open === r.id;
          return (
            <li key={r.id} className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)]">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.id)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">
                    {r.firstName} {r.lastName}
                    {r.minor && <span className="ml-1.5 text-[10px] font-normal text-[var(--accent-rose)]">menor</span>}
                  </span>
                  <span className="block text-[11px] text-[var(--text-faint)]">
                    {timeShort(r.createdAt)} · {r.modalityLabel} · talla {r.shirtSize ?? "—"}
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
                  {r.minor && <p className="mt-2 text-[11px] text-[var(--accent-rose)]">Entregar autorización firmada en la recogida de dorsal.</p>}
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
function Table({ rows }: { rows: PanelRow[] }) {
  const heads = ["fecha", "nombre", "modalidad", "talla", "dni", "email", "teléfono", "emergencia", "club", "federado", "importe", "referencia", "estado", ""];
  return (
    <div className="overflow-x-auto rounded-sm border border-[var(--border)] bg-[var(--paper-raised)]">
      <table className="w-full min-w-[1280px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            {heads.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--text-faint)]">{timeShort(r.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--ink)]">
                {r.firstName} {r.lastName}
                {r.minor && <span className="ml-2 text-xs text-[var(--accent-rose)]">menor · autorización</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-dim)]">{r.modalityLabel}</td>
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
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Contenedor con pestañas ---------- */
export function PanelView(props: Props) {
  const [tab, setTab] = useState<"resumen" | "lista" | "tabla">("resumen");
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
      {tab === "lista" && <List rows={props.rows} />}
      {tab === "tabla" && <Table rows={props.rows} />}
    </div>
  );
}
