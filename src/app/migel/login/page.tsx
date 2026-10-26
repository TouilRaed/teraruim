import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { isAdmin, ipAllowed, setAdminCookie, verifyPassword } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rateLimit";
import { totpEnabled, verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await ipAllowed())) notFound();
  if (await isAdmin()) redirect("/migel");
  const sp = await searchParams;
  const has2fa = totpEnabled();

  async function action(formData: FormData) {
    "use server";
    if (!(await ipAllowed())) redirect("/migel/login?error=ip");

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const limit = rateLimit(`admin-login:${ip}`, 5, 60_000);
    if (!limit.ok) redirect("/migel/login?error=rate");

    const password = String(formData.get("password") ?? "");
    const code = String(formData.get("code") ?? "");

    if (!verifyPassword(password)) {
      redirect("/migel/login?error=1");
    }
    if (totpEnabled() && !verifyTotp(code)) {
      redirect("/migel/login?error=2fa");
    }
    await setAdminCookie();
    redirect("/migel");
  }

  return (
    <div className="max-w-sm mx-auto mt-20 card p-6">
      <h1 className="text-2xl font-bold mb-1"><span className="text-[var(--coral)]">Koto</span><span className="text-[var(--gold)]">bi</span> · Admin</h1>
      <p className="text-xs text-zinc-500 mb-4">Librairie en ligne</p>
      {sp.error === "rate" && <p className="text-red-500 text-sm mb-3">Trop de tentatives. Réessayez dans 1 minute.</p>}
      {sp.error === "1" && <p className="text-red-500 text-sm mb-3">Mot de passe incorrect</p>}
      {sp.error === "2fa" && <p className="text-red-500 text-sm mb-3">Code 2FA incorrect</p>}
      <form action={action} className="space-y-3">
        <input name="password" type="password" placeholder="Mot de passe admin" className="input" required autoFocus autoComplete="current-password" />
        {has2fa && (
          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="Code 2FA (6 chiffres)"
            className="input tracking-widest text-center font-mono"
            required
            autoComplete="one-time-code"
          />
        )}
        <button className="btn-primary w-full">Se connecter</button>
      </form>
      <p className="text-xs text-zinc-500 mt-4">
        {has2fa ? "🔐 2FA activé. Scanne le QR dans Google Authenticator." : "⚠️ 2FA non configuré."}
      </p>
    </div>
  );
}
