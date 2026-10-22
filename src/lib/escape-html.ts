// Los valores que escribe el usuario (nombre, club, email…) acaban dentro
// del HTML del email: sin escapar, un "<" o un "&" rompería el correo o
// inyectaría marcado. Se escapan SIEMPRE todos los valores de usuario, no
// solo los que "parecen" peligrosos. Vive en su propio fichero, sin imports,
// para poder probarlo suelto (sin Resend, sin BD).
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
