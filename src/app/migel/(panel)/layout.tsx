import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, clearAdminCookie } from "@/lib/admin-auth";
import LiveAlert from "@/components/admin/LiveAlert";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/migel/login");

  async function logout() {
    "use server";
    await clearAdminCookie();
    redirect("/migel/login");
  }

  return (
    <div className="space-y-4">
      <header className="card p-3 flex items-center gap-4 flex-wrap">
        <Link href="/migel" className="font-bold">⚙️ Admin</Link>
        <nav className="flex gap-3 text-sm">
          <Link href="/migel" className="hover:underline">Commandes</Link>
          <Link href="/migel/products" className="hover:underline">Produits</Link>
          <Link href="/migel/products/new" className="hover:underline">+ Nouveau produit</Link>
          <Link href="/migel/audit" className="hover:underline">Audit</Link>
        </nav>
        <form action={logout} className="ml-auto">
          <button className="btn-ghost text-sm">Déconnexion</button>
        </form>
      </header>
      {children}
      <LiveAlert />
    </div>
  );
}
