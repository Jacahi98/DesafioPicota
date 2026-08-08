"use client";

import { useActionState, useState } from "react";
import { registerAction, type RegisterState } from "@/app/inscripcion/actions";
import { MODALITIES, REGISTRATION_DEADLINE, formatPrice, type Modality } from "@/lib/registration";

const initialRegisterState: RegisterState = { status: "idle" };

const deadlineLabel = REGISTRATION_DEADLINE.toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">{label}</span>
      {children}
      {error && <span className="text-xs text-[var(--accent-rose)]">{error}</span>}
    </label>
  );
}

const inputClass =
  "rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--pine)]";

export function RegistrationForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialRegisterState);
  const [modality, setModality] = useState<Modality>("trekking");
  const errors = state.status === "error" ? state.errors ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sea)]">Modalidad</span>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(MODALITIES) as [Modality, (typeof MODALITIES)[Modality]][]).map(
            ([key, mod]) => (
              <button
                key={key}
                type="button"
                onClick={() => setModality(key)}
                aria-pressed={modality === key}
                className={`flex flex-col items-start gap-0.5 rounded-sm border px-4 py-3 text-left transition-colors ${
                  modality === key
                    ? "border-[var(--pine)] bg-[var(--paper-raised)]"
                    : "border-[var(--border)] bg-transparent hover:border-[var(--pine)]"
                }`}
              >
                <span className="font-semibold text-[var(--ink)]">{mod.label}</span>
                <span className="font-mono text-sm text-[var(--text-dim)]">{formatPrice(mod.priceCents)}</span>
              </button>
            )
          )}
        </div>
        <input type="hidden" name="modality" value={modality} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" name="firstName" error={errors.firstName}>
          <input id="firstName" name="firstName" autoComplete="given-name" required className={inputClass} />
        </Field>
        <Field label="Apellidos" name="lastName" error={errors.lastName}>
          <input id="lastName" name="lastName" autoComplete="family-name" required className={inputClass} />
        </Field>
        <Field label="DNI / NIE" name="dni" error={errors.dni}>
          <input id="dni" name="dni" placeholder="12345678A" required className={inputClass} />
        </Field>
        <Field label="Fecha de nacimiento" name="birthDate" error={errors.birthDate}>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            autoComplete="bday"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Email" name="email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <Field label="Teléfono" name="phone" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="600123456"
            autoComplete="tel"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Club (opcional)" name="club" error={errors.club}>
          <input id="club" name="club" className={inputClass} />
        </Field>
      </div>

      <label className="flex items-start gap-3 text-sm text-[var(--text-dim)]">
        <input
          type="checkbox"
          name="privacyConsent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--pine)]"
        />
        <span>
          He leído y acepto la{" "}
          <a href="/privacidad" target="_blank" className="text-[var(--pine)] underline underline-offset-2">
            política de privacidad
          </a>
          . Entiendo que la inscripción es definitiva y que no hay devolución del importe.
        </span>
      </label>
      {errors.privacyConsent && <p className="text-xs text-[var(--accent-rose)]">{errors.privacyConsent}</p>}

      {state.status === "error" && state.formError && (
        <p className="rounded-sm border border-[var(--accent-rose)] bg-[var(--paper-raised)] px-4 py-3 text-sm text-[var(--accent-rose)]">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-[var(--text-faint)]">
          Plazo de inscripción hasta el {deadlineLabel}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Enviando…" : "Confirmar inscripción"}
        </button>
      </div>
    </form>
  );
}
