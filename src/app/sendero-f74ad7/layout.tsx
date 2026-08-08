import { MatrixRain } from "@/components/matrix-rain";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-terminal flex min-h-svh flex-col">
      <MatrixRain />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
