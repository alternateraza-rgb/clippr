-- =============================================================================
-- Clipmuse 006 — Whop billing
-- Safe to re-run
-- =============================================================================

-- Whop is the merchant of record; this table is a local mirror of what it told
-- us. Access is decided by reading this row, never by calling Whop on the
-- request path — a payment provider being slow must not make the app slow, and
-- an outage there must not lock out people who have already paid.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'none',
  whop_membership_id text,
  whop_plan_id text,
  whop_user_id text,
  -- Access survives to the end of a period already paid for, which is what the
  -- refund policy promises.
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
-- Whop's own status vocabulary, stored verbatim. Mapping it down to a
-- yes/no here would throw away the difference between "canceling but paid
-- until the 3rd" and "gone", which is exactly the difference the refund
-- policy turns on. Access is decided in code from status + period end.
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in (
    'none', 'trialing', 'active', 'past_due', 'completed',
    'canceled', 'canceling', 'expired', 'unresolved', 'drafted'
  ));

create index if not exists subscriptions_membership_idx
  on public.subscriptions (whop_membership_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Readable by its owner, writable by nobody but the webhook. A user who could
-- update this row could grant themselves the product.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

-- Webhook replay guard. Standard Webhooks redelivers on any non-2xx, and
-- payment events must not be applied twice.
create table if not exists public.whop_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.whop_events enable row level security;
grant select, insert on public.whop_events to service_role;
