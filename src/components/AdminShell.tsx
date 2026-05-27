import { Link, useRouterState, Navigate } from "@tanstack/react-router";
import { LayoutDashboard, Upload, CalendarCog, Gamepad2, Shield, Users, ArrowLeft, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { BrandFooter } from "@/components/BrandFooter";
import clBlack from "@/assets/logos/cl-black.png";
import clWhite from "@/assets/logos/cl-white.png";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/squadre", label: "Squadre", icon: Shield },
  { to: "/admin/giocatori", label: "Giocatori", icon: Users },
  { to: "/admin/import", label: "Import CSV", icon: Upload },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarCog },
  { to: "/admin/partita", label: "Gestione partita", icon: Gamepad2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const { session, isAdmin, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname.startsWith(to);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Caricamento…</div>;
  }
  if (!session) return <Navigate to="/admin/login" />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-black">Accesso negato</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Il tuo account non ha permessi admin.</p>
        <button onClick={() => signOut()} className="px-4 py-2 rounded-lg bg-secondary text-sm font-semibold">
          Esci
        </button>
      </div>
    );
  }

  const doSignOut = async () => {
    await signOut();
    toast.success("Disconnesso");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="hidden md:flex w-60 shrink-0 border-r bg-card flex-col">
        <div className="h-14 flex items-center px-4 border-b">
          <div className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-sm">A</div>
            <span className="tracking-tight">ADMIN · CL</span>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {items.map(i => {
            const Icon = i.icon;
            const active = isActive(i.to, i.exact);
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-3 pt-4 border-t flex items-center justify-center">
          <img src={clBlack} alt="Cave League" width={1000} height={1000} className="h-12 w-12 object-contain opacity-60 block dark:hidden" />
          <img src={clWhite} alt="Cave League" width={1000} height={1000} className="h-12 w-12 object-contain opacity-60 hidden dark:block" />
        </div>
        <div className="p-3 border-t space-y-1">
          <div className="px-3 py-1 text-[11px] text-muted-foreground truncate" title={session.user.email ?? ""}>
            {session.user.email}
          </div>
          <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
          <Link to="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Torna al pubblico
          </Link>
          <button onClick={doSignOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 border-b bg-card">
        <div className="h-14 px-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Pubblico
          </Link>
          <span className="font-bold text-sm">ADMIN · CL</span>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2 text-muted-foreground" aria-label="Tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={doSignOut} className="p-2 text-muted-foreground" aria-label="Esci">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide border-t">
          {items.map(i => {
            const active = isActive(i.to, i.exact);
            return (
              <Link key={i.to} to={i.to} className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
                {i.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl">
        {children}
        <BrandFooter compact />
      </main>
    </div>
  );
}
