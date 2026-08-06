-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strava_athlete_id bigint UNIQUE,
  display_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  hike_start_date date NOT NULL,
  hike_end_date date,
  lighterpack_url text,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  direction text NOT NULL DEFAULT 'NOBO'::text,
  email text UNIQUE,
  password_hash text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  strava_id bigint NOT NULL,
  name text,
  start_date timestamp with time zone NOT NULL,
  distance_m double precision NOT NULL DEFAULT 0,
  moving_time_s integer NOT NULL DEFAULT 0,
  activity_type text,
  elevation_gain_m double precision NOT NULL DEFAULT 0,
  profile_dist_m jsonb,
  profile_elev_m jsonb,
  coordinates jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sync_state (
  user_id uuid NOT NULL,
  last_sync_at timestamp with time zone,
  status text DEFAULT 'idle'::text,
  error_message text,
  CONSTRAINT sync_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT sync_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.activity_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  strava_id bigint NOT NULL,
  name text,
  start_date timestamp with time zone NOT NULL,
  distance_m double precision NOT NULL DEFAULT 0,
  moving_time_s integer NOT NULL DEFAULT 0,
  elevation_gain_m double precision NOT NULL DEFAULT 0,
  activity_type text,
  CONSTRAINT activity_stats_pkey PRIMARY KEY (id),
  CONSTRAINT activity_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.latest_position (
  user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  activity_date timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT latest_position_pkey PRIMARY KEY (user_id),
  CONSTRAINT latest_position_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.trail_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  lat double precision,
  lon double precision,
  created_at timestamp with time zone DEFAULT now(),
  photo_url text,
  CONSTRAINT trail_updates_pkey PRIMARY KEY (id),
  CONSTRAINT trail_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  unsubscribe_token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  level text NOT NULL,
  msg text NOT NULL,
  fields jsonb,
  CONSTRAINT logs_pkey PRIMARY KEY (id)
);
