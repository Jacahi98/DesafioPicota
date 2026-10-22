import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";
import {
  MODALITIES,
  GUARDIAN_AUTH_PATH,
  CONTACT_EMAIL,
  FEDERATED_LICENSE_SHORT,
  REFERENCE_PATTERN,
  REF_WINDOW_MIN,
  REF_MAX_PER_IP,
  needsGuardianConsent,
} from "@/lib/registration";
import { clientIp } from "@/lib/client-ip";
import { tooManyAttempts, recordAttempt } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Preinscripción recibida | Desafío Picota",
  robots: { index: false },
};

// min-w-0 + break-words en el valor: un email largo sin espacios no debe
// ensanchar la fila y provocar scroll horizontal en pantallas estrechas.
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">{label}</span>
      <span className={`min-w-0 break-words text-right text-[15px] text-[var(--ink)] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  // El localizador abre una página con datos personales: formato primero (sin
  // tocar la BD) y luego un límite de consultas por IP contra el barrido de
  // localizadores. Cualquier rechazo es un 404 más, sin dar pistas.
  if (!REFERENCE_PATTERN.test(reference)) notFound();
  const ip = clientIp(await headers());
  if (await tooManyAttempts("ref:", ip, REF_WINDOW_MIN, REF_MAX_PER_IP)) notFound();
  await recordAttempt("ref:", ip);

  const db = getDb();
  const [registration] = await db
    .select()
    .from(registrations)
    .where(and(eq(registrations.paymentReference, reference), isNull(registrations.deletedAt)))
    .limit(1);

  if (!registration) notFound();

  // birthDate llega como "YYYY-MM-DD": en UTC para que la zona horaria del
  // servidor no mueva el día.
  const birthDateLabel = new Date(registration.birthDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <BackHome />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Hemos recibido tu preinscripción con los siguientes datos
        </h1>

        <div className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-6 py-2 divide-y divide-[var(--border)]">
          <Row label="Localizador" value={registration.paymentReference} mono />
          <Row label="Modalidad" value={MODALITIES[registration.modality].label} />
          <Row label="Nombre" value={`${registration.firstName} ${registration.lastName}`} />
          <Row label="DNI/NIE" value={registration.dni} />
          <Row label="Fecha de nacimiento" value={birthDateLabel} />
          <Row label="Email" value={registration.email} />
          <Row label="Teléfono" value={registration.phone} />
          {/* Las filas anteriores a estos dos campos tienen '': sin fila vacía. */}
          {registration.emergencyPhone && <Row label="Teléfono de emergencia" value={registration.emergencyPhone} />}
          {registration.address && <Row label="Dirección" value={registration.address} />}
          {registration.shirtSize && <Row label="Talla de camiseta" value={registration.shirtSize} />}
          {registration.club && <Row label="Club" value={registration.club} />}
          <Row label="Federación" value={registration.federated ? "Federado" : "No federado"} />
          {registration.federated && <Row label="Licencia federativa" value={FEDERATED_LICENSE_SHORT} />}
        </div>

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
        <div className="mt-8 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
          <p>
            En pocos momentos te llegará un correo a <strong className="text-[var(--ink)]">{registration.email}</strong>{" "}
            confirmando tu preinscripción, con tu código localizador{" "}
            <span className="font-mono text-[var(--ink)]">{registration.paymentReference}</span>. Es el código que
            tendrás que usar en la inscripción para acreditar que estás preinscrito.
          </p>
          <p className="mt-2">
            Si no te llega el correo, escribe a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--pine)] underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
