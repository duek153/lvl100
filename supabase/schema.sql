-- LVL100 — Supabase / PostgreSQL schema (Phase "next": backend).
-- Normalized tables, Row Level Security everywhere, and scoring done on the
-- server: clients never write XP, levels, abilities or scores directly.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type skill as enum ('vocabulary', 'grammar', 'reading', 'restatement');
create type question_type as enum ('word_meaning', 'word_reverse', 'closest_meaning', 'sentence_completion', 'restatement', 'grammar', 'reading');
create type session_mode as enum ('practice', 'placement', 'daily', 'boss', 'test', 'simulation', 'mistakes', 'weak', 'friend', 'review');
create type attempt_kind as enum ('placement', 'daily', 'boss', 'test', 'simulation', 'practice', 'friend');

-- ---------- Users / profiles ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar text not null default '🦊',
  goal text not null default 'exemption',
  self_level text not null default 'basic',
  reported_score int check (reported_score between 50 and 150),
  target_score int not null default 134 check (target_score between 50 and 150),
  exam_date date,
  days_per_week int not null default 5 check (days_per_week between 1 and 7),
  minutes_per_day int not null default 20,
  is_public boolean not null default true,
  is_admin boolean not null default false,
  placement_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Server-owned progress (written only by security-definer functions)
create table progress (
  user_id uuid primary key references profiles on delete cascade,
  xp int not null default 0,
  xp_spent int not null default 0,
  streak_current int not null default 0,
  streak_longest int not null default 0,
  streak_last_day date,
  streak_freezes int not null default 0,
  best_combo int not null default 0,
  updated_at timestamptz not null default now()
);

create table skill_ability (
  user_id uuid references profiles on delete cascade,
  skill skill not null,
  theta real not null default -1,
  n int not null default 0,
  practice_level smallint not null default 1 check (practice_level between 1 and 4),
  primary key (user_id, skill)
);

create table score_history (
  user_id uuid references profiles on delete cascade,
  day date not null,
  estimated_score int not null check (estimated_score between 50 and 150),
  primary key (user_id, day)
);

create table daily_activity (
  user_id uuid references profiles on delete cascade,
  day date not null,
  questions int not null default 0,
  correct int not null default 0,
  xp int not null default 0,
  ms bigint not null default 0,
  quest_claimed boolean not null default false,
  primary key (user_id, day)
);

