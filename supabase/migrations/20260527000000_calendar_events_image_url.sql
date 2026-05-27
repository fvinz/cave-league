-- Add optional image URL to calendar events
-- Uses a plain text column: admins paste an external URL.
-- No Storage bucket needed — no new policies required.

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS image_url text;
