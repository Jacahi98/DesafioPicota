"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registerAction, type RegisterState } from "@/app/preinscripcion/actions";
import {
  MODALITIES,
  ORGANIZER,
  CONTACT_EMAIL,
  SHIRT_SIZES,
  FEDERATED_LICENSE_NOTICE,
  GUARDIAN_AUTH_PATH,
  needsGuardianConsent,
  registrationSchema,
  type Modality,
} from "@/lib/registration";

const initialRegisterState: RegisterState = { status: "idle" };

function GuardianNotice({ compact }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className="rounded-sm border border-[var(--accent-rose)] bg-[var(--paper-raised)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]"
    >
      <p className="font-semibold text-[var(--accent-rose)]">Eres menor de edad: hace falta autorización</p>
      <p className="mt-1 text-[var(--text-dim)]">
        {compact ? "Recuerda llevar" : "Puedes hacer la preinscripción, pero tienes que llevar"} la autorización de tu padre, madre
        o tutor legal <strong className="text-[var(--ink)]">firmada</strong> y entregarla en la{" "}
        <strong className="text-[var(--ink)]">recogida de dorsal</strong>, junto con una fotocopia de su DNI. Sin ese
        documento no se te entregará el dorsal.
      </p>
      <a
        href={GUARDIAN_AUTH_PATH}
        download
        className="mt-2 inline-block font-semibold text-[var(--pine)] underline underline-offset-4"
      >
        Descargar la autorización (PDF)
      </a>
    </div>
  );
}

const STEPS = ["Modalidad", "Federación", "Tus datos", "Resumen"] as const;

type Values = {
  modality: Modality;
  federated: boolean | null;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  emergencyPhone: string;
  shirtSize: string;
  club: string;
  privacyConsent: boolean;
  clubConsent: boolean;
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
  address: "",
  emergencyPhone: "",
  shirtSize: "",
  club: "",
  privacyConsent: false,
  clubConsent: false,
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
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
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
      {hint && <span className="text-xs text-[var(--text-faint)]">{hint}</span>}
    </button>
  );
}

