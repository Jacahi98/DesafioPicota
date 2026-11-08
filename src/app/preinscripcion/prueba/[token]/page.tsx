import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { RegistrationForm } from "@/components/registration-form";
import { isValidTestToken } from "@/lib/test-access";

// ENLACE PRIVADO DE PRUEBA de la preinscripción (ver lib/test-access.ts). Enseña
// el formulario real aunque la ventana pública esté cerrada. No se indexa, no
// está en el sitemap y con un token incorrecto responde 404 como cualquier
// ruta que no existe. Siempre dinámica: nunca se cachea una respuesta con token.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preinscripción | Desafío Picota",
  robots: { index: false, follow: false },
};

export default async function PreinscripcionPruebaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidTestToken(token)) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <BackHome />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">Preinscripción</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-dim)]">
          Desafío Picota se corre el 24 de abril de 2027 en Liencres, Cantabria.
        </p>
        <p className="mt-6 rounded-sm border border-[var(--accent-rose)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
          <strong className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-rose)]">
            Enlace de prueba privado
          </strong>
          <br />
          La preinscripción todavía no está abierta al público. Lo que envíes aquí queda guardado de verdad (y recibirás el
          email de confirmación), pero se borrará después de la prueba.
        </p>
        <div className="mt-6 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm leading-relaxed text-[var(--text-dim)]">
          <p>
            <strong className="text-[var(--ink)]">La preinscripción te asegura tu talla de camiseta, tu inscripción y un regalo.</strong>{" "}
            Ahora solo rellenarás tus datos:{" "}
            <strong className="text-base text-[var(--ink)]">no se hará ningún pago</strong>. El pago se hará en la
            inscripción.
          </p>
          <p className="mt-4">
            Las inscripciones abren el 14 de enero de 2027 y las personas preinscritas podrán hacerlo un día antes, el 13 de
            enero.
          </p>
        </div>
        <div className="mt-8">
          <RegistrationForm testToken={token} />
        </div>
      </main>
      <Footer />
    </>
  );
}
