import type { Metadata } from "next";
import { cookies } from "next/headers";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations, adminPatternConfig } from "@/db/schema";
import { isValidSession, isValidPatternGate, adminLabel, ADMIN_COOKIE, PATTERN_GATE_COOKIE } from "@/lib/admin-auth";
import { MODALITIES, formatPrice, needsGuardianConsent } from "@/lib/registration";
import { REGISTRATION_OPENS_AT, REGISTRATION_DEADLINE } from "@/lib/registration-window";
import { loginAction, logoutAction } from "@/app/panel/actions";
import { PatternGate } from "@/app/panel/pattern-gate";
import { PatternSetup } from "@/app/panel/pattern-setup";
import { TerminalBoot } from "@/components/terminal-boot";
import { AutoRefresh } from "@/components/auto-refresh";
import { PanelView, type PanelRow, type Bucket } from "@/components/panel-view";

// Fecha y hora en hora de España (el servidor corre en UTC).
const fmtMadrid = (d: Date, withSeconds = false) =>
  d.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  });

export const metadata: Metadata = {
  title: "Desafío Picota",
  robots: { index: false, follow: false },
};

// Cifras del panel en vivo. Función aparte (la página es dinámica: se calcula
// con la hora de cada petición); `fechas` llega ordenada de más reciente a más antigua.
function resumenEnVivo(fechas: Date[]) {
  const ahora = Date.now();
  const hace = (ms: number) => fechas.filter((d) => ahora - d.getTime() < ms).length;
  return {
    ultimaHora: hace(60 * 60 * 1000),
    ultimas24h: hace(24 * 60 * 60 * 1000),
    ultima: fechas[0] ? fmtMadrid(fechas[0], true) : null,
  };
}

// Preinscripciones por hora de la ventana (de la apertura al cierre) y reloj del
// servidor. Función aparte: la página es dinámica y esto depende de la hora.
function datosDeGraficas(fechas: Date[]): { buckets: Bucket[]; nowMs: number; beforeOpening: number } {
  const start = REGISTRATION_OPENS_AT.getTime();
  const n = Math.max(1, Math.round((REGISTRATION_DEADLINE.getTime() - start) / 3600000));
  const buckets: Bucket[] = Array.from({ length: n }, (_, i) => ({ t: start + i * 3600000, n: 0 }));
  let beforeOpening = 0;
  for (const d of fechas) {
    const t = d.getTime();
    if (t < start) beforeOpening++;
    else {
      const i = Math.floor((t - start) / 3600000);
      if (i < n) buckets[i].n++;
    }
  }
  return { buckets, nowMs: Date.now(), beforeOpening };
}

const LOGIN_BOOT_LINES = ["patrón aceptado", "identifícate para continuar"];

function LoginForm({ error }: { error: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-20">
      <TerminalBoot lines={LOGIN_BOOT_LINES} />
      <form action={loginAction} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="contraseña_"
          autoFocus
          required
          className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3.5 py-2.5 font-mono text-[15px] text-[var(--ink)] outline-none focus:border-[var(--pine)] focus:shadow-[0_0_0_1px_var(--pine)]"
        />
        {error && <p className="font-mono text-sm text-[var(--accent-rose)]">[ contraseña incorrecta ]</p>}
        <button
          type="submit"
          className="rounded-sm border border-[var(--pine)] bg-[var(--pine)] px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--pine-ink)] transition-opacity hover:opacity-90"
        >
          [ acceder ]
        </button>
      </form>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [cookieStore, { error }, patternConfig] = await Promise.all([
    cookies(),
    searchParams,
    getDb()
      .select()
      .from(adminPatternConfig)
      .where(eq(adminPatternConfig.id, "singleton"))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const patternConfigured = Boolean(patternConfig?.patternHash);
  const rateLimited = error === "ratelimited";

  // Primera puerta: el patrón, si ya hay uno configurado. Sin patrón
  // configurado se salta este paso (arranque inicial, ver setPatternAction).
  if (patternConfigured && !isValidPatternGate(cookieStore.get(PATTERN_GATE_COOKIE)?.value)) {
    return <PatternGate error={error === "pattern"} rateLimited={rateLimited} />;
  }

  const adminId = isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!adminId) {
    return <LoginForm error={error === "1" || rateLimited} />;
  }

  // Sin las filas eliminadas (borrado lógico).
  const rows = await getDb()
    .select()
    .from(registrations)
    .where(isNull(registrations.deletedAt))
    .orderBy(desc(registrations.createdAt));

  const fechas = rows.map((r) => new Date(r.createdAt));
  const { ultimaHora, ultimas24h, ultima } = resumenEnVivo(fechas);
  const { buckets, nowMs, beforeOpening } = datosDeGraficas(fechas);
  const panelRows: PanelRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.createdAt).toISOString(),
    modality: r.modality,
    modalityLabel: MODALITIES[r.modality].label,
    firstName: r.firstName,
    lastName: r.lastName,
    dni: r.dni,
    email: r.email,
    phone: r.phone,
    emergencyPhone: r.emergencyPhone,
    address: r.address,
    shirtSize: r.shirtSize,
    club: r.club,
    federated: r.federated,
    licenseNumber: r.licenseNumber,
    licenseVerified: r.licenseVerified,
    priceLabel: formatPrice(r.priceCents),
    paymentReference: r.paymentReference,
    paymentStatus: r.paymentStatus,
    paymentUpdatedBy: r.paymentUpdatedBy,
    minor: needsGuardianConsent(r.birthDate),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="glow font-mono text-2xl font-semibold text-[var(--ink)]">
            {adminLabel(adminId).toLowerCase()}@picota<span className="admin-caret" />
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
            {"// "}
            {rows.length} preinscripciones cargadas
          </p>
          <div className="mt-3">
            <AutoRefresh />
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="font-mono text-sm text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--accent-rose)]"
          >
            [ salir ]
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 font-mono sm:grid-cols-4 sm:gap-3">
        {[
          ["total", String(rows.length)],
          ["última hora", String(ultimaHora)],
          ["últimas 24 h", String(ultimas24h)],
          ["última recibida", ultima ?? "—"],
        ].map(([label, value]) => (
          <div
            key={label}
            className={`rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3 py-2.5 sm:px-4 sm:py-3 ${label === "última recibida" ? "col-span-3 sm:col-span-1" : ""}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sea)] sm:text-[11px]">{label}</p>
            <p className="mt-1 text-lg text-[var(--ink)] sm:text-lg lg:text-xl">{value}</p>
          </div>
        ))}
      </div>

      <PanelView
        rows={panelRows}
        buckets={buckets}
        nowMs={nowMs}
        beforeOpening={beforeOpening}
      />

      <div className="mt-8">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">
          {"// seguridad"}
        </p>
        <PatternSetup
          configured={patternConfigured}
          canEdit={adminId === "javier"}
          updatedByLabel={patternConfig?.updatedBy}
          updatedAtLabel={
            patternConfig?.updatedAt
              ? new Date(patternConfig.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
              : null
          }
        />
      </div>

    </main>
  );
}
