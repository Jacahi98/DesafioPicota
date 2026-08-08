import type { Metadata } from "next";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations, adminPatternConfig } from "@/db/schema";
import { isValidSession, isValidPatternGate, adminLabel, ADMIN_COOKIE, PATTERN_GATE_COOKIE } from "@/lib/admin-auth";
import { MODALITIES, formatPrice } from "@/lib/registration";
import { loginAction, logoutAction, setPaymentStatusAction } from "@/app/sendero-f74ad7/actions";
import { PatternGate } from "@/app/sendero-f74ad7/pattern-gate";
import { PatternSetup } from "@/app/sendero-f74ad7/pattern-setup";
import { TerminalBoot } from "@/components/terminal-boot";

export const metadata: Metadata = {
  title: "Desafío Picota",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "pendiente",
  confirmed: "pagado",
  cancelled: "cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-[var(--text-dim)]",
  confirmed: "text-[var(--pine)] glow",
  cancelled: "text-[var(--accent-rose)]",
};

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

  const rows = await getDb().select().from(registrations).orderBy(desc(registrations.createdAt));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="glow font-mono text-2xl font-semibold text-[var(--ink)]">
            {adminLabel(adminId).toLowerCase()}@picota<span className="admin-caret" />
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
            {"// "}
            {rows.length} inscritos cargados
          </p>
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

      <div className="mt-8 overflow-x-auto rounded-sm border border-[var(--border)] shadow-[var(--shadow)]">
        <table className="w-full min-w-[1000px] border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--paper-raised)] text-left">
              {[
                "fecha",
                "nombre",
                "modalidad",
                "dni",
                "email",
                "teléfono",
                "club",
                "importe",
                "referencia",
                "estado",
                "actualizado por",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-faint)]">
                  {new Date(r.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                  {r.firstName} {r.lastName}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-dim)]">
                  {MODALITIES[r.modality].label}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-dim)]">{r.dni}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-dim)]">{r.email}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-dim)]">{r.phone}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-dim)]">{r.club || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">{formatPrice(r.priceCents)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--ink)]">{r.paymentReference}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 font-medium ${STATUS_COLOR[r.paymentStatus]}`}>
                  {STATUS_LABEL[r.paymentStatus]}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--text-faint)]">
                  {r.paymentUpdatedBy?.toLowerCase() || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <div className="flex gap-3">
                    {r.paymentStatus !== "confirmed" && (
                      <form action={setPaymentStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button type="submit" className="text-xs text-[var(--pine)] underline underline-offset-2">
                          [ marcar pagado ]
                        </button>
                      </form>
                    )}
                    {r.paymentStatus !== "pending" && (
                      <form action={setPaymentStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="pending" />
                        <button type="submit" className="text-xs text-[var(--text-dim)] underline underline-offset-2">
                          [ pendiente ]
                        </button>
                      </form>
                    )}
                    {r.paymentStatus !== "cancelled" && (
                      <form action={setPaymentStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button
                          type="submit"
                          className="text-xs text-[var(--accent-rose)] underline underline-offset-2"
                        >
                          [ cancelar ]
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-[var(--text-faint)]">
                  {"// todavía no hay inscripciones"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
