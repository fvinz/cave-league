## Piano di migrazione Cave League → Lovable Cloud

Lovable Cloud è già abilitato. Lo stato attuale del DB è vuoto (nessuna tabella). Tutto lo stato vive ora in `src/lib/mockData.ts`. Procedo con un piano in 5 fasi, applicando modifiche minime al frontend e mantenendo lo shape dati esistente.

---

### Fase 1 — Schema SQL (1 migration)

Una sola migration idempotente che crea:

**Tabelle** (come da specifica)
- `teams (id, name unique, slug unique, created_at)`
- `players (id, team_id fk, full_name, role check in p/g/pres, jersey_number, active, created_at)`
- `matchdays (id, title, event_date, sort_order, created_at)`
- `stages (id, code unique, label, sort_order)` seedata con: regular / quarterfinal / semifinal / final / third_place
- `matches (id, matchday_id fk, stage_id fk, home_team_id fk, away_team_id fk, scheduled_at, venue, status check scheduled/live/finished/locked default scheduled, result_type check direct/shootout nullable, home_score int default 0, away_score int default 0, notes, created_at, CHECK home_team_id <> away_team_id)`
- `match_events (id, match_id fk on delete cascade, team_id fk, player_id fk, event_type check goal/double_goal/own_goal, event_order int, minute, created_at)`
- `admins (id, user_id uuid unique, email unique, role default 'admin', created_at)`

**Indici**: foreign key + `matches(scheduled_at)`, `matches(status)`, `match_events(match_id, event_order)`.

**Funzioni helper (SECURITY DEFINER)**
- `is_admin(uid uuid) returns boolean` — controlla presenza in `admins`. Usata da tutte le policy RLS. Evita ricorsione.
- `recalculate_match_score(match_id uuid)` — ricalcola `home_score`/`away_score` partendo da `match_events`, applicando regole: goal=+1 alla squadra, double_goal=+2, own_goal=+1 alla squadra opposta.
- `recalculate_all_matches()` — invoca la funzione precedente su tutti i match non `locked`. Esposta come endpoint "Ricalcola tutto".

**Trigger**
- `match_events` AFTER INSERT/UPDATE/DELETE → chiama `recalculate_match_score(match_id)` (salta se match `locked`).
- Trigger di validazione finale match: se `status='finished'` allora `result_type` deve essere NOT NULL e coerente con i punteggi (se pareggio → shootout obbligatorio).

**Viste pubbliche** (lette dal frontend)
- `v_standings` — classifica derivata: 3 pt vittoria diretta, 2 pt shootout win, 1 pt shootout loss, 0 sconfitta. Ordinata per pt, GD, GF, name.
- `v_top_scorers` — somma goal per player (esclude own_goal).
- `v_top_clean_sheets` — clean sheet ai portieri (`role='p'`) per ogni match della loro squadra dove l'avversario ha 0 gol.
- `v_player_stats` — presenze = numero match `finished/locked` della squadra del player, goal, autogoal, clean_sheet (solo per portieri).
- `v_team_aggregate` — W/D/L, GF, GS, GD per squadra.

Tutte le view con `security_invoker=on`.

---

### Fase 2 — RLS

Tutte le tabelle: `ENABLE ROW LEVEL SECURITY`.

**Pubblico (anon + authenticated): solo SELECT**
- `teams`, `players`, `matchdays`, `stages`, `matches`, `match_events`: policy `FOR SELECT TO anon, authenticated USING (true)`.
- `admins`: nessun SELECT pubblico (solo `is_admin(auth.uid())`).

**Admin: INSERT/UPDATE/DELETE su teams, players, matchdays, matches, match_events**
- Policy `USING (public.is_admin(auth.uid()))` + `WITH CHECK (public.is_admin(auth.uid()))`.
- Protezione extra su `match_events` e `matches`: trigger BEFORE UPDATE/DELETE che blocca con eccezione se `status='locked'` (a meno che la transizione sia esplicito unlock fatto da admin).

`stages` e `admins`: nessuna scrittura via API (gestite solo da migration/seed).

---

### Fase 3 — Auth admin

