// Explicación visual de cómo funcionarán las inscripciones (DEMO para aprobar: no se sube hasta que Javier lo diga).
// A propósito sin cifras de plazas ni detalle del formulario: eso se cuenta cuando toca.
import { Ticket, Users, Hourglass } from "lucide-react";

const STEPS = [
  {
    when: "13 de enero",
    title: "Primero, los preinscritos",
    text: "Tu plaza está guardada. Entra con tu localizador y termina tu inscripción un día antes que nadie.",
    icon: Ticket,
    color: "var(--pine)",
  },
  {
    when: "14 de enero",
    title: "Se abre para todo el mundo",
    text: "Hay un número cerrado de plazas a rellenar. Si se cubren todas, entras en una cola de espera.",
    icon: Users,
    color: "var(--accent-rose)",
  },
  {
    when: "Unos meses después",
    title: "Cola de espera",
    text: "Las plazas guardadas para preinscritos que al final no se usen se ofrecen a la cola, por orden.",
    icon: Hourglass,
    color: "var(--sea)",
  },
];

export function InscriptionFormat() {
  return (
    <section aria-label="Cómo serán las inscripciones" className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-7 sm:px-8">
      <ol className="relative space-y-7 pl-14 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative">
              <span
                className="absolute -left-14 top-0 flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[var(--paper-raised)]"
                style={{ borderColor: step.color, color: step.color }}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: step.color }}>
                {step.when}
              </p>
              <h3 className="mt-0.5 text-[17px] font-semibold text-[var(--ink)]">{step.title}</h3>
              <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-[var(--text-dim)]">{step.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
