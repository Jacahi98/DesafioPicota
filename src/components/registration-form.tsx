"use client";

import { useActionState, useState } from "react";
import { registerAction, type RegisterState } from "@/app/inscripcion/actions";
import {
  MODALITIES,
  PRICES_CENTS,
  REGISTRATION_DEADLINE,
  formatPrice,
  priceCents,
  registrationSchema,
  type Modality,
} from "@/lib/registration";

const initialRegisterState: RegisterState = { status: "idle" };

const deadlineLabel = REGISTRATION_DEADLINE.toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const STEPS = ["Modalidad", "Federación", "Tus datos", "Pago"] as const;

type Values = {
  modality: Modality;
  federated: boolean | null;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  email: string;
  phone: string;
  club: string;
  licenseNumber: string;
  privacyConsent: boolean;
};

const emptyValues: Values = {
  modality: "trekking",
  federated: null,
  firstName: "",
  lastName: "",
  dni: "",
  birthDate: "",
  email: "",
  phone: "",
  club: "",
  licenseNumber: "",
  privacyConsent: false,
};

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

function Choice({
  selected,
  onClick,
  title,
  price,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  price?: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-0.5 rounded-sm border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[var(--pine)] bg-[var(--paper-raised)]"
          : "border-[var(--border)] bg-transparent hover:border-[var(--pine)]"
      }`}
    >
      <span className="font-semibold text-[var(--ink)]">{title}</span>
      {price && <span className="font-mono text-sm text-[var(--text-dim)]">{price}</span>}
      {hint && <span className="text-xs text-[var(--text-faint)]">{hint}</span>}
    </button>
  );
}

export function RegistrationForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialRegisterState);
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>(emptyValues);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const serverErrors = state.status === "error" ? state.errors ?? {} : {};
  const errors = { ...serverErrors, ...clientErrors };

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setClientErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const price = v.federated === null ? null : priceCents(v.modality, v.federated);

  // Valida con el MISMO esquema que el servidor, pero solo los campos del
  // paso actual: así el mensaje que ves aquí es el que daría el servidor.
  function validateStep(): boolean {
    if (step === 1 && v.federated === null) {
      setClientErrors({ federated: "Elige una opción" });
      return false;
    }
    if (step === 2) {
      const result = registrationSchema.safeParse({ ...v, federated: v.federated ?? false, privacyConsent: true });
      const fields = ["firstName", "lastName", "dni", "birthDate", "email", "phone", "club", "licenseNumber"];
      const found: Record<string, string> = {};
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = String(issue.path[0]);
          if (fields.includes(key) && !found[key]) found[key] = issue.message;
        }
      }
      if (Object.keys(found).length > 0) {
        setClientErrors(found);
        return false;
      }
    }
    setClientErrors({});
    return true;
  }

  const next = () => validateStep() && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Si el servidor devuelve errores de un campo, lleva al paso donde está.
  const serverErrorStep =
    state.status === "error" && Object.keys(serverErrors).length > 0 ? 2 : null;
  const shownStep = serverErrorStep !== null && step === 3 ? serverErrorStep : step;

  return (
    <form action={formAction} className="flex flex-col gap-7">
      {/* Los valores de TODOS los pasos viajan en campos ocultos, así el
          servidor recibe el formulario entero aunque ahora se vea solo un paso. */}
      <input type="hidden" name="modality" value={v.modality} />
      <input type="hidden" name="federated" value={v.federated ? "yes" : "no"} />
      {(["firstName", "lastName", "dni", "birthDate", "email", "phone", "club", "licenseNumber"] as const).map(
        (k) => (
          <input key={k} type="hidden" name={k} value={v[k]} />
        )
      )}
      {v.privacyConsent && <input type="hidden" name="privacyConsent" value="on" />}

      <ol className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === shownStep ? "step" : undefined}
            className={`flex flex-1 flex-col gap-1.5 ${i === shownStep ? "text-[var(--accent-rose)]" : i < shownStep ? "text-[var(--pine)]" : "text-[var(--text-faint)]"}`}
          >
            <span className={`h-0.5 rounded-full ${i <= shownStep ? "bg-current" : "bg-[var(--border)]"}`} />
            <span className="hidden sm:inline">
              {i + 1}. {label}
            </span>
            <span className="sm:hidden">{i + 1}</span>
          </li>
        ))}
      </ol>

      {shownStep === 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-[var(--ink)]">¿Qué modalidad quieres correr?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(MODALITIES) as Modality[]).map((key) => (
              <Choice
                key={key}
                selected={v.modality === key}
                onClick={() => set("modality", key)}
                title={MODALITIES[key].label}
                price={`${formatPrice(PRICES_CENTS[key].federated)} federados · ${formatPrice(PRICES_CENTS[key].standard)} no federados`}
              />
            ))}
          </div>
        </div>
      )}

      {shownStep === 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-[var(--ink)]">¿Estás federado?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              selected={v.federated === true}
              onClick={() => set("federated", true)}
              title="Sí, tengo licencia"
              price={formatPrice(priceCents(v.modality, true))}
              hint="Te pediremos tu número de licencia"
            />
            <Choice
              selected={v.federated === false}
              onClick={() => set("federated", false)}
              title="No estoy federado"
              price={formatPrice(priceCents(v.modality, false))}
            />
          </div>
          {errors.federated && <p className="text-xs text-[var(--accent-rose)]">{errors.federated}</p>}
        </div>
      )}

      {shownStep === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {v.federated ? "Tus datos de federado" : "Tus datos"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {v.federated && (
              <Field label="Nº de licencia federativa" name="licenseNumber" error={errors.licenseNumber}>
                <input
                  id="licenseNumber"
                  value={v.licenseNumber}
                  onChange={(e) => set("licenseNumber", e.target.value)}
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
            )}
            <Field label={v.federated ? "Club" : "Club (opcional)"} name="club" error={errors.club}>
              <input id="club" value={v.club} onChange={(e) => set("club", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Nombre" name="firstName" error={errors.firstName}>
              <input
                id="firstName"
                value={v.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                autoComplete="given-name"
                className={inputClass}
              />
            </Field>
            <Field label="Apellidos" name="lastName" error={errors.lastName}>
              <input
                id="lastName"
                value={v.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                autoComplete="family-name"
                className={inputClass}
              />
            </Field>
            <Field label="DNI / NIE" name="dni" error={errors.dni}>
              <input
                id="dni"
                value={v.dni}
                onChange={(e) => set("dni", e.target.value)}
                placeholder="12345678A"
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de nacimiento" name="birthDate" error={errors.birthDate}>
              <input
                id="birthDate"
                type="date"
                value={v.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                autoComplete="bday"
                className={inputClass}
              />
            </Field>
            <Field label="Email" name="email" error={errors.email}>
              <input
                id="email"
                type="email"
                value={v.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono" name="phone" error={errors.phone}>
              <input
                id="phone"
                type="tel"
                value={v.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="600123456"
                autoComplete="tel"
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      )}

      {shownStep === 3 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Resumen y pago</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm">
            <dt className="text-[var(--text-faint)]">Corredor</dt>
            <dd className="text-[var(--ink)]">
              {v.firstName} {v.lastName}
            </dd>
            <dt className="text-[var(--text-faint)]">Modalidad</dt>
            <dd className="text-[var(--ink)]">{MODALITIES[v.modality].label}</dd>
            <dt className="text-[var(--text-faint)]">Federación</dt>
            <dd className="text-[var(--ink)]">{v.federated ? `Federado · ${v.licenseNumber}` : "No federado"}</dd>
            <dt className="text-[var(--text-faint)]">Importe</dt>
            <dd className="font-mono text-base font-semibold text-[var(--accent-rose)]">
              {price !== null && formatPrice(price)}
            </dd>
          </dl>
          <p className="text-sm text-[var(--text-dim)]">
            El pago se hace por transferencia bancaria: al confirmar verás el IBAN y el concepto exacto que hay
            que indicar.
          </p>

          <label className="flex items-start gap-3 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={v.privacyConsent}
              onChange={(e) => set("privacyConsent", e.target.checked)}
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
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-[var(--text-faint)]">Plazo de inscripción hasta el {deadlineLabel}</p>
        <div className="flex gap-3">
          {shownStep > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-sm border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-dim)] transition-colors hover:border-[var(--pine)] hover:text-[var(--pine)]"
            >
              Atrás
            </button>
          )}
          {shownStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-sm bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPending || !v.privacyConsent}
              className="rounded-sm bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Enviando…" : "Confirmar inscripción"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
