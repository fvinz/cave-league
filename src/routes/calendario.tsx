import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import {
  matches, calendarEvents, useStoreVersion,
  type CalendarEvent,
} from "@/lib/mockData";
import { Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  component: CalendarioPage,
  head: () => ({ meta: [{ title: "Calendario — Cave League" }] }),
});

type FilterKind = "all" | "matches" | "events";

// A unified day item: either a match or a calendar event
type DayItem =
  | { kind: "match"; id: string }
  | { kind: "event"; event: CalendarEvent };

function CalendarioPage() {
  useStoreVersion();
  const [filter, setFilter] = useState<FilterKind>("all");
  const todayRef = useRef<HTMLElement | null>(null);
  const scrolled  = useRef(false);

  const today = new Date().toDateString();

  // Build sorted list of unique dates across both sources
  const days = useMemo(() => {
    const set = new Set<string>();
    if (filter !== "events") matches.forEach(m => set.add(new Date(m.date).toDateString()));
    if (filter !== "matches") calendarEvents.forEach(e => set.add(new Date(e.date + "T00:00:00").toDateString()));
    return [...set].sort((a, b) => +new Date(a) - +new Date(b));
  }, [filter, matches.length, calendarEvents.length]);

  // Group items by day
  const grouped = useMemo<{ day: string; items: DayItem[] }[]>(() => {
    return days.map(d => {
      const items: DayItem[] = [];
      if (filter !== "events") {
        matches
          .filter(m => new Date(m.date).toDateString() === d)
          .sort((a, b) => +new Date(a.date) - +new Date(b.date))
          .forEach(m => items.push({ kind: "match", id: m.id }));
      }
      if (filter !== "matches") {
        calendarEvents
          .filter(e => new Date(e.date + "T00:00:00").toDateString() === d)
          .forEach(e => items.push({ kind: "event", event: e }));
      }
      return { day: d, items };
    }).filter(g => g.items.length > 0);
  }, [days, filter]);

  // Scroll to today on first render
  useEffect(() => {
    if (scrolled.current || !todayRef.current) return;
    scrolled.current = true;
    todayRef.current.scrollIntoView({ behavior: "instant", block: "start" });
  }, [grouped]);

  return (
    <AppShell>
      <h1 className="text-2xl font-black mb-1">Calendario</h1>
      <p className="text-sm text-muted-foreground mb-4">
        5 — 14 giugno 2026 · Regular season + fase a eliminazione
      </p>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        <Chip active={filter === "all"}     onClick={() => setFilter("all")}>Tutto</Chip>
        <Chip active={filter === "matches"} onClick={() => setFilter("matches")}>Solo partite</Chip>
        <Chip active={filter === "events"}  onClick={() => setFilter("events")}>Solo eventi</Chip>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Nessun elemento trovato.</div>
      ) : grouped.map(g => {
        const date    = new Date(g.day);
        const isToday = g.day === today;
        const label   = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
        return (
          <section
            key={g.day}
            ref={isToday ? el => { todayRef.current = el; } : undefined}
            className="mb-6 scroll-mt-4"
          >
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span className="capitalize">{label}</span>
              {isToday && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">OGGI</span>
              )}
            </h2>
            <div className="grid gap-2">
              {g.items.map((item, idx) =>
                item.kind === "match"
                  ? <MatchCard key={item.id} match={matches.find(m => m.id === item.id)!} />
                  : <EventCard key={item.event.id + idx} event={item.event} />
              )}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 flex items-start gap-3 hover:border-primary/40 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
        <Star className="w-4 h-4 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm">{event.title}</div>
          {event.startTime && (
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{event.startTime}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
      }`}
    >
      {children}
    </button>
  );
}
