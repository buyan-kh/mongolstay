-- Lock client UPDATE on intake_messages to the read_at column only.
--
-- The "client marks own messages read" RLS policy in 0002_auth.sql intends to
-- allow clients to update read_at on messages of their own intakes. RLS
-- cannot scope UPDATE to specific columns — column control is GRANT-level.
-- Supabase's default grants UPDATE on all columns to the `authenticated`
-- role, so a client could PATCH `body`, `direction`, `subject` on any
-- message on their own intake (including incoming attorney messages),
-- tampering with attorney-client correspondence.
--
-- This migration revokes the broad UPDATE and re-grants only on read_at.

revoke update on public.intake_messages from authenticated;
grant update (read_at) on public.intake_messages to authenticated;
