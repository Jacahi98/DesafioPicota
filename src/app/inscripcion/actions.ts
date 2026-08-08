"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";
import {
  registrationSchema,
  MODALITIES,
  isRegistrationOpen,
  generatePaymentReference,
} from "@/lib/registration";
import { sendConfirmationEmail } from "@/lib/email";

export type RegisterState = {
  status: "idle" | "error";
  errors?: Partial<Record<string, string>>;
  formError?: string;
};

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  if (!isRegistrationOpen()) {
    return { status: "error", formError: "El plazo de inscripción ya se ha cerrado." };
  }

  const raw = {
    modality: formData.get("modality"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    club: formData.get("club"),
    privacyConsent: formData.get("privacyConsent") === "on",
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
  const db = getDb();

  let reference = "";
  let inserted = false;
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    reference = generatePaymentReference();
    try {
      await db.insert(registrations).values({
        modality: data.modality,
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        birthDate: data.birthDate,
        email: data.email,
        phone: data.phone,
        club: data.club || null,
        priceCents: MODALITIES[data.modality].priceCents,
        paymentReference: reference,
        privacyConsentAt: new Date(),
      });
      inserted = true;
    } catch (err) {
      // Colisión de referencia (extremadamente improbable) — reintenta con
      // una nueva. Cualquier otro error de inserción sube tal cual.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("payment_reference") || attempt === 4) throw err;
    }
  }

  await sendConfirmationEmail({
    to: data.email,
    firstName: data.firstName,
    modality: data.modality,
    paymentReference: reference,
  });

  redirect(`/inscripcion/confirmacion/${reference}`);
}
