import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { BrandFooter } from "@/components/BrandFooter";
import clBlack from "@/assets/logos/cl-black.png";
import clWhite from "@/assets/logos/cl-white.png";
import cavelabBlack from "@/assets/logos/cavelab-black.png";
import cavelabWhite from "@/assets/logos/cavelab-white.png";

// L'app ha una sola pagina (la home): niente più nav a più voci, né in
// testata né in basso su mobile.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: brand logos */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center" aria-label="Cave League, torna alla home del torneo">
              <img src={clBlack} alt="Cave League" width={1000} height={1000} className="h-14 w-14 md:h-12 md:w-12 object-contain block dark:hidden" />
              <img src={clWhite} alt="Cave League" width={1000} height={1000} className="h-14 w-14 md:h-12 md:w-12 object-contain hidden dark:block" />
            </Link>
            {/* Il logo Cave Lab riporta al sito dell'associazione: senza
                questo link il torneo è un vicolo cieco. */}
            <a href="/" className="flex items-center" aria-label="Vai al sito di Cave Lab">
              <img src={cavelabBlack} alt="Cave Lab" width={1000} height={1000} className="h-12 w-12 md:h-11 md:w-11 object-contain block dark:hidden" />
              <img src={cavelabWhite} alt="Cave Lab" width={1000} height={1000} className="h-12 w-12 md:h-11 md:w-11 object-contain hidden dark:block" />
            </a>
          </div>

          {/* Right: theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pb-8 pt-4">
        {children}
        <BrandFooter />
      </main>
    </div>
  );
}
