-- Couple Communication Toolbox PWA - Supabase schema
-- Run this in Supabase SQL Editor before deploying the web app.
-- Security model: the browser never talks to Supabase directly. It talks to Vercel Serverless API.
-- SUPABASE_SERVICE_ROLE_KEY must be stored only as a Vercel environment variable.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  room_code text primary key,
  pin_hash text not null,
  partner_a_name text not null default 'A',
  partner_b_name text not null default 'B',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(room_code) on delete cascade,
  title text not null,
  topic_type text not null default 'daily',
  status text not null default 'preparing',
  a_role text not null default 'A',
  b_role text not null default 'B',
  payload jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  rule_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_topics_room_updated on public.topics(room_code, updated_at desc);

create table if not exists public.monthly_questions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(room_code) on delete cascade,
  month_key text not null,
  proposer_role text not null check (proposer_role in ('A','B')),
  question_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_code, month_key, proposer_role)
);

create index if not exists idx_questions_room_month on public.monthly_questions(room_code, month_key);

create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.monthly_questions(id) on delete cascade,
  responder_role text not null check (responder_role in ('A','B')),
  answer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(question_id, responder_role)
);

create table if not exists public.question_comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.monthly_questions(id) on delete cascade,
  parent_id uuid references public.question_comments(id) on delete cascade,
  author_role text not null check (author_role in ('A','B')),
  comment_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_question_time on public.question_comments(question_id, created_at asc);

create table if not exists public.relationship_rules (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(room_code) on delete cascade,
  rule_text text not null,
  source_topic_id uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rules_room_time on public.relationship_rules(room_code, created_at desc);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

drop trigger if exists trg_topics_updated_at on public.topics;
create trigger trg_topics_updated_at
before update on public.topics
for each row execute function public.touch_updated_at();

drop trigger if exists trg_questions_updated_at on public.monthly_questions;
create trigger trg_questions_updated_at
before update on public.monthly_questions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_answers_updated_at on public.question_answers;
create trigger trg_answers_updated_at
before update on public.question_answers
for each row execute function public.touch_updated_at();

-- This project intentionally does not expose Supabase anon access from the frontend.
-- Keep RLS enabled/disabled according to your Supabase project policy. The serverless API uses service role.
-- Never paste SUPABASE_SERVICE_ROLE_KEY into frontend code.
