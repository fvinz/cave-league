import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import {
  matches, calendarEvents, useStoreVersion,
  type CalendarEvent,
} from "@/lib/mockData";
import { Calendar, Star, X } from "lucide-react";

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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
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

  // Minutes-from-midnight for chronological sort within a day.
  // Matches use the time embedded in their ISO date string.
  // Events use startTime "HH:MM" if present, otherwise go last (1440).
  const matchMinutes = useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach(m => {
      const d = new Date(m.date);
      map.set(m.id, d.getHours() * 60 + d.getMinutes());
    });
    return map;
  }, [matches.length]);

  function itemMinutes(item: DayItem): number {
    if (item.kind === "match") return matchMinutes.get(item.id) ?? 0;
    if (!item.event.startTime) return 24 * 60;
    const [h, m] = item.event.startTime.split(":").map(Number);
    return h * 60 + m;
  }

  // Group items by day, sorted chronologically within each day
  const grouped = useMemo<{ day: string; items: DayItem[] }[]>(() => {
    return days.map(d => {
      const items: DayItem[] = [];
      if (filter !== "events") {
        matches
          .filter(m => new Date(m.date).toDateString() === d)
          .forEach(m => items.push({ kind: "match", id: m.id }));
      }
      if (filter !== "matches") {
        calendarEvents
          .filter(e => new Date(e.date + "T00:00:00").toDateString() === d)
          .forEach(e => items.push({ kind: "event", event: e }));
      }
      items.sort((a, b) => itemMinutes(a) - itemMinutes(b));
      return { day: d, items };
    }).filter(g => g.items.length > 0);
  }, [days, filter, matchMinutes]);

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
                  : <EventCard key={item.event.id + idx} event={item.event} onClick={() => setSelectedEvent(item.event)} />
              )}
            </div>
          </section>
        );
      })}

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </AppShell>
  );
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-3 sm:p-4 flex items-start gap-3 hover:border-primary/40 transition-colors cursor-pointer"
    >
      {event.imageUrl ? (
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 mt-0.5 bg-secondary">
          <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
          <Star className="w-4 h-4 text-accent-foreground" />
        </div>
      )}
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
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{event.description}</p>
        )}
      </div>
    </button>
  );
}

function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const dateLabel = new Date(event.date + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border-t sm:border sm:rounded-xl shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {event.imageUrl && (
          <div className="aspect-video overflow-hidden sm:rounded-t-xl bg-secondary">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-black leading-tight">{event.title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="capitalize">{dateLabel}{event.startTime && <span> · ore {event.startTime}</span>}</span>
          </div>
          {event.description && (
            <p className="text-sm leading-relaxed">{event.description}</p>
          )}
        </div>
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
