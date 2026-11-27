-- IntelliSpeak initial schema
-- Tables: profiles, sessions, analysis_results, feedback
-- Row-Level Security is enabled on every table. Users can only reach their
-- own rows. Analysis results and feedback are written by the backend with the
-- service role key (which bypasses RLS) and are read-only for users.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (Module 1, mockup M14)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null default '',
  email               text,
  role                text,                       -- "role or field", FR14.2
  institution         text,
  skill_level         text not null default 'beginner'
                        check (skill_level in ('beginner', 'intermediate', 'advanced')),
  -- FR14.4: feedback categories to prioritise (several can be selected)
  presentation_goals  text[] not null default '{}'
                        check (presentation_goals <@ array[
                          'speech_delivery', 'body_language', 'content_clarity',
                          'audience_engagement', 'pacing_and_pauses'
                        ]::text[]),
  concise_cues        boolean not null default true,   -- FR14.5, on by default
  practice_reminders  boolean not null default false,  -- FR14.6, off by default
  alert_pace          boolean not null default false,  -- FR14.7
  alert_filler_words  boolean not null default false,  -- FR14.7
  alert_pauses        boolean not null default false,  -- FR14.7
  -- FE-9 / UI-12.1: post-session cooldown, default 12 hours, user-configurable
  cooldown_minutes    integer not null default 720
                        check (cooldown_minutes between 15 and 1440),
  -- Set by the backend when a practice session ends. Users cannot write it,
  -- so the cooldown cannot be skipped (UI-12.1). Based on the server clock.
  cooldown_until      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.profiles.cooldown_minutes is
  'Preferred post-session cooldown length in minutes (15 to 1440, default 720 = 12 h).';
comment on column public.profiles.cooldown_until is
  'When the current cooldown ends. Written by the backend only.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync once a user confirms an email change.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- sessions (practice sessions, recordings and uploads)
-- ---------------------------------------------------------------------------

create table public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  title              text not null default 'Untitled session',
  session_type       text not null
                       check (session_type in ('ai_practice', 'recording', 'upload')),
  status             text not null default 'pending'
                       check (status in ('pending', 'recording', 'processing',
                                         'partial_results', 'report_ready', 'failed')),
  recording_consent  boolean not null default false,
  video_url          text,      -- Cloudinary secure URL or public id
  slides_url         text,
  script_text        text,
  started_at         timestamptz,
  ended_at           timestamptz,
  duration_seconds   integer check (duration_seconds is null or duration_seconds >= 0),
  overall_score      numeric(5, 2) check (overall_score is null or overall_score between 0 and 100),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index sessions_user_created_idx on public.sessions (user_id, created_at desc);

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- analysis_results (one row per analysis module per session)
-- ---------------------------------------------------------------------------

create table public.analysis_results (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  module        text not null
                  check (module in ('speech', 'body_language', 'facial', 'content', 'overall')),
  status        text not null default 'processing'
                  check (status in ('processing', 'completed', 'failed')),
  score         numeric(5, 2) check (score is null or score between 0 and 100),
  metrics       jsonb not null default '{}'::jsonb,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (session_id, module)
);

create index analysis_results_user_idx on public.analysis_results (user_id, created_at desc);

create trigger analysis_results_set_updated_at
  before update on public.analysis_results
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- feedback (personalised feedback items and recommendations, Module 9)
-- ---------------------------------------------------------------------------

create table public.feedback (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.sessions (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  category           text not null
                       check (category in ('speech_delivery', 'body_language', 'content_clarity',
                                           'audience_engagement', 'pacing_and_pauses', 'general')),
  severity           text not null default 'info'
                       check (severity in ('info', 'suggestion', 'warning')),
  message            text not null,
  recommendation     text,
  timestamp_seconds  numeric(10, 2),   -- moment in the recording, if any
  animation_key      text,             -- links to a gesture/posture animation
  created_at         timestamptz not null default now()
);

create index feedback_session_idx on public.feedback (session_id);
create index feedback_user_idx on public.feedback (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.sessions         enable row level security;
alter table public.analysis_results enable row level security;
alter table public.feedback         enable row level security;

-- profiles: read and update your own row only. Rows are created by the trigger.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level guard: users may edit preferences but not id, email or cooldown_until.
revoke update on public.profiles from authenticated, anon;
grant update (
  full_name, role, institution, skill_level, presentation_goals,
  concise_cues, practice_reminders, alert_pace, alert_filler_words, alert_pauses,
  cooldown_minutes
) on public.profiles to authenticated;

-- sessions: users can list, create, rename and delete their own sessions.
-- Status, scores and media URLs are set by the backend.
create policy "sessions_select_own" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "sessions_insert_own" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "sessions_update_own" on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "sessions_delete_own" on public.sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke insert, update on public.sessions from authenticated, anon;
grant insert (user_id, title, session_type, recording_consent, script_text)
  on public.sessions to authenticated;
grant update (title) on public.sessions to authenticated;

-- analysis_results and feedback: read-only for the owner.
create policy "analysis_results_select_own" on public.analysis_results
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "feedback_select_own" on public.feedback
  for select to authenticated using ((select auth.uid()) = user_id);
