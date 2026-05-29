import { Link } from "@tanstack/react-router";
import { Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "@/lib/theme";
import clBlack from "@/assets/logos/cl-black.png";
import clWhite from "@/assets/logos/cl-white.png";
import cavelabBlack from "@/assets/logos/cavelab-black.png";
import cavelabWhite from "@/assets/logos/cavelab-white.png";

interface BrandFooterProps {
  /** Tighter sizing for admin panels */
  compact?: boolean;
  /** Show theme toggle + admin link between logos on mobile */
  showMobileControls?: boolean;
}

export function BrandFooter({ compact = false, showMobileControls = false }: BrandFooterProps) {
  const { theme, toggle } = useTheme();
  const clSize = compact ? "h-16 w-16" : "h-28 w-28";
  const labSize = compact ? "h-12 w-12" : "h-20 w-20";

  return (
    <footer
      className={`border-t border-border/40 flex items-center justify-between gap-4 ${compact ? "mt-8 pt-4" : "mt-12 pt-6"}`}
    >
      {/* Cave League — main event brand */}
      <div className="shrink-0">
        <img
          src={clBlack}
          alt="Cave League"
          width={1000}
          height={1000}
          className={`${clSize} object-contain block dark:hidden`}
        />
        <img
          src={clWhite}
          alt="Cave League"
          width={1000}
          height={1000}
          className={`${clSize} object-contain hidden dark:block`}
        />
      </div>

      {/* Mobile-only: Light + Admin between logos */}
      {showMobileControls && (
        <div className="flex items-center gap-6 md:hidden">
          <button
            onClick={toggle}
            className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </button>
          <Link
            to="/admin"
            className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Admin"
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Admin</span>
          </Link>
        </div>
      )}

      {/* Cave Lab — organising association */}
      <div className="shrink-0">
        <img
          src={cavelabBlack}
          alt="Cave Lab"
          width={1000}
          height={1000}
          className={`${labSize} object-contain block dark:hidden`}
        />
        <img
          src={cavelabWhite}
          alt="Cave Lab"
          width={1000}
          height={1000}
          className={`${labSize} object-contain hidden dark:block`}
        />
      </div>
    </footer>
  );
}
