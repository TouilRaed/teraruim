import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { isAdmin, ipAllowed, verifyPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function Setup2FAPage({ searchParams }: { searchParams: Promise<{ pwd?: string }> }) {
  if (!(await ipAllowed())) notFound();

  const sp = await searchParams;
  const authed = (await isAdmin()) || verifyPassword(sp.pwd ?? "");
  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20 card p-6">
        <h1 className="text-xl font-bold mb-3">2FA setup</h1>
        <p className="text-sm text-zinc-500 mb-3">Fournir le mot de passe admin pour afficher le QR.</p>
        <form method="GET" className="space-y-3">
          <input name="pwd" type="password" placeholder="Mot de passe admin" className="input" required autoFocus />
          <button className="btn-primary w-full">Afficher le QR</button>
        </form>
      </div>
    );
  }

  const secret = process.env.ADMIN_TOTP_SECRET ?? "";
  if (!secret) {
    return (
      <div className="max-w-md mx-auto mt-20 card p-6">
        <h1 className="text-xl font-bold mb-3">2FA désactivé</h1>
        <p className="text-sm">Configure <code>ADMIN_TOTP_SECRET</code> dans <code>.env</code> puis redémarre.</p>
      </div>
    );
  }

  const uri = `otpauth://totp/Teraruim:admin?secret=${secret}&issuer=Teraruim&algorithm=SHA1&digits=6&period=30`;
  const svg = await QRCode.toString(uri, { type: "svg", margin: 1, width: 280, errorCorrectionLevel: "M" });

  return (
    <div className="max-w-md mx-auto mt-10 card p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Configurer 2FA</h1>
      <p className="text-sm text-zinc-500 mb-4">Scanne avec Google Authenticator / Authy / Microsoft Authenticator.</p>
      <div className="bg-white p-3 inline-block rounded" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="mt-4 text-left">
        <p className="text-xs text-zinc-500">Saisie manuelle (clé secrète) :</p>
        <p className="font-mono text-xs break-all bg-zinc-100 dark:bg-zinc-800 p-2 rounded mt-1">{secret}</p>
        <p className="text-xs text-zinc-500 mt-3">Type : Time-based · Algo : SHA1 · Digits : 6 · Period : 30s</p>
        <p className="text-xs text-amber-600 mt-3">⚠️ Sauvegarde cette clé dans un gestionnaire de mots de passe. Sans elle, perte du téléphone = perte d&apos;accès.</p>
      </div>
    </div>
  );
}
