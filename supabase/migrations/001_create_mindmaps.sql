create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mindmaps_user_id_idx on public.mindmaps(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mindmaps_set_updated_at on public.mindmaps;
create trigger mindmaps_set_updated_at
before update on public.mindmaps
for each row execute function public.set_updated_at();

alter table public.mindmaps enable row level security;

create policy "mindmaps_select_own"
on public.mindmaps
for select
using (auth.uid() = user_id);

create policy "mindmaps_insert_own"
on public.mindmaps
for insert
with check (auth.uid() = user_id);

create policy "mindmaps_update_own"
on public.mindmaps
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mindmaps_delete_own"
on public.mindmaps
for delete
using (auth.uid() = user_id);
