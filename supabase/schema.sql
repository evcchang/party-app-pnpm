-- Run this in Supabase SQL editor or via supabase CLI

create extension if not exists pgcrypto;

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score integer not null default 0
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references teams(id) on delete cascade,
  total_points integer not null default 0,
  created_at timestamptz default now()
);

-- Add a simple RPC to increment both player and team
create or replace function add_point(player_id uuid, team_id uuid)
returns void language plpgsql as $$
begin
  update players set total_points = total_points + 1 where id = player_id;
  update teams set score = score + 1 where id = team_id;
end;
$$;
