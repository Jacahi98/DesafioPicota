import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackHome } from "@/components/back-home";
import { ORGANIZER, CONTACT_EMAIL } from "@/lib/registration";

export const metadata: Metadata = {
  title: "Política de privacidad | Desafío Picota",
  alternates: { canonical: "/privacidad" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--border)] pt-6">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-[var(--text-dim)] [overflow-wrap:anywhere]">
        {children}
      </div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--pine)] underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  );
}

// Estructura por capas recomendada por la AEPD (Guía para el cumplimiento del
// deber de informar): primera capa con las cinco rúbricas básicas, segunda capa
// con el detalle del art. 13 RGPD. La misma primera capa se muestra en el
// formulario, junto a las casillas de consentimiento.
export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:px-8 sm:py-20">
        <BackHome />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-dim)]">
          Aplica a los datos personales recogidos en el formulario de preinscripción de Desafío Picota, de acuerdo
          con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Última actualización: 22 de
          octubre de 2026.
        </p>

        <div className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Información básica</h2>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-[15px] leading-relaxed [overflow-wrap:anywhere]">
            <dt className="font-semibold text-[var(--ink)]">Responsable</dt>
            <dd className="text-[var(--text-dim)]">
              {ORGANIZER.legalName} (NIF {ORGANIZER.nif}).
            </dd>
            <dt className="font-semibold text-[var(--ink)]">Finalidad</dt>
            <dd className="text-[var(--text-dim)]">
              Gestionar tu preinscripción y la inscripción anticipada, reservar tu talla de camiseta, organizar la
              prueba y atender emergencias durante la carrera.
            </dd>
            <dt className="font-semibold text-[var(--ink)]">Legitimación</dt>
            <dd className="text-[var(--text-dim)]">
              Medidas precontractuales y ejecución de tu participación (art. 6.1.b RGPD), tu consentimiento (art.
              6.1.a) y, para la persona de contacto de emergencia, el interés vital del participante y el interés
              legítimo del organizador (art. 6.1.d y 6.1.f).
            </dd>
            <dt className="font-semibold text-[var(--ink)]">Destinatarios</dt>
            <dd className="text-[var(--text-dim)]">
              No se ceden datos a terceros salvo obligación legal o para el seguro de la prueba. Usamos proveedores
              tecnológicos como encargados del tratamiento; hay transferencias a Estados Unidos con las garantías
              que se detallan abajo.
            </dd>
            <dt className="font-semibold text-[var(--ink)]">Derechos</dt>
            <dd className="text-[var(--text-dim)]">
              Acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a <Mail />.
            </dd>
          </dl>
          <p className="mt-3 text-sm text-[var(--text-faint)]">Información adicional, más abajo en esta página.</p>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <Section title="Responsable del tratamiento">
            <p>{ORGANIZER.legalName}</p>
            <p>NIF: {ORGANIZER.nif}</p>
            <p>
              Contacto para cualquier cuestión sobre tus datos: <Mail />.
            </p>
          </Section>

          <Section title="Qué datos tratamos y de dónde proceden">
            <p>Todos los datos nos los facilitas tú al rellenar el formulario:</p>
            <List>
              <li>Identificación y contacto: nombre, apellidos, DNI/NIE, fecha de nacimiento, dirección, email y teléfono.</li>
              <li>Talla de camiseta, modalidad elegida, club (si lo indicas) y si estás federado.</li>
              <li>El teléfono de una persona de contacto para casos de emergencia (dato de un tercero, ver más abajo).</li>
              <li>Si eres menor de 16 o 17 años, la autorización firmada de tu padre, madre o tutor legal, que se entrega en persona.</li>
            </List>
            <p>
              No recogemos datos de salud ni datos de pago en este formulario. La licencia federativa no se sube a la
              web: se enseña en persona el día de la carrera.
            </p>
          </Section>

          <Section title="Para qué los usamos">
            <List>
              <li>Gestionar tu preinscripción y reservarte la talla de camiseta y el acceso a la inscripción anticipada.</li>
              <li>Verificar que cumples los requisitos de participación (edad mínima, autorización de menores, condición de federado).</li>
              <li>Organizar la prueba: dorsales, avituallamiento y seguro del día.</li>
              <li>Comunicarnos contigo sobre tu preinscripción y la carrera.</li>
              <li>Contactar con la persona de emergencia indicada si ocurre algo durante la prueba.</li>
            </List>
            <p>
              No usamos tus datos para enviarte publicidad, no elaboramos perfiles y no tomamos decisiones
              automatizadas sobre ti.
            </p>
          </Section>

          <Section title="Base jurídica">
            <List>
              <li>
                Gestión de la preinscripción y de tu participación: aplicación de medidas precontractuales a petición
                tuya y ejecución de la relación de participación (art. 6.1.b RGPD).
              </li>
              <li>
                Tu consentimiento (art. 6.1.a RGPD), que prestas marcando las dos casillas del formulario: la
                aceptación de esta política y la del tratamiento de tus datos por parte de {ORGANIZER.legalName}. Puedes
                retirarlo en cualquier momento, sin que afecte a lo ya realizado.
              </li>
              <li>
                Teléfono de la persona de contacto: protección del interés vital del participante (art. 6.1.d) y
                interés legítimo del organizador en garantizar la seguridad de la prueba (art. 6.1.f).
              </li>
            </List>
          </Section>

          <Section title="¿Es obligatorio dar los datos?">
            <p>
              Sí, los campos del formulario son necesarios para preinscribirte. Si no los facilitas no podremos
              gestionar tu preinscripción ni reservarte la talla.
            </p>
          </Section>

          <Section title="Persona de contacto de emergencia">
            <p>
              Al facilitar el teléfono de una persona de contacto declaras que le has informado de que lo has
              indicado y de para qué se usará. Ese teléfono se usará únicamente para avisarla si ocurre una
              emergencia durante la prueba, y se conserva durante el mismo plazo que el resto de tus datos.
            </p>
            <p>
              Si eres esa persona de contacto, puedes ejercer tus derechos sobre tu teléfono escribiendo a <Mail />.
            </p>
          </Section>

          <Section title="Menores de edad">
            <p>
              Pueden preinscribirse personas de 16 y 17 años (cumplidos el día de la carrera) con autorización de su
              padre, madre o tutor legal, que debe entregarse firmada en la recogida de dorsal junto con una
              fotocopia de su DNI. La organización conserva esa autorización, con los datos de quien la firma, solo
              para acreditar la participación del menor y durante el mismo plazo que el resto de datos. Por debajo
              de 16 años no se admiten preinscripciones.
            </p>
          </Section>

          <Section title="Destinatarios y encargados del tratamiento">
            <p>
              No cedemos tus datos a terceros, salvo obligación legal (por ejemplo, ante el requerimiento de una
              autoridad competente) o cuando sea necesario para el seguro de la prueba.
            </p>
            <p>Para prestar el servicio usamos estos proveedores, que tratan los datos por nuestra cuenta:</p>
            <List>
              <li>Vercel Inc.: alojamiento de la página web.</li>
              <li>Neon, Inc.: base de datos donde se guardan las preinscripciones.</li>
              <li>Resend (Plus Five Five, Inc.): envío del correo de confirmación.</li>
            </List>
          </Section>

          <Section title="Transferencias internacionales">
            <p>
              Estos tres proveedores son empresas estadounidenses y la base de datos está alojada en Estados Unidos
              (región AWS US East), por lo que tus datos se almacenan y tratan fuera de la Unión Europea. El correo de
              confirmación se envía desde una infraestructura situada en Irlanda.
            </p>
            <p>
              Las transferencias se amparan en las cláusulas contractuales tipo aprobadas por la Comisión Europea
              (art. 46 RGPD) que forman parte de los acuerdos de encargo de tratamiento de cada proveedor. Puedes
              pedirnos más información sobre estas garantías escribiendo a <Mail />.
            </p>
          </Section>

          <Section title="Conservación">
            <p>
              Conservamos tus datos mientras dure la organización de esta edición. Terminada la edición, los datos
              se mantienen bloqueados solo durante el tiempo necesario para atender posibles responsabilidades
              derivadas del tratamiento y después se suprimen. Si más adelante te inscribes, los datos de esa
              inscripción se conservarán además durante los plazos que exija la normativa aplicable a los pagos.
            </p>
          </Section>

          <Section title="Analítica y cookies">
            <p>
              La web usa Vercel Analytics y Vercel Speed Insights para medir las visitas y el rendimiento de forma
              agregada. No utilizamos cookies publicitarias ni de seguimiento. Si accedes con contraseña, se guarda
              una cookie técnica necesaria para recordar que ya has entrado.
            </p>
          </Section>

          <Section title="Tus derechos">
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento
              y portabilidad, y retirar tu consentimiento en cualquier momento, escribiendo a <Mail />. Indica qué
              derecho quieres ejercer y adjunta una copia de tu DNI o documento equivalente para identificarte.
              Responderemos en el plazo máximo de un mes.
            </p>
            <p>
              Si consideras que no hemos atendido tu solicitud correctamente, puedes presentar una reclamación ante
              la Agencia Española de Protección de Datos (
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--pine)] underline underline-offset-2"
              >
                aepd.es
              </a>
              ).
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
