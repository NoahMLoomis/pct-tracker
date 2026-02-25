create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  email text not null,
  unsubscribe_token text not null unique,
  created_at timestamptz default now(),
  unique(user_id, email)
);

alter table subscriptions enable row level security;
