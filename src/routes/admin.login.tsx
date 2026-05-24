import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, LogIn } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Login Admin — Cave League" }] }),
});

function AdminLogin() {
  const { signIn, session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) navigate({ to: "/admin" });
  }, [loading, session, isAdmin, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { toast.error("Login fallito", { description: res.error }); return; }
    toast.success("Accesso effettuato");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Torna al pubblico
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border bg-card p-6 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cave League</div>
            <h1 className="text-2xl font-black mt-1">Accesso admin</h1>
            <p className="text-xs text-muted-foreground mt-1">Solo l'account autorizzato può accedere.</p>
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</span>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 bg-background border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</span>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 bg-background border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" /> {busy ? "Accesso…" : "Entra"}
          </button>
          {session && !isAdmin && (
            <p className="text-xs text-destructive text-center">Account autenticato ma non autorizzato come admin.</p>
          )}
        </form>
      </div>
    </div>
  );
}
