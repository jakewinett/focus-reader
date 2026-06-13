-- Subscription state mirrored from Stripe via webhook
create table if not exists subscriptions (
  user_id             text primary key,
  stripe_customer_id  text,
  stripe_sub_id       text,
  tier                text not null default 'free' check (tier in ('free','student','standard')),
  status              text not null default 'active',
  price_id            text,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Only the owning user can read their own subscription
alter table subscriptions enable row level security;

create policy "owner read" on subscriptions
  for select using (auth.uid()::text = user_id);

-- Service role (webhook) writes bypass RLS by default