export function RegistrationForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialRegisterState);
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>(emptyValues);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  // Momento en que se abrió el formulario: el servidor descarta envíos
  // imposiblemente rápidos. Input oculto NO controlado y relleno tras montar:
  // el HTML del servidor sale con el campo vacío (sin Date.now() en el render,
  // que daría otro valor en el cliente y un error de hidratación) y no hay
  // setState dentro del efecto. En un input hidden el value es el atributo, así
  // que el reinicio automático del formulario tras cada acción no lo vacía.
  const startedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);
  // Se mide con el reloj del cliente en los dos extremos (carga y clic de envío),
  // así un móvil con la hora mal puesta no falla contra el reloj del servidor.
  const submittedRef = useRef<HTMLInputElement>(null);
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

  // Valida con el MISMO esquema que el servidor, pero solo los campos del
  // paso actual: así el mensaje que ves aquí es el que daría el servidor.
  function validateStep(): boolean {
    if (step === 1 && v.federated === null) {
      setClientErrors({ federated: "Elige una opción" });
      return false;
    }
    if (step === 2) {
      const result = registrationSchema.safeParse({ ...v, federated: v.federated ?? false, privacyConsent: true, clubConsent: true });
      const fields = ["firstName", "lastName", "dni", "birthDate", "email", "phone", "address", "emergencyPhone", "shirtSize", "club"];
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
      {(
        ["firstName", "lastName", "dni", "birthDate", "email", "phone", "address", "emergencyPhone", "shirtSize", "club"] as const
      ).map((k) => (
        <input key={k} type="hidden" name={k} value={v[k]} />
      ))}
      {v.privacyConsent && <input type="hidden" name="privacyConsent" value="on" />}
      {v.clubConsent && <input type="hidden" name="clubConsent" value="on" />}
      <input ref={startedRef} type="hidden" name="startedAt" />
      <input ref={submittedRef} type="hidden" name="submittedAt" />
      {/* Trampa para bots: fuera de pantalla (no display:none, que los bots
          detectan), fuera del orden de tabulación y oculta a lectores de
          pantalla. Una persona nunca la rellena. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      >
        <input type="text" name="hp_trap_field" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

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
              hint="Tendrás que acreditarla el día de la carrera"
            />
            <Choice
              selected={v.federated === false}
              onClick={() => set("federated", false)}
              title="No estoy federado"
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
          {v.federated && (
            <div
              role="note"
              className="rounded-sm border border-[var(--accent-rose)] bg-[var(--paper-raised)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]"
            >
              <p className="font-semibold text-[var(--accent-rose)]">Federado: lleva tu licencia</p>
              <p className="mt-1 text-[var(--text-dim)]">{FEDERATED_LICENSE_NOTICE}</p>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
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
            {needsGuardianConsent(v.birthDate) && (
              <div className="sm:col-span-2">
                <GuardianNotice />
              </div>
            )}
            <div className="sm:col-span-2">
              <Field label="Dirección" name="address" error={errors.address}>
                <input
                  id="address"
                  value={v.address}
                  onChange={(e) => set("address", e.target.value)}
                  autoComplete="street-address"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
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
            </div>
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
            {/* autoComplete="off": si no, el navegador rellenaría el teléfono propio. */}
            <Field label="Teléfono de emergencia" name="emergencyPhone" error={errors.emergencyPhone}>
              <input
                id="emergencyPhone"
                type="tel"
                value={v.emergencyPhone}
                onChange={(e) => set("emergencyPhone", e.target.value)}
                placeholder="600123456"
                autoComplete="off"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--text-faint)]">
                Solo se usará para avisar a esta persona en una emergencia durante la prueba. Debes haberle informado.
              </p>
            </Field>
            <Field label="Talla de camiseta" name="shirtSize" error={errors.shirtSize}>
              <select
                id="shirtSize"
                value={v.shirtSize}
                onChange={(e) => set("shirtSize", e.target.value)}
                className={inputClass}
              >
                <option value="">Elige tu talla</option>
                {SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {shownStep === 3 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Resumen</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-5 py-4 text-sm">
            <dt className="text-[var(--text-faint)]">Corredor</dt>
            <dd className="text-[var(--ink)]">
              {v.firstName} {v.lastName}
            </dd>
            <dt className="text-[var(--text-faint)]">Modalidad</dt>
            <dd className="text-[var(--ink)]">{MODALITIES[v.modality].label}</dd>
            <dt className="text-[var(--text-faint)]">Talla de camiseta</dt>
            <dd className="text-[var(--ink)]">{v.shirtSize}</dd>
            <dt className="text-[var(--text-faint)]">Federación</dt>
            <dd className="text-[var(--ink)]">{v.federated ? "Federado" : "No federado"}</dd>
          </dl>
          {needsGuardianConsent(v.birthDate) && <GuardianNotice compact />}

          <div className="rounded-sm border border-[var(--border)] bg-[var(--paper-raised)] px-4 py-3 text-xs leading-relaxed text-[var(--text-dim)]">
            <p className="font-semibold text-[var(--ink)]">Información básica sobre protección de datos</p>
            <p className="mt-1">
              <strong className="text-[var(--ink)]">Responsable:</strong> {ORGANIZER.legalName} ({ORGANIZER.nif}).{" "}
              <strong className="text-[var(--ink)]">Finalidad:</strong> gestionar tu preinscripción, organizar la prueba
              y atender emergencias durante la carrera.{" "}
              <strong className="text-[var(--ink)]">Legitimación:</strong> tu consentimiento y la ejecución de tu
              participación.{" "}
              <strong className="text-[var(--ink)]">Destinatarios:</strong> no se ceden datos salvo obligación legal o
              seguro; proveedores tecnológicos con transferencia a EE. UU. con cláusulas contractuales tipo.{" "}
              <strong className="text-[var(--ink)]">Derechos:</strong> acceso, rectificación, supresión, oposición,
              limitación y portabilidad en {CONTACT_EMAIL}.{" "}
              <a href="/privacidad" target="_blank" className="font-semibold text-[var(--pine)] underline underline-offset-2">
                Información adicional
              </a>
              .
            </p>
          </div>

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
              .
            </span>
          </label>
          {errors.privacyConsent && <p className="text-xs text-[var(--accent-rose)]">{errors.privacyConsent}</p>}

          <label className="flex items-start gap-3 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={v.clubConsent}
              onChange={(e) => set("clubConsent", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--pine)]"
            />
            <span>
              Acepto el tratamiento y la recogida de mis datos personales por parte de {ORGANIZER.legalName}, el grupo
              deportivo organizador de la prueba, para gestionar mi participación.
            </span>
          </label>
          {errors.clubConsent && <p className="text-xs text-[var(--accent-rose)]">{errors.clubConsent}</p>}

          {state.status === "error" && state.formError && (
            <p className="rounded-sm border border-[var(--accent-rose)] bg-[var(--paper-raised)] px-4 py-3 text-sm text-[var(--accent-rose)]">
              {state.formError}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-end">
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
              onClick={() => {
                if (submittedRef.current) submittedRef.current.value = String(Date.now());
              }}
              disabled={isPending || !v.privacyConsent || !v.clubConsent}
              className="rounded-sm bg-[var(--pine)] px-6 py-3 text-sm font-semibold text-[var(--pine-ink)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Enviando…" : "Enviar preinscripción"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
