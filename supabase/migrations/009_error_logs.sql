create table if not exists error_logs (
  id bigint primary key generated always as identity,
  ts timestamptz not null default now(),
  msg text not null,
  fields jsonb
);

-- Only service role can write; no public reads
alter table error_logs enable row level security;
