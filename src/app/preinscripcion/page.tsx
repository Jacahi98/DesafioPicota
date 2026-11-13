import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { RegistrationForm } from "@/components/registration-form";
import { RegistrationClock } from "@/components/registration-clock";
import { PreinscriptionChecker } from "@/components/preinscription-checker";
import { InscriptionFormat } from "@/components/inscription-format";
import {
  isRegistrationOpen,
  registrationPhase,
  isTestOpen,
  isDeadlinePassed,
  madridDateTimeLabel,
  PLAZAS_MAX,
  REGISTRATION_ENABLED,
  REGISTRATION_OPENS_AT,
  REGISTRATION_DEADLINE,
} from "@/lib/registration";
import { countActiveRegistrations } from "@/lib/register-db";

export const metadata: Metadata = {
  title: "Preinscripción | Desafío Picota",
  alternates: { canonical: "/preinscripcion" },
};

// Se renderiza en cada petición. Con una página en caché (antes revalidate = 60)
// el aviso podía seguir diciendo "abre en…" hasta un minuto después de las 11:00:
// el reloj llega a cero, pide la página y recibe la copia vieja. Así la fase
// (antes / abierta / cerrada) y los avisos de plazo y de plazas agotadas salen
// siempre de la hora real del servidor. El envío en sí lo revalida registerAction.
export const dynamic = "force-dynamic";

// "Lunes 9 de noviembre…" -> "lunes 9 de noviembre…" para usarlo en mitad de una frase.
const enMinuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const NOTICE_CLASS =
  "mt-6 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm text-[var(--text-dim)]";

export default async function PreinscripcionPage() {
  const open = isRegistrationOpen();
  const phase = registrationPhase();
  const testMode = isTestOpen();
  // Por la hora real, aunque en desarrollo la fase se fuerce a "abierta": así lo local se ve igual que en producción (sin formulario ni reloj).
  const closed = isDeadlinePassed();
  // Si la BD falla se trata como "no agotado": registerAction sigue siendo la
  // autoridad y rechaza el envío si de verdad no quedan plazas.
  let soldOut = false;
  if (REGISTRATION_ENABLED && open) {
    try {
      soldOut = (await countActiveRegistrations()) >= PLAZAS_MAX;
    } catch {
      soldOut = false;
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <BackHome />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">Preinscripción</h1>
        {closed && (
          <div
            role="status"
            className="mt-6 flex items-center gap-3 rounded-sm border-2 border-[var(--accent-rose)] bg-[var(--paper-raised)] px-5 py-4"
          >
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-rose)]">Plazo terminado</span>
            <span className="text-[15px] text-[var(--ink)]">La preinscripción ya está cerrada. ¡Gracias a todas las personas que os habéis apuntado!</span>
          </div>
        )}
        {!REGISTRATION_ENABLED ? (
          <>
            <p className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
              Las preinscripciones se abrirán previsiblemente en noviembre.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-dim)]">
              Desafío Picota se corre el 24 de abril de 2027 en Liencres, Cantabria.
            </p>
            {!closed && (
            <div className="mt-6 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
              <p>
                <strong className="text-[var(--ink)]">La preinscripción te asegura tu talla de camiseta, tu inscripción y un regalo.</strong>{" "}
                Ahora solo rellenarás tus datos:{" "}
                <strong className="text-base text-[var(--ink)]">no se hará ningún pago</strong>. El pago se hará en la
                inscripción.
              </p>
              <p className="mt-4">
                Las inscripciones abren el 14 de enero de 2027 y las personas preinscritas podrán hacerlo un día antes, el
                13 de enero.
              </p>
            </div>
            )}

            <PreinscriptionChecker />
            <InscriptionFormat />

            {closed ? null : !open ? (
              <>
                {phase === "before" && (
                  <div className="mt-6">
                    <RegistrationClock
                      phase="before"
                      opensAt={REGISTRATION_OPENS_AT.getTime()}
                      closesAt={REGISTRATION_DEADLINE.getTime()}
                      opensLabel={madridDateTimeLabel(REGISTRATION_OPENS_AT)}
                      closesLabel={madridDateTimeLabel(REGISTRATION_DEADLINE)}
                    />
                  </div>
                )}
                <p className={NOTICE_CLASS}>
                  {phase === "before"
                    ? `Las preinscripciones se abrirán el ${enMinuscula(madridDateTimeLabel(REGISTRATION_OPENS_AT))} y estarán abiertas hasta el ${enMinuscula(madridDateTimeLabel(REGISTRATION_DEADLINE))}.`
                    : "El plazo de preinscripción ya se ha cerrado."}
                </p>
              </>
            ) : soldOut ? (
              <p className={NOTICE_CLASS}>Las plazas de preinscripción están agotadas.</p>
            ) : (
              <>
                <div className="mt-6">
                  <RegistrationClock
                    phase="open"
                    opensAt={REGISTRATION_OPENS_AT.getTime()}
                    closesAt={REGISTRATION_DEADLINE.getTime()}
                    opensLabel={madridDateTimeLabel(REGISTRATION_OPENS_AT)}
                    closesLabel={madridDateTimeLabel(REGISTRATION_DEADLINE)}
                    testMode={testMode}
                  />
                </div>
                <div className="mt-8">
                  <RegistrationForm />
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
