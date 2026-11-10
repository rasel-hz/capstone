-- Undoes 20261111090000_journey_feedback.sql. Run by hand only if that migration has to be undone.
-- WARNING: this deletes the saved journeys and challenge feedback. Copies remain on each user's device.
revoke update (journey, challenge_feedback) on public.profiles from authenticated;
alter table public.profiles drop column if exists challenge_feedback;
alter table public.profiles drop column if exists journey;
