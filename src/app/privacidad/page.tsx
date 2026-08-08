import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ORGANIZER } from "@/lib/registration";

export const metadata: Metadata = {
  title: "Política de privacidad | Desafío Picota",
  alternates: { canonical: "/privacidad" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] pt-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-[var(--text-dim)]">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-dim)]">
          Aplica a los datos personales recogidos en el formulario de inscripción de Desafío Picota, de
          acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD.
        </p>

        <div className="mt-10 flex flex-col gap-6">
          <Section title="Responsable del tratamiento">
            <p>{ORGANIZER.legalName}</p>
            <p>NIF: {ORGANIZER.nif}</p>
          </Section>

          <Section title="Qué datos recogemos y para qué">
            <p>
              Al inscribirte recogemos nombre, apellidos, DNI/NIE, fecha de nacimiento, email, teléfono y,
              si aplica, club. Los usamos para gestionar tu inscripción, verificar que cumples el requisito
              de edad mínima, organizar la prueba (dorsales, avituallamiento, seguro del día) y
              comunicarnos contigo sobre la carrera.
            </p>
          </Section>

          <Section title="Base legal">
            <p>
              Tu consentimiento expreso al marcar la casilla del formulario, y la ejecución de la relación
              que se establece al inscribirte en la prueba.
            </p>
          </Section>

          <Section title="Menores de edad">
            <p>
              Desafío Picota solo admite inscripciones de personas mayores de edad el día de la carrera. No
              recogemos intencionadamente datos de menores.
            </p>
          </Section>

          <Section title="Conservación">
            <p>
              Conservamos tus datos mientras dure la organización de la edición en la que te inscribes y,
              después, el tiempo exigido por la normativa fiscal y de subvenciones aplicable.
            </p>
          </Section>

          <Section title="Destinatarios">
            <p>
              No cedemos tus datos a terceros, salvo obligación legal (por ejemplo, ante requerimiento de
              una autoridad competente) o cuando sea necesario para el seguro de la prueba.
            </p>
          </Section>

          <Section title="Tus derechos">
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
              portabilidad escribiendo a la organización, y reclamar ante la Agencia Española de Protección
              de Datos (aepd.es) si consideras que no se ha atendido tu solicitud correctamente.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
