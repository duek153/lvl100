-- ============================================================
-- LVL100 · Supabase setup (v1: accounts, sync, leaderboard, friends)
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar text not null default '🦊' check (char_length(avatar) <= 16),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per user with the app's state slices (mirrors the local "tables").
create table if not exists public.user_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profile jsonb,
  progress jsonb,
  vocab jsonb,
  attempts jsonb,
  achievements jsonb,
  settings jsonb,
  friends jsonb,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (
    octet_length(coalesce(progress::text, '') || coalesce(vocab::text, '') || coalesce(attempts::text, '')) < 3000000
  )
);

create table if not exists public.answers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 40),
  question_id text not null check (char_length(question_id) <= 60),
  type text not null,
  skill text not null check (skill in ('vocabulary', 'grammar', 'reading', 'restatement')),
  topic text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  correct boolean not null,
  user_answer smallint,
  correct_answer smallint not null,
  ms integer not null check (ms between 0 and 3600000),
  mode text not null,
  confidence text check (confidence in ('know', 'practice')),
  answered_at timestamptz not null,
  primary key (user_id, id)
);
create index if not exists answers_user_time on public.answers (user_id, answered_at desc);

-- XP per day drives the leaderboards.
create table if not exists public.daily_xp (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  xp integer not null default 0 check (xp between 0 and 5000),
  questions integer not null default 0 check (questions between 0 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Days can't be written far in the past or in the future.
create or replace function public.check_daily_xp_day() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.day > (now() at time zone 'Asia/Jerusalem')::date + 1
     or new.day < (now() at time zone 'Asia/Jerusalem')::date - 400 then
    raise exception 'day out of range';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists daily_xp_day on public.daily_xp;
create trigger daily_xp_day before insert or update on public.daily_xp
  for each row execute function public.check_daily_xp_day();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch before update on public.user_state for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.answers enable row level security;
alter table public.daily_xp enable row level security;
alter table public.friendships enable row level security;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  )
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or is_public or public.are_friends(id, auth.uid()));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_state_own on public.user_state;
create policy user_state_own on public.user_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists answers_own on public.answers;
create policy answers_own on public.answers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists daily_xp_own on public.daily_xp;
create policy daily_xp_own on public.daily_xp for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Friendships are read directly; all writes go through the functions below.
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

-- ---------- Grants (tables are not auto-exposed) ----------
revoke all on public.profiles, public.user_state, public.answers, public.daily_xp, public.friendships from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_state, public.answers, public.daily_xp to authenticated;
grant select on public.friendships to authenticated;

-- ---------- Functions (RPC) ----------
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from profiles where username = lower(p_username))
$$;

create or replace function public.period_start(p_period text) returns date
language sql stable set search_path = public as $$
  select case p_period
    when 'daily' then (now() at time zone 'Asia/Jerusalem')::date
    when 'weekly' then (now() at time zone 'Asia/Jerusalem')::date
      - extract(dow from (now() at time zone 'Asia/Jerusalem'))::int   -- week starts Sunday
    else date_trunc('month', now() at time zone 'Asia/Jerusalem')::date
  end
$$;

-- scope: 'global' (public profiles) or 'friends' (me + accepted friends)
create or replace function public.leaderboard(p_period text, p_scope text)
returns table (user_id uuid, username text, display_name text, avatar text, xp bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select p.* from profiles p
    where case when p_scope = 'friends'
      then p.id = auth.uid() or public.are_friends(p.id, auth.uid())
      else p.is_public or p.id = auth.uid() end
  )
  select pe.id, pe.username, pe.display_name, pe.avatar,
         coalesce(sum(d.xp), 0)::bigint as xp, pe.id = auth.uid()
  from people pe
  left join daily_xp d on d.user_id = pe.id and d.day >= public.period_start(p_period)
  group by pe.id, pe.username, pe.display_name, pe.avatar
  order by xp desc, pe.username
  limit 50
$$;

create or replace function public.search_profiles(p_query text)
returns table (id uuid, username text, display_name text, avatar text, relation text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar,
    coalesce((
      select case
        when f.status = 'accepted' then 'friend'
        when f.requester = auth.uid() then 'sent'
        else 'received' end
      from friendships f
      where (f.requester = auth.uid() and f.addressee = p.id) or (f.requester = p.id and f.addressee = auth.uid())
      limit 1
    ), 'none')
  from profiles p
  where p.id <> auth.uid()
    and char_length(p_query) >= 2
    and ((p.is_public and (p.username like lower(p_query) || '%' or p.display_name ilike p_query || '%'))
         or p.username = lower(p_query))
  order by p.username
  limit 10
$$;

create or replace function public.my_friends()
returns table (id uuid, username text, display_name text, avatar text, status text, incoming boolean, week_xp bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, f.status, f.addressee = auth.uid(),
    (select coalesce(sum(d.xp), 0) from daily_xp d where d.user_id = p.id and d.day >= public.period_start('weekly'))::bigint
  from friendships f
  join profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.requester = auth.uid() or f.addressee = auth.uid()
  order by f.status, p.username
$$;

create or replace function public.send_friend_request(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into target from profiles where username = lower(p_username);
  if target is null then return 'not_found'; end if;
  if target = me then return 'self'; end if;
  if exists (select 1 from friendships where status = 'accepted'
             and ((requester = me and addressee = target) or (requester = target and addressee = me))) then
    return 'already_friends';
  end if;
  -- they already asked me → accept
  if exists (select 1 from friendships where requester = target and addressee = me) then
    update friendships set status = 'accepted' where requester = target and addressee = me;
    return 'accepted';
  end if;
  insert into friendships (requester, addressee) values (me, target) on conflict do nothing;
  return 'sent';
end $$;

create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update friendships set status = 'accepted' where requester = p_requester and addressee = auth.uid();
  else
    delete from friendships where requester = p_requester and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

create or replace function public.remove_friend(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
  where (requester = auth.uid() and addressee = p_other) or (requester = p_other and addressee = auth.uid());
end $$;

revoke execute on function public.username_available(text), public.leaderboard(text, text), public.search_profiles(text),
  public.my_friends(), public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid), public.are_friends(uuid, uuid), public.period_start(text) from public, anon;
grant execute on function public.username_available(text), public.leaderboard(text, text), public.search_profiles(text),
  public.my_friends(), public.send_friend_request(text), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid), public.are_friends(uuid, uuid), public.period_start(text) to authenticated;
