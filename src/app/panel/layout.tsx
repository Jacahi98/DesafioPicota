import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MatrixRain } from "@/components/matrix-rain";
import { ADMIN_PROXY_HEADER } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Solo proxy.ts puede poner esta cabecera (la borra de toda petición
  // entrante antes de decidir si la vuelve a añadir), así que una visita
  // directa a /panel -- sin pasar por la ruta secreta -- no la trae.
  const h = await headers();
  if (h.get(ADMIN_PROXY_HEADER) !== "1") {
    notFound();
  }

  return (
    <div className="admin-terminal flex min-h-svh flex-col">
      <MatrixRain />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
