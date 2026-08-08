import { Resend } from "resend";
import { MODALITIES, BANK_TRANSFER, REGISTRATION_DEADLINE, formatPrice, type Modality } from "@/lib/registration";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const deadlineLabel = REGISTRATION_DEADLINE.toLocaleDateString("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Paleta calcada de globals.css (tema claro) — el email no puede leer las
// custom properties del sitio, así que los valores van repetidos aquí a
// mano. Un único tema claro a propósito: el soporte de prefers-color-scheme
// en clientes de correo es demasiado desigual (Outlook lo ignora, Gmail solo
// a veces) para fiarse de un email adaptable de verdad.
const COLOR = {
  paper: "#f4ddb8",
  paperRaised: "#faecd4",
  border: "#dcb787",
  ink: "#4a1010",
  textDim: "#7a3624",
  textFaint: "#96755c",
  pine: "#621719",
  pineInk: "#f4ddb8",
};

function row(label: string, value: string, { strong = false } = {}) {
  return `
    <tr>
      <td style="padding:11px 0;border-top:1px solid ${COLOR.border};font:600 11px/1.4 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${COLOR.textDim};white-space:nowrap;">
        ${label}
      </td>
      <td style="padding:11px 0;border-top:1px solid ${COLOR.border};text-align:right;font:${strong ? "700" : "400"} 15px/1.4 ui-monospace,'IBM Plex Mono',Menlo,monospace;color:${COLOR.ink};">
        ${value}
      </td>
    </tr>`;
}

function confirmationHtml(params: { firstName: string; modality: Modality; paymentReference: string; price: string }) {
  const modalityLabel = MODALITIES[params.modality].label;
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:${COLOR.paper};font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${COLOR.paperRaised};border:1px solid ${COLOR.border};border-radius:4px;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font:800 13px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${COLOR.pine};">
                  Desafío Picota
                </p>
                <p style="margin:0 0 24px 0;font:600 10px/1 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.textFaint};">
                  Trail run · Liencres, Cantabria
                </p>
                <h1 style="margin:0 0 12px 0;font:700 22px/1.25 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.ink};">
                  Inscripción recibida
                </h1>
                <p style="margin:0 0 24px 0;font:400 15px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.textDim};">
                  Hola ${params.firstName}, hemos recibido tu inscripción en ${modalityLabel}. Tu plaza queda reservada en
                  cuanto hagamos la transferencia con estos datos.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("IBAN", BANK_TRANSFER.iban)}
                  ${row("Titular", BANK_TRANSFER.holder)}
                  ${row("Importe", params.price, { strong: true })}
                  ${row("Concepto (obligatorio)", params.paymentReference, { strong: true })}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <p style="margin:0 0 10px 0;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.textDim};">
                  Indica el concepto exactamente como aparece arriba — es lo que usamos para identificar tu pago.
                  Plazo: antes del ${deadlineLabel}.
                </p>
                <p style="margin:0;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.textDim};">
                  Las inscripciones son definitivas y no tienen devolución.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font:400 12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.textFaint};">
            Referencia ${params.paymentReference} · Desafío Picota, Liencres
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendConfirmationEmail(params: {
  to: string;
  firstName: string;
  modality: Modality;
  paymentReference: string;
}) {
  const price = formatPrice(MODALITIES[params.modality].priceCents);

  // Sin dominio propio verificado en Resend, la cuenta está en modo sandbox:
  // solo se pueden enviar emails a la dirección del propio titular de la
  // cuenta Resend, no a los inscritos reales. Se intenta igualmente — si
  // falla, la inscripción ya está guardada en la base de datos y la página
  // de confirmación muestra las mismas instrucciones, así que no se pierde
  // nada — solo no llega el correo hasta verificar un dominio real.
  try {
    await getResend().emails.send({
      from: "Desafío Picota <onboarding@resend.dev>",
      to: params.to,
      subject: `Inscripción recibida — ${params.paymentReference}`,
      html: confirmationHtml({
        firstName: params.firstName,
        modality: params.modality,
        paymentReference: params.paymentReference,
        price,
      }),
      text: [
        `Hola ${params.firstName},`,
        "",
        `Hemos recibido tu inscripción al Desafío Picota (modalidad ${MODALITIES[params.modality].label}, ${price}).`,
        "",
        "Para confirmarla, haz una transferencia bancaria con estos datos:",
        `  IBAN: ${BANK_TRANSFER.iban}`,
        `  Titular: ${BANK_TRANSFER.holder}`,
        `  Importe: ${price}`,
        `  Concepto: ${params.paymentReference}`,
        "",
        `Plazo: antes del ${deadlineLabel}. Es imprescindible indicar el concepto exacto para poder identificar tu pago.`,
        "",
        "Las inscripciones son definitivas y no tienen devolución.",
        "",
        "— Desafío Picota",
      ].join("\n"),
    });
  } catch (err) {
    console.error("No se pudo enviar el email de confirmación", err);
  }
}
