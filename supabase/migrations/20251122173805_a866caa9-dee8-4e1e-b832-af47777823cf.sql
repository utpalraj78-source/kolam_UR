-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

-- Create profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create trigger for new user profiles
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create kolams table to store generated kolam images
create table public.kolams (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  symmetry text not null,
  randomness_m integer not null,
  grid_size_k integer not null,
  seed integer not null,
  mod_value integer not null,
  bits_per_cell integer not null,
  min_hops integer not null,
  kolam_image text not null, -- base64 image
  pure_key text,
  csprng_key text,
  hybrid_key text,
  simulation_results jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.kolams enable row level security;

-- RLS policies for kolams
create policy "Users can view their own kolams"
  on public.kolams for select
  using (auth.uid() = user_id);

create policy "Users can insert their own kolams"
  on public.kolams for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own kolams"
  on public.kolams for update
  using (auth.uid() = user_id);

create policy "Users can delete their own kolams"
  on public.kolams for delete
  using (auth.uid() = user_id);