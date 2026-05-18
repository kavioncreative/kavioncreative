create table if not exists public.user_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null default 'Untitled Note',
  content text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_notes enable row level security;

-- Create policies
create policy "Users can view their own notes"
  on public.user_notes for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own notes"
  on public.user_notes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own notes"
  on public.user_notes for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own notes"
  on public.user_notes for delete
  using ( auth.uid() = user_id );

-- Create updated_at trigger
create trigger handle_updated_at before update on public.user_notes
  for each row execute procedure moddatetime (updated_at);
