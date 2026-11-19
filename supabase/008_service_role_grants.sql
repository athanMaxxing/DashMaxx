-- =============================================================================
-- DashMaxx migration 008: table access for the server-side admin role
--
-- This project doesn't auto-grant table privileges, so Edge Functions using the
-- service role key (e.g. notify-online) couldn't read profiles / push_subscriptions /
-- squad_status. service_role only runs on Supabase's servers, never in the app.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- =============================================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Same for tables added later.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
