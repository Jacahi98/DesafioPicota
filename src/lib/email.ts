import { Resend } from "resend";
import { MODALITIES, GUARDIAN_AUTH_PATH, FEDERATED_LICENSE_SHORT, CONTACT_EMAIL, type Modality } from "@/lib/registration";
import { escapeHtml } from "@/lib/escape-html";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Los enlaces de un email tienen que ser absolutos.
const GUARDIAN_AUTH_URL = `https://desafiopicota.com${GUARDIAN_AUTH_PATH}`;

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
  rose: "#a9353a",
};

// label y value llegan como texto plano y se escapan AQUÍ, en el único sitio
// por el que pasan las filas, para que ningún valor del usuario (nombre, club,
// email…) llegue al HTML sin pasar por escapeHtml. word-break evita que un
// email largo sin espacios ensanche la tabla en clientes estrechos.
function row(label: string, value: string, { strong = false } = {}) {
  return `
    <tr>
      <td style="padding:11px 0;border-top:1px solid ${COLOR.border};font:600 11px/1.4 -apple-system,Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${COLOR.textDim};white-space:nowrap;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:11px 0;border-top:1px solid ${COLOR.border};text-align:right;word-break:break-word;font:${strong ? "700" : "400"} 15px/1.4 ui-monospace,'IBM Plex Mono',Menlo,monospace;color:${COLOR.ink};">
        ${escapeHtml(value)}
      </td>
    </tr>`;
}

type ConfirmationParams = {
  to: string;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  phone: string;
  emergencyPhone: string;
  shirtSize?: string | null;
  address: string;
  club?: string | null;
  modality: Modality;
  federated: boolean;
  paymentReference: string;
  guardianConsent: boolean;
};

type Detail = [label: string, value: string];

// Las mismas filas, en el mismo orden, que la página de confirmación
// (src/app/preinscripcion/confirmacion/[reference]/page.tsx). Un único origen
// para el HTML y para el texto plano del email.
function detailRows(params: ConfirmationParams): Detail[] {
  // birthDate llega como "YYYY-MM-DD": en UTC para que la zona horaria del
  // servidor no mueva el día.
  const birthDateLabel = new Date(params.birthDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const rows: Detail[] = [
    ["Localizador", params.paymentReference],
    ["Modalidad", MODALITIES[params.modality].label],
    ["Nombre", `${params.firstName} ${params.lastName}`],
    ["DNI/NIE", params.dni],
    ["Fecha de nacimiento", birthDateLabel],
    ["Email", params.to],
    ["Teléfono", params.phone],
  ];
  // Como en la página: una fila vacía no se muestra.
  if (params.emergencyPhone) rows.push(["Teléfono de emergencia", params.emergencyPhone]);
  if (params.address) rows.push(["Dirección", params.address]);
  if (params.shirtSize) rows.push(["Talla de camiseta", params.shirtSize]);
  if (params.club) rows.push(["Club", params.club]);
  rows.push(["Federación", params.federated ? "Federado" : "No federado"]);
  if (params.federated) rows.push(["Licencia federativa", FEDERATED_LICENSE_SHORT]);
  return rows;
}

function confirmationHtml(params: ConfirmationParams) {
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
                  Speed trail · Liencres, Cantabria
                </p>
                <h1 style="margin:0 0 24px 0;font:700 22px/1.25 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.ink};">
                  Hemos recibido tu preinscripción con los siguientes datos
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailRows(params)
                    .map(([label, value], i) => row(label, value, { strong: i === 0 }))
                    .join("")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;">
                <p style="margin:0 0 16px 0;font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.ink};">
                  Guarda este correo: el código localizador <strong>${escapeHtml(params.paymentReference)}</strong> es el
                  que tendrás que usar en la inscripción para acreditar que estás preinscrito.
                </p>${
                params.guardianConsent
                  ? `
                <p style="margin:0;padding:12px 14px;border:1px solid ${COLOR.rose};font:400 14px/1.6 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.ink};">
                  <strong>Eres menor de edad:</strong> tienes que llevar la autorización de tu padre, madre o tutor legal
                  firmada y entregarla en la recogida de dorsal, junto con una fotocopia de su DNI.
                  <a href="${GUARDIAN_AUTH_URL}" style="color:${COLOR.pine};">Descargar la autorización (PDF)</a>.
                </p>`
                  : ""
              }
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font:400 12px/1.5 -apple-system,Helvetica,Arial,sans-serif;color:${COLOR.textFaint};">
            Referencia ${escapeHtml(params.paymentReference)} · Desafío Picota, Liencres
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendConfirmationEmail(params: ConfirmationParams) {
  // Sin dominio propio verificado en Resend, la cuenta está en modo sandbox:
  // solo se pueden enviar emails a la dirección del propio titular de la
  // cuenta Resend, no a quienes hacen la preinscripción. Se intenta igualmente —
  // si falla, la preinscripción ya está guardada en la base de datos y la página
  // de confirmación muestra los mismos datos, así que no se pierde nada —
  // solo no llega el correo hasta verificar un dominio real.
  try {
    await getResend().emails.send({
      // Remitente configurable: con el dominio desafiopicota.com verificado en
      // Resend se define EMAIL_FROM (p. ej. "Desafío Picota <preinscripcion@desafiopicota.com>")
      // en Vercel; sin ella se usa el remitente de pruebas de Resend.
      from: process.env.EMAIL_FROM || "Desafío Picota <onboarding@resend.dev>",
      to: params.to,
      // Quien responda al correo escribe al buzón de contacto de Gmail.
      replyTo: CONTACT_EMAIL,
      subject: `Preinscripción recibida — ${params.paymentReference}`,
      html: confirmationHtml(params),
      text: [
        `Hola ${params.firstName},`,
        "",
        "Hemos recibido tu preinscripción al Desafío Picota con los siguientes datos:",
        "",
        ...detailRows(params).map(([label, value]) => `  ${label}: ${value}`),
        "",
        `Guarda este correo: el código localizador ${params.paymentReference} es el que tendrás que usar en la inscripción para acreditar que estás preinscrito.`,
        "",
        ...(params.guardianConsent
          ? [
              "Eres menor de edad: tienes que llevar la autorización de tu padre, madre o tutor legal firmada y entregarla en la recogida de dorsal, junto con una fotocopia de su DNI.",
              `Descárgala aquí: ${GUARDIAN_AUTH_URL}`,
              "",
            ]
          : []),
        "— Desafío Picota",
      ].join("\n"),
    });
  } catch (err) {
    console.error("No se pudo enviar el email de confirmación", err);
  }
}
