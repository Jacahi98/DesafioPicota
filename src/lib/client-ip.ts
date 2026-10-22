// IP del cliente para los límites por IP. En Vercel x-vercel-forwarded-for lo
// pone la plataforma (el cliente no puede falsificarlo); el resto son respaldo
// para local. Mismo orden que api/gate/route.ts (que no se toca para
// reutilizar esto: la puerta de contraseña se retira al lanzar).
export function clientIp(h: Pick<Headers, "get">): string {
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}
