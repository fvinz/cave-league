import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, link, linkLabel = "Vedi tutto" }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between mb-3 mt-6 first:mt-0">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {link && (
        <Link to={link} className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
          {linkLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
