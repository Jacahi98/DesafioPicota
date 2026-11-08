import { createHash, timingSafeEqual } from "crypto";

// ACCESO DE PRUEBA PRIVADO a la preinscripción, para ensayar el envío completo
// en producción SIN cambiar lo que ve el público: la página /preinscripcion
// sigue mostrando lo que toque según la ventana; solo quien tenga el enlace
// secreto /preinscripcion/prueba/<token> ve el formulario y puede enviarlo
// aunque la ventana esté cerrada.
//
// El repositorio es público, así que aquí solo vive el SHA-256 del token (256
// bits de azar: no se puede deducir el token a partir del hash). El token en
// claro solo lo tiene Javier. Para revocarlo: borrar esta constante (o el
// módulo y la ruta /preinscripcion/prueba) y desplegar.
const TEST_TOKEN_SHA256 = "574320ee14a09921572fa96459e44d2d65c133d0aa9169870d0685c41e578f6b";

export function isValidTestToken(token: unknown): boolean {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) return false;
  const given = createHash("sha256").update(token).digest();
  const expected = Buffer.from(TEST_TOKEN_SHA256, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
