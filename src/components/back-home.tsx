import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--pine)] transition-colors hover:text-[var(--accent-rose)]"
    >
      <ArrowLeft size={14} /> Volver al inicio
    </Link>
  );
}