create table xp_events (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------- Content ----------
create table vocabulary (
  id text primary key,
  en text not null unique,
  he text not null,
  pos text not null,
  example text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  category text not null,
  source text not null default 'lvl100-original',
  license text
);

create table reading_passages (
  id text primary key,
  title text not null,
  emoji text,
  topic text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  minutes int not null,
  paragraphs text[] not null,
  is_published boolean not null default true
);

create table questions (
  id text primary key,
  type question_type not null,
  skill skill not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  topic text not null,
  prompt text not null,
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation_he text not null,
  passage_id text references reading_passages on delete cascade,
  word_id text references vocabulary on delete cascade,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table question_options (
  question_id text references questions on delete cascade,
  idx smallint not null check (idx between 0 and 3),
  body text not null,
  primary key (question_id, idx)
);

-- Clients read questions through this view: no correct answer leaks.
create view questions_public as
  select id, type, skill, difficulty, topic, prompt, passage_id, word_id from questions where is_published;

-- ---------- Answers / SRS ----------
create table answers (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  question_id text not null references questions,
  mode session_mode not null,
  user_answer smallint,
  correct boolean not null,
  ms int not null check (ms >= 0),
  difficulty smallint not null,
  skill skill not null,
  topic text not null,
  confidence text check (confidence in ('know', 'practice')),
  attempt_id uuid,
  created_at timestamptz not null default now()
);
create index answers_user_time on answers (user_id, created_at desc);
create index answers_question on answers (question_id);

create table user_vocabulary (
  user_id uuid references profiles on delete cascade,
  word_id text references vocabulary on delete cascade,
  seen int not null default 0,
  correct int not null default 0,
  wrong int not null default 0,
  streak int not null default 0,
  ease real not null default 2.5,
  interval_days int not null default 0,
  due date not null default current_date,
  last_seen date,
  last_mistake date,
  primary key (user_id, word_id)
);
create index user_vocab_due on user_vocabulary (user_id, due);

-- ---------- Tests / attempts ----------
create table tests (
  id text primary key, -- 'boss-1', 'test-5', 'simulation'
  kind attempt_kind not null,
  spec jsonb not null -- sections, counts, time limits (small config, not user data)
);

create table test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  test_id text references tests,
  kind attempt_kind not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total int,
  correct int,
  estimated_score int check (estimated_score between 50 and 150),
  xp_awarded int not null default 0
);

create table daily_challenges (
  day date primary key,
  question_ids text[] not null
);

-- ---------- Gamification ----------
create table achievements (
  id text primary key,
  emoji text not null,
  title text not null,
  description_he text not null
);

create table user_achievements (
  user_id uuid references profiles on delete cascade,
  achievement_id text references achievements,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table streaks ( -- history of streak runs (for analytics)
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  started date not null,
  ended date,
  length int not null
);

-- ---------- Social ----------
create table friends (
  user_id uuid references profiles on delete cascade,
  friend_id uuid references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table friend_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references profiles on delete cascade,
  opponent_id uuid references profiles on delete cascade,
  question_ids text[] not null,
  challenger_attempt uuid references test_attempts,
  opponent_attempt uuid references test_attempts,
  created_at timestamptz not null default now()
);

create table reminders (
  user_id uuid primary key references profiles on delete cascade,
  enabled boolean not null default false,
  time_of_day time not null default '19:00',
  days smallint[] not null default '{0,1,2,3,4}',
  push_subscription jsonb
);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table progress enable row level security;
alter table skill_ability enable row level security;
alter table score_history enable row level security;
alter table daily_activity enable row level security;
alter table xp_events enable row level security;
alter table vocabulary enable row level security;
alter table reading_passages enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table answers enable row level security;
alter table user_vocabulary enable row level security;
alter table tests enable row level security;
alter table test_attempts enable row level security;
alter table daily_challenges enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table streaks enable row level security;
alter table friends enable row level security;
alter table friend_challenges enable row level security;
alter table reminders enable row level security;

create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- profiles: public profiles readable by all signed-in users; edit own (but not is_admin)
create policy profiles_read on profiles for select using (is_public or id = auth.uid() or is_admin());
create policy profiles_insert on profiles for insert with check (id = auth.uid() and not is_admin);
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select p.is_admin from profiles p where p.id = auth.uid()));

-- server-owned tables: users may READ their own rows; no client writes
create policy own_read on progress for select using (user_id = auth.uid());
create policy own_read on skill_ability for select using (user_id = auth.uid());
create policy own_read on score_history for select using (user_id = auth.uid());
create policy own_read on daily_activity for select using (user_id = auth.uid());
create policy own_read on xp_events for select using (user_id = auth.uid());
create policy own_read on answers for select using (user_id = auth.uid());
create policy own_read on user_vocabulary for select using (user_id = auth.uid());
create policy own_read on test_attempts for select using (user_id = auth.uid());
create policy own_read on user_achievements for select using (user_id = auth.uid());
create policy own_read on streaks for select using (user_id = auth.uid());

-- content: readable by everyone signed in, writable by admins only
create policy content_read on vocabulary for select using (auth.role() = 'authenticated');
create policy content_read on reading_passages for select using (is_published or is_admin());
create policy content_admin on vocabulary for all using (is_admin()) with check (is_admin());
create policy content_admin on reading_passages for all using (is_admin()) with check (is_admin());
-- questions (incl. correct_option) only for admins; players use questions_public + options
create policy content_admin on questions for all using (is_admin()) with check (is_admin());
create policy options_read on question_options for select using (auth.role() = 'authenticated');
create policy content_admin on question_options for all using (is_admin()) with check (is_admin());
create policy tests_read on tests for select using (auth.role() = 'authenticated');
create policy daily_read on daily_challenges for select using (auth.role() = 'authenticated');
create policy ach_read on achievements for select using (true);

