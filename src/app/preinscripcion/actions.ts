"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  registrationSchema,
  isRegistrationOpen,
  registrationPhase,
  generatePaymentReference,
  needsGuardianConsent,
  PLAZAS_MAX,
  REG_WINDOW_MIN,
  REG_MAX_PER_IP,
  REG_MIN_FILL_MS,
} from "@/lib/registration";
import { sendConfirmationEmail } from "@/lib/email";
import { clientIp } from "@/lib/client-ip";
import { tooManyAttempts, recordAttempt } from "@/lib/rate-limit";
import { countActiveRegistrations, insertRegistrationIfRoom, uniqueViolationOf } from "@/lib/register-db";

export type RegisterState = {
  status: "idle" | "error";
  errors?: Partial<Record<string, string>>;
  formError?: string;
};

// Genérico a propósito: no le dice a un bot cuál de las dos trampas lo ha parado.
const GENERIC_ERROR = "No se ha podido enviar el formulario. Inténtalo de nuevo.";
// Neutro a propósito (decisión de Javier): nunca revela que un DNI ya existe.
const NEUTRAL_ERROR = "No se ha podido registrar esta preinscripción. Si ya la hiciste, usa tu localizador.";

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // 1) Cierre.
  if (!isRegistrationOpen()) {
    return {
      status: "error",
      formError:
        registrationPhase() === "before"
          ? "Las preinscripciones todavía no están abiertas."
          : "El plazo de preinscripción ya se ha cerrado.",
    };
  }

  // 2) Honeypot: un campo que una persona no ve y un bot suele rellenar. Antes
  // de cualquier consulta a la BD.
  const trap = formData.get("hp_trap_field");
  if (trap !== null && trap !== "") return { status: "error", formError: GENERIC_ERROR };

  // 3) Tiempo mínimo de relleno. Number(null) y Number("") dan 0 (finito), así
  // que la ausencia se trata aparte; un valor futuro/negativo también falla.
  // Ambos instantes vienen del reloj del cliente: lo que cuenta es la diferencia.
  const toMs = (raw: FormDataEntryValue | null) =>
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  const startedAt = toMs(formData.get("startedAt"));
  const submittedAt = toMs(formData.get("submittedAt"));
  if (!Number.isFinite(startedAt) || !Number.isFinite(submittedAt) || submittedAt - startedAt < REG_MIN_FILL_MS) {
    return { status: "error", formError: GENERIC_ERROR };
  }

  // 4) Límite por IP. Si ya está pasada, el intento NO se registra.
  const ip = clientIp(await headers());
  if (await tooManyAttempts("reg:", ip, REG_WINDOW_MIN, REG_MAX_PER_IP)) {
    return { status: "error", formError: "Demasiados intentos. Inténtalo de nuevo en unos minutos." };
  }
  await recordAttempt("reg:", ip);

  // 5) Validación (el mismo esquema que usa el formulario).
  const raw = {
    modality: formData.get("modality"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address") ?? "",
    emergencyPhone: formData.get("emergencyPhone") ?? "",
    shirtSize: formData.get("shirtSize") ?? "",
    club: formData.get("club"),
    federated: formData.get("federated") === "yes",
    privacyConsent: formData.get("privacyConsent") === "on",
    clubConsent: formData.get("clubConsent") === "on",
  };

  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
    return { status: "error", errors };
  }

  const data = parsed.data;

  // 6) Alta atómica con aforo y DNI único (ver register-db.ts).
  let reference = "";
  let inserted = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    reference = generatePaymentReference();
    try {
      inserted = await insertRegistrationIfRoom(data, reference, PLAZAS_MAX);
      break;
    } catch (err) {
      const constraint = uniqueViolationOf(err);
      // Red de seguridad ante la carrera: el índice único parcial de DNI
      // (registrations_dni_active_uniq, que ya existe en la Neon) rechaza dos
      // altas del mismo DNI que el WHERE no habría visto; se trata igual que
      // "DNI ya existente": mensaje neutro.
      if (constraint?.includes("registrations_dni_active_uniq")) break;
      // Colisión de referencia (extremadamente improbable): otra referencia.
      if (constraint?.includes("payment_reference") && attempt < 4) continue;
      throw err;
    }
  }

  // 7) Sin fila: o no hay plazas o el DNI ya estaba. Solo se distingue el
  // aforo; lo del DNI nunca se dice.
  if (!inserted) {
    const soldOut = (await countActiveRegistrations()) >= PLAZAS_MAX;
    return {
      status: "error",
      formError: soldOut ? "Las plazas de preinscripción están agotadas." : NEUTRAL_ERROR,
    };
  }

  // El email lleva los mismos datos que la página de confirmación.
  await sendConfirmationEmail({
    to: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    dni: data.dni,
    birthDate: data.birthDate,
    phone: data.phone,
    emergencyPhone: data.emergencyPhone,
    shirtSize: data.shirtSize,
    address: data.address,
    club: data.club || null,
    modality: data.modality,
    federated: data.federated,
    paymentReference: reference,
    guardianConsent: needsGuardianConsent(data.birthDate),
  });

  // redirect() lanza una excepción: fuera de cualquier try/catch.
  redirect(`/preinscripcion/confirmacion/${reference}`);
}
