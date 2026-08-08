import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RegistrationForm } from "@/components/registration-form";
import { isRegistrationOpen } from "@/lib/registration";

export const metadata: Metadata = {
  title: "Inscripción | Desafío Picota",
  alternates: { canonical: "/inscripcion" },
};

// Sin esto la página se genera estática en el build y el aviso de "plazo
// cerrado" queda congelado con la fecha de aquel momento — el envío en sí
// ya se revalida en el server action (registerAction), así que esto es solo
// para que el aviso en pantalla se ponga al día solo, sin tener que
// redesplegar el día del cierre.
export const revalidate = 3600;

export default function InscripcionPage() {
  const open = isRegistrationOpen();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">Inscripción</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--text-dim)]">
          Desafío Picota se corre el 24 de abril de 2027 en Liencres, Cantabria. El pago se hace por
          transferencia bancaria — al enviar el formulario verás el IBAN y el concepto exacto que hay que
          indicar.
        </p>

        {open ? (
          <div className="mt-10">
            <RegistrationForm />
          </div>
        ) : (
          <p className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm text-[var(--text-dim)]">
            El plazo de inscripción ya se ha cerrado.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