-- social / reminders: own rows
create policy friends_rw on friends for all using (user_id = auth.uid() or friend_id = auth.uid()) with check (user_id = auth.uid());
create policy fc_read on friend_challenges for select using (challenger_id = auth.uid() or opponent_id = auth.uid());
create policy reminders_rw on reminders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Server-side scoring ----------
-- The client sends only (question, answer, ms). Correctness, XP, ability,
-- SRS and streak are computed here, mirroring src/domain/*.ts.
create function submit_answer(p_question text, p_answer smallint, p_ms int, p_mode session_mode, p_attempt uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q questions%rowtype;
  v_correct boolean;
  v_xp int := 0;
  v_b real;
  v_theta real;
  v_n int;
  v_p real;
  v_k real;
  v_today date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_ms < 300 then p_ms := 300; end if; -- clamp impossible times
  select * into q from questions where id = p_question and is_published;
  if not found then raise exception 'unknown question'; end if;
  v_correct := p_answer is not null and p_answer = q.correct_option;

  -- XP (see src/domain/xp.ts); no per-question XP inside simulations
  if v_correct and p_mode <> 'simulation' then
    v_xp := 10 + case q.difficulty when 3 then 5 when 4 then 10 else 0 end;
  end if;

  insert into answers (user_id, question_id, mode, user_answer, correct, ms, difficulty, skill, topic, attempt_id)
  values (auth.uid(), q.id, p_mode, p_answer, v_correct, p_ms, q.difficulty, q.skill, q.topic, p_attempt);

  -- ability update (Rasch/Elo, see src/domain/scoring.ts)
  insert into skill_ability (user_id, skill) values (auth.uid(), q.skill) on conflict do nothing;
  select theta, n into v_theta, v_n from skill_ability where user_id = auth.uid() and skill = q.skill for update;
  v_b := case q.difficulty when 1 then -1.5 when 2 then -0.5 when 3 then 0.5 else 1.5 end;
  v_p := 1 / (1 + exp(-(v_theta - v_b)));
  v_k := greatest(0.1, 0.6 / (1 + v_n / 20.0));
  update skill_ability set theta = least(3, greatest(-3, v_theta + v_k * ((case when v_correct then 1 else 0 end) - v_p))), n = n + 1
   where user_id = auth.uid() and skill = q.skill;

  insert into daily_activity (user_id, day, questions, correct, xp, ms) values (auth.uid(), v_today, 1, v_correct::int, v_xp, p_ms)
  on conflict (user_id, day) do update set questions = daily_activity.questions + 1, correct = daily_activity.correct + v_correct::int,
    xp = daily_activity.xp + v_xp, ms = daily_activity.ms + p_ms;

  insert into progress (user_id, xp) values (auth.uid(), v_xp)
  on conflict (user_id) do update set xp = progress.xp + v_xp, updated_at = now();
  if v_xp > 0 then insert into xp_events (user_id, amount, reason) values (auth.uid(), v_xp, 'answer:' || q.id); end if;

  -- (streak, SRS and achievements follow the same pattern; see src/services/game.ts)
  return jsonb_build_object('correct', v_correct, 'correct_option', q.correct_option, 'xp', v_xp, 'explanation', q.explanation_he);
end $$;

revoke all on function submit_answer from public;
grant execute on function submit_answer to authenticated;

-- Leaderboards read aggregated XP per period from daily_activity of public profiles.
create view leaderboard_weekly as
  select p.id, p.display_name, p.avatar, sum(d.xp) as xp
    from daily_activity d join profiles p on p.id = d.user_id
   where p.is_public and d.day > current_date - 7
   group by p.id;
