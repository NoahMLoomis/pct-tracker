-- Make Strava fields optional (email/password users won't have them)
alter table users alter column strava_athlete_id drop not null;
alter table users alter column strava_access_token drop not null;
alter table users alter column strava_refresh_token drop not null;

-- Add email/password auth fields
alter table users add column email text unique;
alter table users add column password_hash text;

-- Ensure every user has at least one auth method
alter table users add constraint users_auth_method_check
  check (strava_athlete_id is not null or email is not null);

-- Password reset tokens
create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
