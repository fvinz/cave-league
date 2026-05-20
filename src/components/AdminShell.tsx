import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Upload, CalendarCog, Gamepad2, ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/import", label: "Import CSV", icon: Upload },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarCog },
  { to: "/admin/partita", label: "Gestione partita", icon: Gamepad2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
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
        <div className="p-3 border-t space-y-1">
          <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
          <Link to="/" className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Torna al pubblico
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 border-b bg-card">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Pubblico
          </Link>
          <span className="font-bold">ADMIN · CL</span>
          <button onClick={toggle} className="p-2 text-muted-foreground">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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

      <main className="flex-1 p-4 md:p-8 max-w-5xl">{children}</main>
    </div>
  );
}
