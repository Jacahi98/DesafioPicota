import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { RegistrationForm } from "@/components/registration-form";
import {
  isRegistrationOpen,
  registrationPhase,
  PLAZAS_MAX,
  REGISTRATION_ENABLED,
  REGISTRATION_OPENS_AT,
} from "@/lib/registration";
import { countActiveRegistrations } from "@/lib/register-db";

export const metadata: Metadata = {
  title: "Preinscripción | Desafío Picota",
  alternates: { canonical: "/preinscripcion" },
};

// Sin esto la página se genera estática en el build y los avisos de "plazo
// cerrado" y de "plazas agotadas" quedan congelados con la situación de aquel
// momento — el envío en sí se revalida en el server action (registerAction),
// así que esto es solo para que el aviso en pantalla se ponga al día solo.
// 60 s (y no más): al acabarse las plazas el formulario tiene que dejar de
// ofrecerse enseguida. Cuesta una consulta a la BD por minuto como mucho.
export const revalidate = 60;

const NOTICE_CLASS =
  "mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm text-[var(--text-dim)]";

export default async function PreinscripcionPage() {
  const open = isRegistrationOpen();
  const phase = registrationPhase();
  const opensLabel = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(REGISTRATION_OPENS_AT);

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
        {!REGISTRATION_ENABLED ? (
          <>
            <p className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
              Las preinscripciones se abrirán previsiblemente en noviembre.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--text-dim)]">
              Desafío Picota se corre el 24 de abril de 2027 en Liencres, Cantabria.
            </p>
            <div className="mt-6 max-w-lg rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
              <p>
                <strong className="text-[var(--ink)]">La preinscripción te asegura tu talla de camiseta y tu inscripción.</strong>{" "}
                Las inscripciones abren el 14 de enero de 2027, y las personas preinscritas podrán inscribirse un día
                antes, el 13 de enero.
              </p>
              <p className="mt-2">
                Ahora solo rellenarás tus datos: <strong className="text-[var(--ink)]">no se hará ningún pago</strong>.
                El pago se hará en la inscripción.
              </p>
            </div>

            {!open ? (
              <p className={NOTICE_CLASS}>
                {phase === "before"
                  ? `Las preinscripciones se abrirán el ${opensLabel} y estarán abiertas solo 48 horas.`
                  : "El plazo de preinscripción ya se ha cerrado."}
              </p>
            ) : soldOut ? (
              <p className={NOTICE_CLASS}>Las plazas de preinscripción están agotadas.</p>
            ) : (
              <div className="mt-10">
                <RegistrationForm />
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
