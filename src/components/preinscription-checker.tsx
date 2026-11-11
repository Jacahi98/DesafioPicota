"use client";

import { useActionState } from "react";
import { checkPreinscriptionAction, type CheckState } from "@/app/preinscripcion/check-actions";
import { CONTACT_EMAIL } from "@/lib/registration";

const initialState: CheckState = { status: "idle" };

const inputClass =
  "w-full rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3.5 py-2.5 font-mono text-[15px] uppercase tracking-wider text-[var(--ink)] outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--text-faint)] focus:border-[var(--pine)]";

export function PreinscriptionChecker() {
  const [state, formAction, isPending] = useActionState(checkPreinscriptionAction, initialState);

  return (
    <section aria-labelledby="comprobar-titulo" className="mt-10 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-5">
      <h2 id="comprobar-titulo" className="text-lg font-semibold text-[var(--ink)]">
        Comprueba tu preinscripción
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-dim)]">
        Escribe tu localizador, el mismo que tendrás que usar en la inscripción del 13 o 14 de enero, y te diremos si estás preinscrito.
      </p>

      <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="reference" className="sr-only">
            Localizador
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Comprobando…" : "Comprobar"}
        </button>
      </form>

      <div aria-live="polite" className="mt-4 text-sm leading-relaxed">
        {state.status === "found" && (
          <p className="rounded-sm border border-[var(--pine)] px-4 py-3 text-[var(--ink)]">
            <strong>Sí, estás preinscrito.</strong> Guarda tu localizador: lo necesitarás para inscribirte el 13 de enero, un día antes de que abran las
            inscripciones para todo el mundo.
          </p>
        )}
        {(state.status === "notfound" || state.status === "invalid") && (
          <p className="rounded-sm border border-[var(--accent-rose)] px-4 py-3 text-[var(--ink)]">
            <strong>No encontramos ese localizador.</strong> Revisa que esté bien escrito. Si crees que deberías estar
            preinscrito, escríbenos a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--pine)] underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}
        {state.status === "limited" && (
          <p className="text-[var(--accent-rose)]">Demasiados intentos. Inténtalo de nuevo en unos minutos.</p>
        )}
        {state.status === "error" && (
          <p className="text-[var(--accent-rose)]">No hemos podido comprobarlo ahora mismo. Inténtalo de nuevo en un momento.</p>
        )}
      </div>
    </section>
  );
}
