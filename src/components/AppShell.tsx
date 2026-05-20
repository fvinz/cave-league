import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Trophy, BarChart3, Users, Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "@/lib/theme";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calendario", label: "Calendario", icon: Calendar },
  { to: "/classifica", label: "Classifica", icon: Trophy },
  { to: "/statistiche", label: "Stats", icon: BarChart3 },
  { to: "/squadre", label: "Squadre", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isActive = (to: string) => to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm">CL</div>
            <span className="hidden sm:inline tracking-tight">CAVE LEAGUE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(n => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(n.to) ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/admin" className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" aria-label="Admin">
              <Shield className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pb-24 md:pb-8 pt-4">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md">
        <div className="grid grid-cols-5">
          {navItems.map(n => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