- Auth: email/password (no signup pubblico esposto in UI — solo `/admin/login`).
- L'utente admin `cave.lab2024@gmail.com` viene creato **manualmente** dal proprietario via dashboard Lovable Cloud (Users → Add user, con password). **Nessuna password nel codice.**
- Trigger `auth.users` AFTER INSERT → se `NEW.email = 'cave.lab2024@gmail.com'` inserisce automaticamente in `public.admins`. Idempotente.
- Email auto-confirm attivato per evitare flusso di verifica su singolo account dedicato.
- Route guard: tutte le `/admin/*` reindirizzano a `/admin/login` se non autenticato; se autenticato ma non admin → mostra "Accesso negato" e logout.

---

### Fase 4 — Integrazione frontend (modifiche minime)

**Strategia**: trasformo `src/lib/mockData.ts` in un layer di accesso dati che invoca Supabase via TanStack Query, **mantenendo gli stessi nomi e shape** delle funzioni (`computeStandings`, `getPlayerStats`, `getTeamAggregate`, `useStoreVersion`, ecc.). Le pagine pubbliche restano invariate.

- `src/lib/mockData.ts` viene rinominato concettualmente: tipi rimangono, le funzioni `compute*` ora leggono dalle view SQL via `supabase.from('v_...')`. `useStoreVersion` diventa wrapper su React Query refetch / realtime.
- Hooks nuovi in `src/lib/queries.ts`: `useTeams`, `usePlayers`, `useMatches`, `useStandings`, `useTopScorers`, `useTopCleanSheets`, `usePlayerStats`, `useTeamDetail`, `usePlayerDetail`, `useMatchesByDay`.
- Stati loading / empty / error gestiti nei componenti pagina con skeleton + messaggi.
- Pagine pubbliche toccate: `index.tsx`, `calendario.tsx`, `classifica.tsx`, `statistiche.tsx`, `squadre.index.tsx`, `squadre.$teamId.tsx`, `giocatori.$playerId.tsx` — solo sostituzione fonte dati, layout invariato.
- Realtime: abilitato solo su `matches` e `match_events` per la pagina admin live (`admin.partita.tsx`). Le pagine pubbliche usano refetch on focus + invalidazione query post-mutation admin.

**Admin**
- `src/routes/admin/login.tsx` (nuova, minimale): form email/password, redirect a `/admin`.
- Layout admin (`AdminShell`): guard via `useAuth` hook, link logout.
- `admin.calendario.tsx`: CRUD su `matches` e `matchdays` via mutation; placeholder testuali per knockout supportati tramite campo `notes` o team "TBD" (decisione: aggiungo team speciale `TBD` non rimovibile, o nullable home/away — propongo **nullable** per `home_team_id`/`away_team_id` per supportare slot vuoti, con check che diventano obbligatori prima del go-live del match).
- `admin.partita.tsx`: insert/delete su `match_events`, update `matches.status/result_type`. Trigger ricalcola i punteggi.
- `admin.import.tsx`: parsing CSV già fatto client-side → batch insert via Supabase con `upsert` su `teams.name` e `players.full_name + team_id`.
- Pulsante "Ricalcola tutto" → server fn che chiama RPC `recalculate_all_matches()`.

---

### Fase 5 — Verifica finale

1. Linter Supabase (security advisor) verde.
2. Test manuale: login admin → crea team via CSV → schedule match → eventi live → finished → vedere classifica aggiornata sul frontend pubblico in altra scheda.
3. Test anon: nessuna scrittura riuscita, lettura OK.
4. Test utente autenticato non-admin: nessuna scrittura riuscita.

---

### Domande prima di partire

1. **Account admin**: confermi che creerai manualmente l'utente `cave.lab2024@gmail.com` nella dashboard Cloud (Users → Add user) con la password scelta da te? Il trigger lo aggiungerà automaticamente in `admins`.
2. **Slot knockout vuoti**: ok rendere `home_team_id`/`away_team_id` **nullable** per supportare placeholder ("Vincente QF1") nei knockout prima dei team effettivi? In alternativa uso un team segnaposto `TBD` non eliminabile.
3. **Mock data esistenti**: dopo il go-live del DB vuoi che faccia un **seed iniziale** delle 12 squadre + roster + calendario regular dai mock attuali, oppure parti da zero e carichi tutto via CSV?

Appena confermi (o rispondi alle 3 domande), eseguo migration + integrazione frontend in un'unica passata.
