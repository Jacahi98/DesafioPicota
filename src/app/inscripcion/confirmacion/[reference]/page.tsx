import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";
import {
  MODALITIES,
  BANK_TRANSFER,
  GUARDIAN_AUTH_PATH,
  REGISTRATION_DEADLINE,
  formatPrice,
  needsGuardianConsent,
} from "@/lib/registration";

export const metadata: Metadata = {
  title: "Inscripción recibida | Desafío Picota",
  robots: { index: false },
};

const deadlineLabel = REGISTRATION_DEADLINE.toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">{label}</span>
      <span className={`text-right text-[15px] text-[var(--ink)] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const db = getDb();
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.paymentReference, reference))
    .limit(1);

  if (!registration) notFound();

  const price = formatPrice(registration.priceCents);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <BackHome />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Inscripción recibida
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--text-dim)]">
          Gracias, {registration.firstName}. Tu plaza en {MODALITIES[registration.modality].label} queda
          reservada en cuanto hagamos la transferencia con estos datos.
        </p>

        <div className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-6 py-2 divide-y divide-[var(--border)]">
          <Row label="IBAN" value={BANK_TRANSFER.iban} mono />
          <Row label="Titular" value={BANK_TRANSFER.holder} />
          <Row label="Importe" value={price} mono />
          <Row label="Concepto (obligatorio)" value={registration.paymentReference} mono />
        </div>

        <p className="mt-6 text-sm text-[var(--text-dim)]">
          Indica el concepto exactamente como aparece arriba — es lo que usamos para identificar tu pago.
          Plazo: antes del {deadlineLabel}. Te hemos enviado estos mismos datos por email.
        </p>
        {needsGuardianConsent(registration.birthDate) && (
          <div
            role="note"
            className="mt-8 rounded-sm border border-[var(--accent-rose)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]"
          >
            <p className="font-semibold text-[var(--accent-rose)]">Falta un papel: la autorización de tu tutor</p>
            <p className="mt-1">
              Como eres menor de edad, tienes que llevar la autorización de tu padre, madre o tutor legal{" "}
              <strong className="text-[var(--ink)]">firmada</strong> y entregarla en la{" "}
              <strong className="text-[var(--ink)]">recogida de dorsal</strong>, junto con una fotocopia de su DNI.
              Sin ese documento no se te entregará el dorsal.
            </p>
            <a
              href={GUARDIAN_AUTH_PATH}
              download
              className="mt-2 inline-block font-semibold text-[var(--pine)] underline underline-offset-4"
            >
              Descargar la autorización (PDF)
            </a>
          </div>
        )}
        <p className="mt-3 text-sm text-[var(--text-faint)]">
          Guarda esta página o el email: la referencia <span className="font-mono">{registration.paymentReference}</span>{" "}
          es tu localizador de inscripción.
        </p>
      </main>
      <Footer />
    </>
  );
}
