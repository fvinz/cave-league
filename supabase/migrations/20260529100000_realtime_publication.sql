-- =========================================================
-- Enroll all tables used by the client-side realtime
-- subscription into the supabase_realtime publication.
--
-- Without this, Supabase never broadcasts postgres_changes
-- events for these tables and the live public view never
-- updates automatically.
--
-- The DO block is idempotent: it skips tables that are
-- already members and is a no-op when the publication is
-- FOR ALL TABLES.
-- =========================================================

DO $$
BEGIN
  -- If the publication covers all tables already, nothing to do.
  IF (SELECT puballtables FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;   EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;          EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.players;        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matchdays;      EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
